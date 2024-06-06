import express, { Application, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import pdf from 'pdf-parse';
import elasticlunr, { Index, SearchResults } from 'elasticlunr';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Middleware pour permettre à Express d'analyser les corps de requête au format JSON
app.use(express.json());

// Middleware pour servir les fichiers statiques du client
app.use(express.static(path.join(__dirname, '../../client/build')));

/**
 * Types et Interfaces
 */
interface Document {
  id: string;
  title: string;
  body: string;
  lines: string[];
}

interface SearchResultWithLines {
  ref: string;
  score: number;
  matchingLines: string[];
}

interface SearchRequest {
  searchText: string;
}

interface SuccessResponsePayload {
  results: SearchResultWithLines[];
}

interface ErrorResponsePayload {
  error: string;
  details?: string;
}

/**
 * Configuration de l'index de recherche
 */
const index = elasticlunr<Document>(function(this: Index<Document>) {
  this.setRef('id');
  this.addField('title');
  this.addField('body');
  this.addField('lines');
});

/**
 * Fonction pour effectuer la recherche et traiter les résultats
 * @param searchText - Le texte à rechercher
 * @returns Un tableau des résultats de recherche avec les lignes correspondantes
 */
const performSearch = (searchText: string): SearchResultWithLines[] => {
  const results = index.search(searchText, {
    fields: {
      body: { boost: 2 },
      lines: { boost: 3 }
    }
  });

  return results.reduce((resultsWithMatchingLines: SearchResultWithLines[], r: SearchResults) => {
    const doc = index.documentStore.getDoc(r.ref) as Document;
    const matchingLines = doc.lines.filter(line => line.includes(searchText));
    if (matchingLines.length > 0) resultsWithMatchingLines.push({ ref: r.ref, score: r.score, matchingLines });
    return resultsWithMatchingLines;
  }, []);
};

/**
 * Fonction pour gérer les erreurs
 * @param userFacingMessage - Le message d'erreur à afficher à l'utilisateur
 * @param error - L'erreur réelle à loguer (optionnel)
 * @param responseInfo - Un tuple contenant l'objet réponse de Express et le code d'état HTTP (optionnel)
 */
const handleError = (
  userFacingMessage: string, 
  error?: Error | string, 
  responseInfo: [Response?, number?] = []
): void => {
  console.error('Erreur :', userFacingMessage);

  // Loguer les détails de l'erreur en fonction de l'environnement et de l'erreur
  const errorDetails = error instanceof Error 
    ? (isDevelopment && error.stack ? error.stack : error.message)
    : error;
  
  if (errorDetails) {
    console.error('Détails :', errorDetails);
  }

  // Envoyer la réponse, si l'objet réponse est défini
  const [res, statusCode = 500] = responseInfo;
  if (res) {
    // Initialiser le payload de la réponse
    let responsePayload: ErrorResponsePayload = { error: userFacingMessage };
    // Mettre à jour le payload en fonction de l'environnement et de l'erreur
    if (errorDetails) responsePayload.details = errorDetails;
    
    res.status(statusCode).json(responsePayload);
  }
};

/**
 * Chargement et indexation des PDF
 */
let pdfsLoaded = false;

const loadPDFs = async (): Promise<void> => {
  const directoryPath = path.join(__dirname, 'public/search');
  const files = fs.readdirSync(directoryPath);
  const extname = ".pdf";

  // Traiter chaque fichier PDF
  const pdfPromises: Promise<void>[] = files.map(file => {
    if (path.extname(file) === extname) {
      const filePath = path.join(directoryPath, file);
      const dataBuffer = fs.readFileSync(filePath);

      // Extraire le texte et ajouter à l'index
      return pdf(dataBuffer).then(data => {
        const lines: string[] = data.text.split('\n').filter(line => line.trim() !== '');
        const doc: Document = {
          id: file,
          title: path.basename(file, extname),
          body: data.text,
          lines: lines,
        };
        index.addDoc(doc);
      }).catch(error => {
        handleError(`Une erreur est survenue lors du traitement du fichier ${file}.`, error);
      });
    }
    return Promise.resolve();
  });

  // Attendre que toutes les Promises soient résolues
  await Promise.all(pdfPromises);
  pdfsLoaded = true;
};

// Charger les PDF au démarrage du serveur après un délai hardcodé de 7 secondes (pour tester le cas où aucun PDF n'aurait encore été indexé)
setTimeout(loadPDFs, 7000);

// Endpoint API de recherche
app.post('/api/search', (req: Request<{}, {}, SearchRequest>, res: Response<SuccessResponsePayload | ErrorResponsePayload>) => {
  const { searchText } = req.body;

  if (!pdfsLoaded) {
    // Retourner une erreur immédiatement si les PDF ne sont pas chargés
    handleError('Les PDF ne sont pas encore chargés.', undefined, [res, 503]);
    return;
  }

  Promise.resolve(performSearch(searchText))
    .then(results => {
      const successPayload: SuccessResponsePayload = { results };
      res.json(successPayload);
    })
    .catch(error => handleError('Une erreur est survenue lors de la recherche', error, [res]));
});

// Servir les fichiers statiques et renvoyer index.html pour toutes les autres requêtes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Le serveur fonctionne sur http://localhost:${PORT}`);
});

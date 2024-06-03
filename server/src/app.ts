import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour permettre à Express d'analyser les corps de requête au format JSON
app.use(express.json());

// Middleware pour servir les fichiers statiques du client
app.use(express.static(path.join(__dirname, '../../client/build')));

// Endpoint API de recherche
app.post('/api/search', async (req, res) => {
  const { searchText } = req.body;
  // Remplacer cette partie par l'appel à l'API OpenAI
  const result = `Résultat fictif pour la recherche: ${searchText}`;
  res.json({ result });
});

// Pour toutes les autres requêtes, renvoyer le fichier index.html du client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

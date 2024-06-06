import React, { FC, useState } from 'react';
import { TextField, Button, Container, Typography } from '@mui/material';

/**
 * Types et Interfaces
 */
interface SearchResultWithLines {
  matchingLines: string[];
}

interface SearchResponse {
  results: SearchResultWithLines[];
}

const App: FC = () => {
  // État local du composant
  const [searchText, setSearchText] = useState<string>('');
  const [results, setResults] = useState<SearchResultWithLines[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mettre à jour les résultats et réinitialiser les erreurs
  const handleResults = (results: SearchResultWithLines[]): void => {
    setResults(results);
    setError(null);
  };

  // Mettre à jour l'erreur et réinitialiser les résultats
  const handleError = (error: Error | string): void => {
    setError(error instanceof Error ? error.message : error);
    setResults(null);
  };

  // Événement pour le changement de la valeur du champ de recherche
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Événement pour la soumission du formulaire
  const handleSubmit = async (): Promise<void> => {
    fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ searchText }),
    })
    .then(response => response.json())
    .then((data: SearchResponse) => handleResults(data.results))
    .catch(handleError);

    // Alternative avec async/await :
    /*
    const handleSubmit = async (): Promise<void> => {
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ searchText }),
        });
        const data: SearchResponse = await response.json();
        handleResults(data.results);
      } catch (error) {
        handleError(error);
      }
    };
    */
  };

  // Rendu du composant
  return (
    <Container>
      <TextField
        label="Recherche de variété (nom latin)"
        variant="outlined"
        value={searchText}
        onChange={handleChange}
      />
      <Button variant="contained" color="primary" onClick={handleSubmit}>
        Rechercher
      </Button>
      {error && <Typography color="error">{error}</Typography>}
      {results && (
        <div>
          <Typography variant="h6">Résultats de la recherche :</Typography>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </Container>
  );
};

export default App;

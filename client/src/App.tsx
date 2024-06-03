import React, { FC, useState } from 'react';
import { TextField, Button, Container } from '@mui/material';

const App: FC = () => {
  // État local du composant
  const [searchText, setSearchText] = useState<string>('');

  // Événements pour les changements dans le champ de texte
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  // Événements pour la soumission du formulaire
  const handleSubmit = async () => {
    // Envoi de la requête POST à l'API
    const response = await fetch('http://localhost:3000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ searchText }),
    });
    // Récupération et affichage des données de la réponse
    const data = await response.json();
    console.log(data);
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
    </Container>
  );
};

export default App;
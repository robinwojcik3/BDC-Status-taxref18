// Fichier : server-local.js
// Serveur Express pour tester l'application en local

const express = require('express');
const path = require('path');
const { handler } = require('./netlify/functions/generer-tableau');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Route pour l'API
app.post('/api/generer-tableau', async (req, res) => {
    // Simuler l'environnement Netlify
    const event = {
        httpMethod: 'POST',
        body: JSON.stringify(req.body),
        headers: req.headers
    };
    
    const context = {
        callbackWaitsForEmptyEventLoop: false
    };
    
    try {
        const response = await handler(event, context);
        res.status(response.statusCode);
        
        Object.entries(response.headers || {}).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        
        res.send(response.body);
    } catch (error) {
        console.error('Erreur serveur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route par défaut
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log('Appuyez sur Ctrl+C pour arrêter le serveur');
});

// Fichier : netlify/functions/generer-tableau.js
// VERSION DE DIAGNOSTIC "ECHO"
// Ce script ne contacte PAS l'API TAXREF. Il renvoie simplement les données qu'il reçoit.

exports.handler = async function(event, context) {
    // Log pour confirmer que la fonction a bien été appelée
    console.log("Fonction de diagnostic 'echo' démarrée.");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { scientific_names } = JSON.parse(event.body);

        // Log pour voir les noms reçus
        console.log("Noms reçus pour le test :", scientific_names);

        // On ne fait aucun appel externe. On simule une réponse réussie.
        // On transforme la liste de noms reçus en un format que le tableau peut afficher.
        const results = scientific_names.map(name => ({
            "Nom scientifique": name,
            "ID Taxon (cd_nom)": "TEST_ID",
            "Erreur": "Mode Diagnostic Actif",
            "lrn": "TEST_STATUT" // On ajoute une clé de statut pour tester l'affichage
        }));

        console.log("Envoi de la réponse simulée :", results);

        // On retourne un code 200 OK avec les résultats simulés.
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
        };

    } catch (err) {
        // Si même ce code simple plante, on le verra dans les logs.
        console.error("CRASH dans la fonction de diagnostic 'echo':", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: `Erreur critique en mode diagnostic: ${err.message}` }) 
        };
    }
};

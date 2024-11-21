const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { v4: uuidv4 } = require('uuid');
const vision = require('@google-cloud/vision');
const FormData = require('form-data');
const config = require('./config');
const cors = require('cors');

// Import the router and initialization function from pdfGenerator
const pdfGenerator = require('./pdfGenerator');

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Apply CORS middleware
app.use(cors({
  origin: 'https://appraisers-frontend-856401495068.us-central1.run.app',
  credentials: true,
}));

// Use the pdfGenerator router
app.use('/', pdfGenerator.router);

// Inicializar el cliente de Secret Manager
const client = new SecretManagerServiceClient();

// Rest of your index.js code...
// (Keep all the existing functions and endpoints)

// Iniciar el servidor después de cargar los secretos
const startServer = async () => {
  try {
    await loadSecrets();
    initializeVisionClient();
    await pdfGenerator.initializeGoogleApis();

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Servidor backend corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
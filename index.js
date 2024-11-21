// index.js
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

// Función para obtener un secreto de Secret Manager
async function getSecret(secretName) {
  try {
    const projectId = 'civil-forge-403609';
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await client.accessSecretVersion({ name: secretPath });
    const payload = version.payload.data.toString('utf8');
    console.log(`Secreto '${secretName}' obtenido exitosamente.`);
    return payload;
  } catch (error) {
    console.error(`Error obteniendo el secreto '${secretName}':`, error);
    throw new Error(`No se pudo obtener el secreto '${secretName}'.`);
  }
}

// Variables para almacenar los secretos
let visionClient;

// Función para cargar todos los secretos al iniciar la aplicación
async function loadSecrets() {
  try {
    config.WORDPRESS_API_URL = await getSecret('WORDPRESS_API_URL');
    config.WORDPRESS_USERNAME = await getSecret('wp_username');
    config.WORDPRESS_APP_PASSWORD = await getSecret('wp_app_password');
    config.OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    config.GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS');
    config.GOOGLE_DOCS_CREDENTIALS = await getSecret('GOOGLE_DOCS_CREDENTIALS');
    console.log('Todos los secretos han sido cargados exitosamente.');
  } catch (error) {
    console.error('Error cargando los secretos:', error);
    throw error;
  }
}

// Inicializar el cliente de Google Vision
function initializeVisionClient() {
  try {
    const credentials = JSON.parse(config.GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: 'civil-forge-403609',
    });
    console.log('Cliente de Google Vision inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando el cliente de Google Vision:', error);
    throw error;
  }
}

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
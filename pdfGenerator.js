// pdfGenerator.js

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const Handlebars = require('handlebars');
const { v4: uuidv4 } = require('uuid'); // Para generar nombres de archivos únicos

const router = express.Router();

// Inicializar el cliente de Secret Manager
const secretClient = new SecretManagerServiceClient();

// Función para obtener un secreto de Secret Manager
async function getGoogleDocsCredentials() {
  try {
    const secretName = 'GOOGLE_SERVICE_ACCOUNT_JSON'; // Nombre del secreto que almacena las credenciales de la cuenta de servicio
    const projectId = 'civil-forge-403609'; // Asegúrate de que este Project ID sea correcto
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await secretClient.accessSecretVersion({ name: secretPath });
    const payload = version.payload.data.toString('utf8');
    console.log(`Secreto '${secretName}' obtenido exitosamente.`);
    return JSON.parse(payload);
  } catch (error) {
    console.error(`Error obteniendo el secreto '${secretName}':`, error);
    throw new Error(`No se pudo obtener el secreto '${secretName}'.`);
  }
}

// Inicializar el cliente de Google APIs
let docs;
let drive;

async function initializeGoogleApis() {
  try {
    const credentials = await getGoogleDocsCredentials();

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const authClient = await auth.getClient();

    docs = google.docs({ version: 'v1', auth: authClient });
    drive = google.drive({ version: 'v3', auth: authClient });

    console.log('Clientes de Google Docs y Drive inicializados correctamente.');
  } catch (error) {
    console.error('Error inicializando las APIs de Google:', error);
    throw error;
  }
}

// Función para obtener los metadatos de un post de WordPress
const getPostMetadata = async (postId, metadataKey, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/appraisals/${postId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error obteniendo post de WordPress:`, errorText);
      throw new Error('Error obteniendo post de WordPress.');
    }

    const postData = await response.json();
    const acfFields = postData.acf || {};
    const metadataValue = acfFields[metadataKey] || '';

    return metadataValue;
  } catch (error) {
    console.error(`Error obteniendo metadato '${metadataKey}' del post ID ${postId}:`, error);
    throw error;
  }
};

// Función para clonar una plantilla de Google Docs
const cloneTemplate = async (templateId) => {
  try {
    const copiedFile = await drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: `Informe_Tasacion_${uuidv4()}`,
      },
    });

    return copiedFile.data.id;
  } catch (error) {
    console.error('Error clonando la plantilla de Google Docs:', error);
    throw new Error('Error clonando la plantilla de Google Docs.');
  }
};

// Función para reemplazar marcadores de posición en el documento
const replacePlaceholders = async (documentId, data) => {
  try {
    const requests = [];

    for (const [key, value] of Object.entries(data)) {
      requests.push({
        replaceAllText: {
          containsText: {
            text: `{{${key}}}`,
            matchCase: true,
          },
          replaceText: value,
        },
      });
    }

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: requests,
      },
    });

    console.log(`Marcadores de posición reemplazados en el documento ID: ${documentId}`);
  } catch (error) {
    console.error('Error reemplazando marcadores de posición en Google Docs:', error);
    throw new Error('Error reemplazando marcadores de posición en Google Docs.');
  }
};

// Función para exportar el documento a PDF
const exportDocumentToPDF = async (documentId) => {
  try {
    const response = await drive.files.export({
      fileId: documentId,
      mimeType: 'application/pdf',
    }, { responseType: 'arraybuffer' });

    console.log(`Documento ID: ${documentId} exportado a PDF correctamente.`);
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error('Error exportando el documento a PDF:', error);
    throw new Error('Error exportando el documento a PDF.');
  }
};

// Función para subir el PDF a Google Drive
const uploadPDFToDrive = async (pdfBuffer, filename, driveFolderId) => {
  try {
    const fileMetadata = {
      name: filename,
      mimeType: 'application/pdf',
      parents: [driveFolderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: Buffer.from(pdfBuffer),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    console.log(`PDF subido a Google Drive con ID: ${file.data.id}`);
    return file.data.webViewLink;
  } catch (error) {
    console.error('Error subiendo el PDF a Google Drive:', error);
    throw new Error('Error subiendo el PDF a Google Drive.');
  }
};

// Endpoint para generar el PDF
router.post('/generate-pdf', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    // Paso 1: Obtener los secretos y variables de entorno necesarios
    const GOOGLE_DOCS_TEMPLATE_ID = process.env.GOOGLE_DOCS_TEMPLATE_ID;
    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!GOOGLE_DOCS_TEMPLATE_ID || !GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('GOOGLE_DOCS_TEMPLATE_ID y GOOGLE_DRIVE_FOLDER_ID deben estar definidos en las variables de entorno.');
    }

    // Paso 2: Obtener el metadato 'age_text' del post
    const ageText = await getPostMetadata(postId, 'age_text', process.env.WORDPRESS_API_URL, process.env.WORDPRESS_USERNAME, process.env.WORDPRESS_APP_PASSWORD);

    // Paso 3: Clonar la plantilla de Google Docs
    const clonedDocId = await cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);

    // Paso 4: Reemplazar los marcadores de posición en el documento
    const data = { age_text: ageText };
    await replacePlaceholders(clonedDocId, data);

    // Paso 5: Exportar el documento a PDF
    const pdfBuffer = await exportDocumentToPDF(clonedDocId);

    // Paso 6: Subir el PDF a Google Drive
    const pdfFilename = `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    res.json({ success: true, message: 'PDF generado exitosamente.', pdfLink: pdfLink });
  } catch (error) {
    console.error('Error generando el PDF:', error);
    res.status(500).json({ success: false, message: error.message || 'Error generando el PDF.' });
  }
});

module.exports = { router, initializeGoogleApis };

// pdfGenerator.js

const express = require('express');
const fetch = require('node-fetch');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid'); // Para generar nombres de archivos únicos
const { Readable } = require('stream'); // Importar Readable desde stream
const he = require('he'); // Librería para decodificar HTML entities
const { format } = require('date-fns'); // Librería para formatear fechas

const router = express.Router();

// Inicializar el cliente de Secret Manager
const secretClient = new SecretManagerServiceClient();

// Función para obtener un secreto de Secret Manager
async function getGoogleDocsCredentials() {
  const secretName = 'GOOGLE_DOCS_CREDENTIALS'; // Nombre del secreto que almacena las credenciales de la cuenta de servicio
  try {
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
        'https://www.googleapis.com/auth/drive', // Scope ampliado
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

const adjustTitleFontSize = async (documentId, titleText) => {
  try {
    // Obtener el contenido completo del documento después de reemplazar los placeholders
    const document = await docs.documents.get({ documentId: documentId });
    const content = document.data.body.content;

    let titleRange = null;

    // Recorrer los elementos del documento para encontrar el título
    for (const element of content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun && elem.textRun.content.trim() === titleText.trim()) {
            titleRange = {
              startIndex: elem.startIndex,
              endIndex: elem.endIndex,
            };
            break;
          }
        }
      }
      if (titleRange) break;
    }

    if (!titleRange) {
      console.warn('No se encontró el título en el documento para ajustar el tamaño de la fuente.');
      return;
    }

    // Determinar el tamaño de fuente basado en la longitud del título
    let fontSize;

    if (titleText.length <= 20) {
      fontSize = 18; // Tamaño para títulos cortos
    } else if (titleText.length <= 40) {
      fontSize = 16; // Tamaño para títulos medianos
    } else {
      fontSize = 14; // Tamaño para títulos largos
    }

    // Crear la solicitud para actualizar el estilo del texto
    const requests = [{
      updateTextStyle: {
        range: titleRange,
        textStyle: {
          fontSize: {
            magnitude: fontSize,
            unit: 'PT',
          },
        },
        fields: 'fontSize',
      },
    }];

    // Enviar la solicitud a la API de Google Docs
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: requests,
      },
    });

    console.log(`Tamaño de fuente ajustado a ${fontSize}pt para el título en el documento ID: ${documentId}`);
  } catch (error) {
    console.error('Error ajustando el tamaño de la fuente del título:', error);
    throw new Error('Error ajustando el tamaño de la fuente del título.');
  }
};


// Función para obtener metadatos de un post de WordPress
const getPostMetadata = async (postId, metadataKey, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
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
    let metadataValue = acfFields[metadataKey] || '';

    // Validación de tamaño (ejemplo: máximo 5000 caracteres)
    const MAX_LENGTH = 5000;
    if (metadataValue.length > MAX_LENGTH) {
      metadataValue = metadataValue.substring(0, MAX_LENGTH) + '...';
      console.warn(`El metadato '${metadataKey}' excede el límite de ${MAX_LENGTH} caracteres y ha sido truncado.`);
    }

    return metadataValue;
  } catch (error) {
    console.error(`Error obteniendo metadato '${metadataKey}' del post ID ${postId}:`, error);
    throw error;
  }
};

// Función para obtener el título de un post de WordPress
const getPostTitle = async (postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/appraisals/${postId}?_fields=title`, {
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
    return he.decode(postData.title.rendered || '');
  } catch (error) {
    console.error(`Error obteniendo el título del post ID ${postId}:`, error);
    throw error;
  }
};

// Función para obtener la fecha de publicación de un post de WordPress
const getPostDate = async (postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/appraisals/${postId}?_fields=date`, {
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
    return format(new Date(postData.date), 'yyyy-MM-dd'); // Formatear la fecha a 'yyyy-MM-dd'
  } catch (error) {
    console.error(`Error obteniendo la fecha del post ID ${postId}:`, error);
    throw error;
  }
};

// Función auxiliar para obtener la URL de una imagen dado su ID de media
const getImageUrl = async (mediaId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/media/${mediaId}?_fields=source_url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error obteniendo media de WordPress:`, errorText);
      return null; // Devolver null en caso de error para continuar con las demás imágenes
    }

    const mediaData = await response.json();
    return mediaData.source_url || null;
  } catch (error) {
    console.error(`Error obteniendo la URL de la media ID ${mediaId}:`, error);
    return null;
  }
};

// Función para obtener la galería de imágenes de un post de WordPress
const getPostGallery = async (postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
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

    // Log completo para inspeccionar la estructura
    console.log(`postData:`, JSON.stringify(postData, null, 2));

    // Acceder al campo de galería ACF (asegurándose de usar el nombre correcto del campo)
    const galleryField = postData.acf && postData.acf.googlevision ? postData.acf.googlevision : [];

    // Verificar la estructura de la galería
    console.log(`Galería de imágenes obtenida (IDs de medios):`, galleryField);

    if (Array.isArray(galleryField) && galleryField.length > 0) {
      // Obtener las URLs de las imágenes usando getImageUrl
      const imageUrls = await Promise.all(galleryField.map(async (mediaId) => {
        return await getImageUrl(mediaId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD);
      }));

      // Filtrar URLs nulas
      const validImageUrls = imageUrls.filter(url => url !== null);

      console.log(`URLs de imágenes procesadas:`, validImageUrls);
      return validImageUrls;
    }

    console.log(`No se encontraron imágenes en la galería.`);
    return [];
  } catch (error) {
    console.error(`Error obteniendo la galería del post ID ${postId}:`, error);
    throw error;
  }
};

// Función para clonar una plantilla de Google Docs
const cloneTemplate = async (templateId) => {
  try {
    // Sanitizar el templateId eliminando espacios y caracteres no válidos
    const sanitizedTemplateId = templateId.trim().replace(/[^a-zA-Z0-9-_]/g, '');

    // Log para verificar el ID sanitizado
    console.log(`Clonando plantilla con ID: '${sanitizedTemplateId}'`);

    const copiedFile = await drive.files.copy({
      fileId: sanitizedTemplateId,
      requestBody: {
        name: `Informe_Tasacion_${uuidv4()}`,
      },
      supportsAllDrives: true, // Soporte para Unidades Compartidas
    });

    console.log(`Plantilla clonada con ID: ${copiedFile.data.id}`);
    return copiedFile.data.id;
  } catch (error) {
    console.error('Error clonando la plantilla de Google Docs:', error);
    throw new Error('Error clonando la plantilla de Google Docs.');
  }
};


// Función para agregar imágenes de la galería en el documento en formato de tabla utilizando tableCellLocation
const addGalleryImages = async (documentId, gallery) => {
  try {
    // Obtener el contenido completo del documento
    let document = await docs.documents.get({ documentId: documentId });
    let content = document.data.body.content;

    let galleryPlaceholderFound = false;
    let galleryPlaceholderIndex = -1;

    // Iterar sobre los elementos del documento para encontrar el placeholder
    for (let i = 0; i < content.length; i++) {
      const element = content[i];
      if (element.paragraph && element.paragraph.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun && elem.textRun.content.includes('{{gallery}}')) {
            galleryPlaceholderFound = true;
            galleryPlaceholderIndex = elem.startIndex;
            break;
          }
        }
      }
      if (galleryPlaceholderFound) break;
    }

    if (!galleryPlaceholderFound) {
      console.warn('Placeholder "{{gallery}}" no encontrado en el documento.');
      return;
    }

    // Eliminar el placeholder '{{gallery}}'
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: galleryPlaceholderIndex,
                endIndex: galleryPlaceholderIndex + '{{gallery}}'.length,
              },
            },
          },
        ],
      },
    });

    // Definir el número de columnas y filas
    const columns = 3;
    const rows = Math.ceil(gallery.length / columns);

    // Insertar la tabla en el índice ajustado
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertTable: {
              rows: rows,
              columns: columns,
              location: {
                index: galleryPlaceholderIndex,
              },
            },
          },
        ],
      },
    });

    // Crear solicitudes para insertar imágenes en las celdas de la tabla
    const imageRequests = [];

    for (let i = 0; i < gallery.length; i++) {
      const imageUrl = gallery[i];

      const rowIndex = Math.floor(i / columns);
      const columnIndex = i % columns;

      imageRequests.push({
        insertInlineImage: {
          uri: imageUrl,
          location: {
            tableCellLocation: {
              tableStartLocation: {
                index: galleryPlaceholderIndex + 1, // Inicio de la tabla
              },
              rowIndex: rowIndex,
              columnIndex: columnIndex,
            },
          },
          objectSize: {
            height: { magnitude: 150, unit: 'PT' },
            width: { magnitude: 150, unit: 'PT' },
          },
        },
      });
    }

    // Ejecutar las solicitudes (puedes ajustar el tamaño del lote si es necesario)
    const MAX_REQUESTS_PER_BATCH = 20; // Ajustado para tu caso
    for (let i = 0; i < imageRequests.length; i += MAX_REQUESTS_PER_BATCH) {
      const batchRequests = imageRequests.slice(i, i + MAX_REQUESTS_PER_BATCH);
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: batchRequests,
        },
      });
    }

    console.log(`Imágenes de la galería agregadas al documento ID: ${documentId} en formato de tabla.`);
  } catch (error) {
    console.error('Error agregando imágenes de la galería a Google Docs:', error);
    throw new Error('Error agregando imágenes de la galería a Google Docs.');
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
    if (error.response && error.response.data && error.response.data.error) {
      const { message, reason } = error.response.data.error;
      if (reason === 'exportSizeLimitExceeded') {
        console.error('Error: El documento excede el límite de tamaño para exportación.');
        throw new Error('El documento es demasiado grande para ser exportado a PDF. Por favor, reduzca el tamaño o la complejidad del documento.');
      }
    }
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
      body: Readable.from(pdfBuffer), // Convertir Buffer a Readable Stream
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true, // Soporte para Unidades Compartidas
    });

    console.log(`PDF subido a Google Drive con ID: ${file.data.id}`);
    console.log(`Enlace al PDF: ${file.data.webViewLink}`); // Agregar el enlace al log
    return file.data.webViewLink;
  } catch (error) {
    console.error('Error subiendo el PDF a Google Drive:', error);
    throw new Error('Error subiendo el PDF a Google Drive.');
  }
};

// Función para mover el archivo clonado a una carpeta específica (opcional)
const moveFileToFolder = async (fileId, folderId) => {
  try {
    await drive.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: 'root', // Eliminar de la carpeta raíz si es necesario
      fields: 'id, parents',
    });
    console.log(`Archivo ${fileId} movido a la carpeta ${folderId}`);
  } catch (error) {
    console.error('Error moviendo el archivo:', error);
    throw new Error('Error moviendo el archivo.');
  }
};

// Endpoint para generar el PDF
router.post('/generate-pdf', async (req, res) => {
  const { postId, session_ID } = req.body; // Aceptar session_ID como parámetro

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    // Paso 1: Obtener los secretos y variables de entorno necesarios
    const GOOGLE_DOCS_TEMPLATE_ID = process.env.GOOGLE_DOCS_TEMPLATE_ID;
    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log(`GOOGLE_DOCS_TEMPLATE_ID: '${GOOGLE_DOCS_TEMPLATE_ID}'`);
    console.log(`GOOGLE_DRIVE_FOLDER_ID: '${GOOGLE_DRIVE_FOLDER_ID}'`);

    if (!GOOGLE_DOCS_TEMPLATE_ID || !GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('GOOGLE_DOCS_TEMPLATE_ID y GOOGLE_DRIVE_FOLDER_ID deben estar definidos en las variables de entorno.');
    }

    const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL;
    const WORDPRESS_USERNAME = process.env.WORDPRESS_USERNAME;
    const WORDPRESS_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

    // Paso 2: Obtener los metadatos adicionales del post
    const metadataKeys = [
      'test',
      'ad_copy',
      'age_text',
      'age1',
      'condition',
      'signature1',
      'signature2',
      'style',
      'valuation_method',
      'conclusion1',
      'conclusion2',
      'authorship'
    ];

    const metadataPromises = metadataKeys.map(key => getPostMetadata(postId, key, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD));
    const metadataValues = await Promise.all(metadataPromises);

    const metadata = {};
    metadataKeys.forEach((key, index) => {
      metadata[key] = metadataValues[index];
    });

    // Obtener el título y la fecha del post
    const [postTitle, postDate] = await Promise.all([
      getPostTitle(postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
      getPostDate(postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)
    ]);

    // Obtener la galería de imágenes del post
    const gallery = await getPostGallery(postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD);

    // Log para verificar los metadatos, el título, la fecha y la galería obtenidos
    console.log(`Metadatos obtenidos:`, metadata);
    console.log(`Título del post obtenido: '${postTitle}'`);
    console.log(`Fecha del post obtenida: '${postDate}'`);
    console.log(`Galería de imágenes obtenida:`, gallery);

    // Paso 6: Clonar la plantilla de Google Docs
    const clonedDocId = await cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);

    // (Opcional) Mover el archivo clonado a la carpeta deseada
    await moveFileToFolder(clonedDocId, GOOGLE_DRIVE_FOLDER_ID);

 // Paso 7: Reemplazar los marcadores de posición en el documento
const data = {
  ...metadata,
  appraisal_title: postTitle,
  appraisal_date: postDate
};
await replacePlaceholders(clonedDocId, data);

// Paso 8: Ajustar el tamaño de la fuente del título
await adjustTitleFontSize(clonedDocId, postTitle);


    // Paso 9: Agregar las imágenes de la galería al documento
    if (gallery.length > 0) {
      await addGalleryImages(clonedDocId, gallery);
    }

    // Paso 10: Exportar el documento a PDF
    const pdfBuffer = await exportDocumentToPDF(clonedDocId);

    // Paso 11: Determinar el nombre del archivo PDF
    let pdfFilename;
    if (session_ID && typeof session_ID === 'string' && session_ID.trim() !== '') {
      pdfFilename = `${session_ID}.pdf`;
    } else {
      pdfFilename = `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;
    }

    // Paso 12: Subir el PDF a Google Drive
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    res.json({ success: true, message: 'PDF generado exitosamente.', pdfLink: pdfLink });
  } catch (error) {
    console.error('Error generando el PDF:', error);
    res.status(500).json({ success: false, message: error.message || 'Error generando el PDF.' });
  }
});

module.exports = { router, initializeGoogleApis };

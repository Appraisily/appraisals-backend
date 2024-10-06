// pdfGenerator.js

const express = require('express');
const fetch = require('node-fetch');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid'); // Para generar nombres de archivos únicos
const { Readable } = require('stream'); // Importar Readable desde stream
const he = require('he'); // Librería para decodificar HTML cloneT
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

    // Usar una expresión regular para encontrar el título
    const titleRegex = new RegExp(titleText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Recorrer los elementos del documento para encontrar el título
    for (const element of content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun && elem.textRun.content.trim().match(titleRegex)) {
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

// Función para obtener la URL de un campo de imagen ACF
const getImageFieldUrlFromPost = async (postId, fieldName, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
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
    const imageField = acfFields[fieldName];

    if (imageField) {
      if (typeof imageField === 'string' && imageField.startsWith('http')) {
        // URL de la imagen
        return imageField;
      } else if (typeof imageField === 'number') {
        // ID de media
        const imageUrl = await getImageUrl(imageField, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD);
        return imageUrl;
      } else if (typeof imageField === 'object' && imageField.url) {
        // Objeto de imagen con URL
        return imageField.url;
      } else {
        console.warn(`Formato de campo de imagen '${fieldName}' no reconocido.`);
        return null;
      }
    } else {
      console.warn(`No se encontró el campo de imagen '${fieldName}' o está vacío.`);
      return null;
    }
  } catch (error) {
    console.error(`Error obteniendo la URL de la imagen para el campo '${fieldName}' del post ID ${postId}:`, error);
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

// Función para exportar un documento de Google Docs a PDF
const exportDocumentToPDF = async (documentId) => {
  try {
    const response = await drive.files.export(
      {
        fileId: documentId,
        mimeType: 'application/pdf',
      },
      { responseType: 'arraybuffer' }
    );

    const pdfBuffer = Buffer.from(response.data);
    console.log('Documento exportado a PDF exitosamente.');
    return pdfBuffer;
  } catch (error) {
    console.error('Error exportando el documento a PDF:', error);
    throw new Error('Error exportando el documento a PDF.');
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

// Función para reemplazar marcadores de posición en todo el documento, incluyendo tablas
const replacePlaceholdersInDocument = async (documentId, data) => {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    const requests = [];

    const findAndReplace = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content) {
              for (const [key, value] of Object.entries(data)) {
                const placeholder = `{{${key}}}`;
                if (textElement.textRun.content.includes(placeholder)) {
                  const startIndex = textElement.startIndex + textElement.textRun.content.indexOf(placeholder);
                  const endIndex = startIndex + placeholder.length;

                  requests.push({
                    replaceAllText: {
                      containsText: {
                        text: placeholder,
                        matchCase: true,
                      },
                      replaceText: value !== undefined && value !== null ? String(value) : '',
                    },
                  });
                }
              }
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findAndReplace(cell.content);
            }
          }
        }
      }
    };

    findAndReplace(content);

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests,
        },
      });
      console.log(`Marcadores de posición reemplazados en el documento ID: ${documentId}`);
    } else {
      console.log('No se encontraron marcadores de posición para reemplazar.');
    }
  } catch (error) {
    console.error('Error reemplazando marcadores de posición en Google Docs:', error);
    throw new Error('Error reemplazando marcadores de posición en Google Docs.');
  }
};


// Función para actualizar campos ACF de un post
const updatePostACFFields = async (postId, fields, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) => {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/acf/v3/appraisals/${postId}`, {
      method: 'POST', // O 'PATCH' dependiendo de tu configuración
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({
        fields: fields
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error actualizando campos ACF en WordPress:`, errorText);
      throw new Error('Error actualizando campos ACF en WordPress.');
    }

    const postData = await response.json();
    return postData;
  } catch (error) {
    console.error(`Error actualizando campos ACF para el post ID ${postId}:`, error);
    throw error;
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


// Función para clonar una plantilla de Google Docs y obtener el enlace al documento clonado
const cloneTemplate = async (templateId) => {
  try {
    const sanitizedTemplateId = templateId.trim();

    // Log para verificar el ID sanitizado
    console.log(`Clonando plantilla con ID: '${sanitizedTemplateId}'`);

    const copiedFile = await drive.files.copy({
      fileId: sanitizedTemplateId,
      requestBody: {
        name: `Informe_Tasacion_${uuidv4()}`,
      },
      fields: 'id, webViewLink', // Solicitamos el webViewLink
      supportsAllDrives: true, // Soporte para Unidades Compartidas
    });

    console.log(`Plantilla clonada con ID: ${copiedFile.data.id}`);
    return { id: copiedFile.data.id, link: copiedFile.data.webViewLink };
  } catch (error) {
    console.error('Error clonando la plantilla de Google Docs:', error);
    throw new Error(`Error clonando la plantilla de Google Docs: ${error.message}`);
  }
};

const insertImageAtPlaceholder = async (documentId, placeholder, imageUrl) => {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    // Función recursiva para buscar el placeholder
    const findPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content.includes(`{{${placeholder}}}`)) {
              const startIndex = textElement.startIndex + textElement.textRun.content.indexOf(`{{${placeholder}}}`);
              const endIndex = startIndex + `{{${placeholder}}}`.length;

              return { startIndex, endIndex };
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              const result = findPlaceholder(cell.content);
              if (result) {
                return result;
              }
            }
          }
        }
      }
      return null;
    };

    const placeholderInfo = findPlaceholder(content);

    if (placeholderInfo) {
      const { startIndex, endIndex } = placeholderInfo;

      // Eliminar el placeholder
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              deleteContentRange: {
                range: {
                  startIndex: startIndex,
                  endIndex: endIndex,
                },
              },
            },
          ],
        },
      });

      // Insertar la imagen en el índice donde estaba el placeholder
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: [
            {
              insertInlineImage: {
                uri: imageUrl,
                location: {
                  index: startIndex,
                },
                objectSize: {
                  height: { magnitude: 150, unit: 'PT' },
                  width: { magnitude: 150, unit: 'PT' },
                },
              },
            },
          ],
        },
      });

      console.log(`Imagen insertada en el placeholder {{${placeholder}}}`);
    } else {
      console.warn(`No se encontró el placeholder {{${placeholder}}} en el documento.`);
    }
  } catch (error) {
    console.error(`Error insertando imagen en el placeholder {{${placeholder}}}:`, error);
    throw error;
  }
};


// Función para mover el archivo clonado a una carpeta específica en Google Drive
const moveFileToFolder = async (fileId, folderId) => {
  try {
    // Obtener los detalles del archivo para obtener su(s) padre(s) actual(es)
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents',
      supportsAllDrives: true, // Si estás utilizando Unidades Compartidas
    });

    // Obtener los IDs de los padres actuales
    const previousParents = file.data.parents.join(',');

    // Mover el archivo a la nueva carpeta y eliminarlo de los padres anteriores
    await drive.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: previousParents,
      supportsAllDrives: true, // Si estás utilizando Unidades Compartidas
      fields: 'id, parents',
    });

    console.log(`Archivo ${fileId} movido a la carpeta ${folderId}`);
  } catch (error) {
    console.error('Error moviendo el archivo:', error);
    throw new Error('Error moviendo el archivo.');
  }
};

const addGalleryImages = async (documentId, gallery) => {
  try {
    console.log('Iniciando addGalleryImages');
    console.log(`Número de imágenes en la galería: ${gallery.length}`);

    // Obtener el contenido completo del documento
    let document = await docs.documents.get({ documentId: documentId });
    let content = document.data.body.content;

    let galleryPlaceholderFound = false;
    let galleryPlaceholderIndex = -1;

    // Buscar el placeholder '{{gallery}}' en todo el contenido, incluyendo tablas
    const findPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun && elem.textRun.content.includes('{{gallery}}')) {
              galleryPlaceholderFound = true;
              galleryPlaceholderIndex = elem.startIndex;
              return;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findPlaceholder(cell.content);
              if (galleryPlaceholderFound) return;
            }
          }
        }
      }
    };

    findPlaceholder(content);

    if (!galleryPlaceholderFound) {
      console.warn('Placeholder "{{gallery}}" no encontrado en el documento.');
      return;
    }

    console.log(`Placeholder "{{gallery}}" encontrado en el índice ${galleryPlaceholderIndex}`);

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

    console.log('Placeholder "{{gallery}}" eliminado del documento');

    // Esperar para que los cambios se apliquen
    await new Promise(resolve => setTimeout(resolve, 500));

    // Insertar la tabla
    const columns = 3;
    const rows = Math.ceil(gallery.length / columns);

    console.log(`Insertando tabla con ${rows} filas y ${columns} columnas`);

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

    console.log('Tabla insertada en el documento');

    // Esperar para que la tabla se inserte correctamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Obtener el documento actualizado
    document = await docs.documents.get({ documentId: documentId });
    content = document.data.body.content;

    // Encontrar la tabla recién insertada
    let tableElement = null;

    const findTableAtIndex = (elements, index) => {
      for (const element of elements) {
        if (element.table && element.startIndex === index) {
          tableElement = element;
          return;
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findTableAtIndex(cell.content, index);
              if (tableElement) return;
            }
          }
        }
      }
    };

    findTableAtIndex(content, galleryPlaceholderIndex);

    if (!tableElement) {
      console.warn('No se encontró la tabla insertada para la galería.');
      return;
    }

    // Continuar con la inserción de placeholders e imágenes
    // Insertar placeholders en las celdas
    let placeholderNumber = 1;
    const requests = [];

    for (let rowIndex = 0; rowIndex < tableElement.table.tableRows.length; rowIndex++) {
      const row = tableElement.table.tableRows[rowIndex];
      for (let columnIndex = 0; columnIndex < row.tableCells.length; columnIndex++) {
        if (placeholderNumber > gallery.length) break;
        const cell = row.tableCells[columnIndex];
        const cellStartIndex = cell.startIndex + 1; // +1 para dentro de la celda
        const placeholderText = `{{googlevision${placeholderNumber}}}`;

        requests.push({
          insertText: {
            text: placeholderText,
            location: {
              index: cellStartIndex,
            },
          },
        });

        placeholderNumber++;
      }
    }

    // Enviar las solicitudes para insertar los placeholders
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: requests,
      },
    });

    console.log('Placeholders de imágenes de la galería insertados en la tabla');

    // Reemplazar los placeholders por las imágenes
    for (let i = 0; i < gallery.length; i++) {
      const placeholder = `googlevision${i + 1}`;
      const imageUrl = gallery[i];
      await insertImageAtPlaceholder(documentId, placeholder, imageUrl);
    }

    console.log('Imágenes de la galería insertadas en el documento.');
  } catch (error) {
    console.error('Error agregando imágenes de la galería a Google Docs:', error);
    throw new Error(`Error agregando imágenes de la galería a Google Docs: ${error.message}`);
  }
};


// Función para insertar el metadato "table" como una tabla en el documento
const insertMetadataTable = async (documentId, placeholder, tableData) => {
  try {
    const document = await docs.documents.get({ documentId: documentId });
    const content = document.data.body.content;

    let placeholderFound = false;
    let placeholderIndex = -1;

    // Buscar el placeholder en todo el contenido, incluyendo tablas
    const findPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun && elem.textRun.content.includes(`{{${placeholder}}}`)) {
              placeholderFound = true;
              placeholderIndex = elem.startIndex;
              return;
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findPlaceholder(cell.content);
              if (placeholderFound) return;
            }
          }
        }
      }
    };

    findPlaceholder(content);

    if (!placeholderFound) {
      console.warn(`Placeholder "{{${placeholder}}}" no encontrado en el documento.`);
      return;
    }

    // Eliminar el placeholder
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: placeholderIndex,
                endIndex: placeholderIndex + `{{${placeholder}}}`.length,
              },
            },
          },
        ],
      },
    });

    // Parsear el contenido de tableData y preparar los datos para la tabla
    const rows = tableData.split('-').map(item => item.trim()).filter(item => item);
    const tableRows = rows.map(row => {
      const [key, value] = row.split(':').map(s => s.trim());
      return [key || '', value || ''];
    });

    // Insertar la tabla en el documento
    const numRows = tableRows.length;
    const numCols = 2; // Clave y Valor

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertTable: {
              rows: numRows,
              columns: numCols,
              location: {
                index: placeholderIndex,
              },
            },
          },
        ],
      },
    });

    // Esperar para que la tabla se inserte correctamente
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Obtener el documento actualizado
    const updatedDocument = await docs.documents.get({ documentId: documentId });
    const updatedContent = updatedDocument.data.body.content;

    // Encontrar la tabla insertada
    let tableElement = null;

    const findTableAtIndex = (elements) => {
      for (const element of elements) {
        if (element.table && element.startIndex === placeholderIndex) {
          tableElement = element;
          return;
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findTableAtIndex(cell.content);
              if (tableElement) return;
            }
          }
        }
      }
    };

    findTableAtIndex(updatedContent);

    if (!tableElement) {
      console.warn('No se encontró la tabla insertada para el metadato "table".');
      return;
    }

    // Preparar las solicitudes para insertar el texto en las celdas
    const requests = [];
    let cellIndex = 0;

    for (let i = 0; i < tableRows.length; i++) {
      const row = tableElement.table.tableRows[i];
      for (let j = 0; j < numCols; j++) {
        const cell = row.tableCells[j];
        const cellStartIndex = cell.startIndex + 1; // +1 para dentro de la celda
        const text = tableRows[i][j];

        requests.push({
          insertText: {
            text: text,
            location: {
              index: cellStartIndex,
            },
          },
        });
      }
    }

    // Enviar las solicitudes para insertar el texto
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: requests,
      },
    });

    console.log('Metadato "table" insertado como tabla en el documento.');
  } catch (error) {
    console.error('Error insertando el metadato "table" como tabla en el documento:', error);
    throw error;
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
      'authorship',
      'table',
      'glossary',
      'value'         // Añadido
    ];

    const metadataPromises = metadataKeys.map(key =>
      getPostMetadata(postId, key, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)
    );
    const metadataValues = await Promise.all(metadataPromises);

    const metadata = {};
    metadataKeys.forEach((key, index) => {
      metadata[key] = metadataValues[index];
    });

    // Convertir el valor numérico a formato adecuado
    if (metadata.value) {
      const numericValue = parseFloat(metadata.value);
      if (!isNaN(numericValue)) {
        metadata.appraisal_value = numericValue.toLocaleString('es-ES', {
          style: 'currency',
          currency: 'USD',
        });
      } else {
        metadata.appraisal_value = metadata.value; // Si no es un número, usar el valor tal cual
      }
    } else {
      metadata.appraisal_value = ''; // Si no hay valor, dejar vacío
    }

    // Obtener el título, la fecha y las URLs de las imágenes
    const [postTitle, postDate, ageImageUrl, signatureImageUrl, mainImageUrl] = await Promise.all([
      getPostTitle(postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
      getPostDate(postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
      getImageFieldUrlFromPost(postId, 'age', WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
      getImageFieldUrlFromPost(postId, 'signature', WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
      getImageFieldUrlFromPost(postId, 'main', WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD),
    ]);

    // Obtener la galería de imágenes del post
    const gallery = await getPostGallery(postId, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD);

    // Log para verificar los metadatos, el título, la fecha y la galería obtenidos
    console.log(`Metadatos obtenidos:`, metadata);
    console.log(`Título del post obtenido: '${postTitle}'`);
    console.log(`Fecha del post obtenida: '${postDate}'`);
    console.log(`Galería de imágenes obtenida:`, gallery);
    console.log(`URL de imagen 'age': ${ageImageUrl}`);
    console.log(`URL de imagen 'signature': ${signatureImageUrl}`);
    console.log(`URL de imagen 'main': ${mainImageUrl}`);

    // Paso 6: Clonar la plantilla de Google Docs
    const clonedDoc = await cloneTemplate(GOOGLE_DOCS_TEMPLATE_ID);
    const clonedDocId = clonedDoc.id;
    const clonedDocLink = clonedDoc.link;

    // (Opcional) Mover el archivo clonado a la carpeta deseada
    await moveFileToFolder(clonedDocId, GOOGLE_DRIVE_FOLDER_ID);

    // Paso 7: Reemplazar los marcadores de posición en el documento
    const data = {
      ...metadata,
      appraisal_title: postTitle,
      appraisal_date: postDate,
    };
    await replacePlaceholders(clonedDocId, data);

    // Paso 8: Ajustar el tamaño de la fuente del título
    await adjustTitleFontSize(clonedDocId, postTitle);

    // Paso 9: Insertar el metadato "table" como tabla
    if (metadata.table) {
      await insertMetadataTable(clonedDocId, 'table', metadata.table);
    }

    // Paso 10: Agregar las imágenes de la galería al documento
    if (gallery.length > 0) {
      await addGalleryImages(clonedDocId, gallery);
    }

    // Paso 11: Insertar imágenes en los placeholders
    if (ageImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'age_image', ageImageUrl);
    }
    if (signatureImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'signature_image', signatureImageUrl);
    }
    if (mainImageUrl) {
      await insertImageAtPlaceholder(clonedDocId, 'main_image', mainImageUrl);
    }

    // Paso 12: Exportar el documento a PDF
    const pdfBuffer = await exportDocumentToPDF(clonedDocId);

    // Paso 13: Determinar el nombre del archivo PDF
    let pdfFilename;
    if (session_ID && typeof session_ID === 'string' && session_ID.trim() !== '') {
      pdfFilename = `${session_ID}.pdf`;
    } else {
      pdfFilename = `Informe_Tasacion_Post_${postId}_${uuidv4()}.pdf`;
    }

    // Paso 14: Subir el PDF a Google Drive
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, GOOGLE_DRIVE_FOLDER_ID);

    // Paso 15: Actualizar los campos ACF del post con los enlaces
    await updatePostACFFields(postId, { pdflink: pdfLink, doclink: clonedDocLink }, WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD);

    // Devolver el enlace al PDF y al documento de Google Docs
    res.json({
      success: true,
      message: 'PDF generado exitosamente.',
      pdfLink: pdfLink,
      docLink: clonedDocLink // Añadido
    });
  } catch (error) {
    console.error('Error generando el PDF:', error);
    res.status(500).json({ success: false, message: error.message || 'Error generando el PDF.' });
  }
});

module.exports = { router, initializeGoogleApis };


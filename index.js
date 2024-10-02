// index.js

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { v4: uuidv4 } = require('uuid'); // Para generar nombres de archivos únicos
const vision = require('@google-cloud/vision'); // Importar el cliente de Vision
const FormData = require('form-data'); // Para subir imágenes a WordPress

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Inicializar el cliente de Secret Manager
const client = new SecretManagerServiceClient();

// Función para obtener un secreto de Secret Manager
async function getSecret(secretName) {
  try {
    const projectId = 'civil-forge-403609'; // **Asegúrate de que este Project ID sea correcto**
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
let WORDPRESS_API_URL;
let WORDPRESS_USERNAME;
let WORDPRESS_APP_PASSWORD;
let OPENAI_API_KEY;
let GOOGLE_VISION_CREDENTIALS; // Nuevo secreto para Vision API
let UNSPLASH_ACCESS_KEY; // Clave de API de Unsplash

// Función para cargar todos los secretos al iniciar la aplicación
async function loadSecrets() {
  try {
    WORDPRESS_API_URL = await getSecret('WORDPRESS_API_URL');
    WORDPRESS_USERNAME = await getSecret('wp_username');
    WORDPRESS_APP_PASSWORD = await getSecret('wp_app_password');
    OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    GOOGLE_VISION_CREDENTIALS = await getSecret('GOOGLE_VISION_CREDENTIALS'); // Cargar las credenciales de Vision
    UNSPLASH_ACCESS_KEY = await getSecret('UNSPLASH_ACCESS_KEY'); // Cargar la clave de Unsplash
    console.log('Todos los secretos han sido cargados exitosamente.');
  } catch (error) {
    console.error('Error cargando los secretos:', error);
    process.exit(1); // Salir si no se pudieron cargar los secretos
  }
}

// Inicializar el cliente de Google Vision
let visionClient;

function initializeVisionClient() {
  try {
    const credentials = JSON.parse(GOOGLE_VISION_CREDENTIALS);
    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: 'civil-forge-403609', // Reemplaza con tu Project ID si es diferente
    });
    console.log('Cliente de Google Vision inicializado correctamente.');
  } catch (error) {
    console.error('Error inicializando el cliente de Google Vision:', error);
    process.exit(1);
  }
}

// Función para obtener la URL de la imagen desde WordPress
const getImageUrl = async (imageField) => {
  if (!imageField) return null;

  // Si es un ID de media (número o cadena numérica)
  if (typeof imageField === 'number' || (typeof imageField === 'string' && /^\d+$/.test(imageField))) {
    const mediaId = imageField;
    try {
      const mediaResponse = await fetch(`${WORDPRESS_API_URL}/media/${mediaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
        }
      });

      if (!mediaResponse.ok) {
        console.error(`Error fetching image with ID ${mediaId}:`, await mediaResponse.text());
        return null;
      }

      const mediaData = await mediaResponse.json();
      return mediaData.source_url || null;
    } catch (error) {
      console.error(`Error fetching image with ID ${mediaId}:`, error);
      return null;
    }
  }

  // Si es una URL directa
  if (typeof imageField === 'string' && imageField.startsWith('http')) {
    return imageField;
  }

  // Si es un objeto con una propiedad 'url'
  if (typeof imageField === 'object' && imageField.url) {
    return imageField.url;
  }

  return null;
};

// Función para leer el prompt desde un archivo txt basado en custom_post_type_name
const getPrompt = async (custom_post_type_name) => {
  const promptsDir = path.join(__dirname, 'prompts');
  const promptFilePath = path.join(promptsDir, `${custom_post_type_name}.txt`);

  try {
    const prompt = await fs.readFile(promptFilePath, 'utf8');
    return prompt;
  } catch (error) {
    console.error(`Error leyendo el archivo de prompt para ${custom_post_type_name}:`, error);
    throw new Error(`Archivo de prompt para ${custom_post_type_name} no encontrado.`);
  }
};

// Función para generar texto con OpenAI
const generateTextWithOpenAI = async (prompt, title, imageUrls) => {
  // Construir el contenido del mensaje siguiendo la estructura correcta
  const messagesWithRoles = [
    {
      role: "system",
      content: "You are a professional art expert."
    },
    {
      role: "user",
      content: [
        { type: "text", text: `Title: ${title}` },
        ...(imageUrls.main ? [{ type: "image_url", image_url: { url: imageUrls.main } }] : []),
        ...(imageUrls.age ? [{ type: "image_url", image_url: { url: imageUrls.age } }] : []),
        ...(imageUrls.signature ? [{ type: "image_url", image_url: { url: imageUrls.signature } }] : []),
        { type: "text", text: prompt }
      ]
    }
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // Asegúrate de que este es el modelo correcto que deseas usar
        messages: messagesWithRoles,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('Error en la respuesta de OpenAI:', errorDetails);
      throw new Error('Error generando texto con OpenAI.');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim();
    return generatedText;
  } catch (error) {
    console.error('Error generando texto con OpenAI:', error);
    throw new Error('Error generando texto con OpenAI.');
  }
};

// Función para actualizar metadatos en WordPress
const updateWordPressMetadata = async (wpPostId, metadataKey, metadataValue) => {
  const updateWpEndpoint = `${WORDPRESS_API_URL}/appraisals/${wpPostId}`;

  const updateData = {
    acf: {
      [metadataKey]: metadataValue
    }
  };

  try {
    const response = await fetch(updateWpEndpoint, {
      method: 'POST', // Puedes usar 'PUT' o 'PATCH' si es necesario
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error actualizando metadata '${metadataKey}' en WordPress:`, errorText);
      throw new Error(`Error actualizando metadata '${metadataKey}' en WordPress.`);
    }

    const responseData = await response.json();
    console.log(`Metadata '${metadataKey}' actualizado exitosamente en WordPress:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`Error actualizando metadata '${metadataKey}' en WordPress:`, error);
    throw new Error(`Error actualizando metadata '${metadataKey}' en WordPress.`);
  }
};

// Función para analizar la imagen con Google Vision y obtener etiquetas
const analyzeImageWithGoogleVision = async (imageUrl) => {
  try {
    const [result] = await visionClient.labelDetection(imageUrl);
    const labels = result.labelAnnotations;
    console.log('Etiquetas obtenidas de Google Vision:', labels);

    // Extraer palabras clave relevantes para buscar imágenes similares
    const keywords = labels.map(label => label.description).filter(desc => desc.length > 3); // Filtrar descripciones cortas
    console.log('Palabras clave para búsqueda:', keywords);

    return keywords;
  } catch (error) {
    console.error('Error analizando la imagen con Google Vision:', error);
    throw new Error('Error analizando la imagen con Google Vision.');
  }
};

// Función para buscar imágenes en Unsplash usando palabras clave
const searchSimilarImages = async (keywords, perPage = 5) => {
  try {
    const query = keywords.slice(0, 5).join(' '); // Limitar a las primeras 5 palabras clave para la búsqueda
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
      }
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('Error buscando imágenes en Unsplash:', errorDetails);
      throw new Error('Error buscando imágenes en Unsplash.');
    }

    const data = await response.json();
    const imageUrls = data.results.map(photo => photo.urls.small); // Obtener URLs de imágenes pequeñas
    console.log('Imágenes similares encontradas:', imageUrls);

    return imageUrls;
  } catch (error) {
    console.error('Error en la función searchSimilarImages:', error);
    throw new Error('Error buscando imágenes similares.');
  }
};

// Función para subir una imagen a WordPress
const uploadImageToWordPress = async (imageUrl) => {
  try {
    // Descargar la imagen
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Error descargando la imagen desde ${imageUrl}:`, await response.text());
      return null;
    }
    const buffer = await response.buffer();

    // Crear un nombre de archivo único
    const filename = `similar-image-${uuidv4()}.jpg`;

    // Preparar el formulario para subir la imagen
    const form = new FormData();
    form.append('file', buffer, filename);

    // Subir la imagen a WordPress
    const uploadResponse = await fetch(`${WORDPRESS_API_URL}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
        // 'Content-Type' será manejado automáticamente por FormData
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      console.error(`Error subiendo la imagen a WordPress desde ${imageUrl}:`, await uploadResponse.text());
      return null;
    }

    const uploadData = await uploadResponse.json();
    console.log(`Imagen subida a WordPress con ID: ${uploadData.id}`);
    return uploadData.id;
  } catch (error) {
    console.error(`Error en uploadImageToWordPress para ${imageUrl}:`, error);
    return null;
  }
};

// Función para procesar la imagen principal y actualizar metadatos con imágenes de Google Vision
const processMainImageWithGoogleVision = async (postId) => {
  try {
    // Obtener detalles del post desde WordPress
    const getPostEndpoint = `${WORDPRESS_API_URL}/appraisals/${postId}`;

    const postResponse = await fetch(getPostEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('Error obteniendo post de WordPress:', errorText);
      throw new Error('Error obteniendo post de WordPress.');
    }

    const postData = await postResponse.json();

    const acfFields = postData.acf || {};

    // Obtener la URL de la imagen principal
    const mainImageUrl = await getImageUrl(acfFields.main);
    if (!mainImageUrl) {
      throw new Error('Imagen principal no encontrada en el post.');
    }
    console.info(`Post ID: ${postId} - Main Image URL: ${mainImageUrl}`);

    // Analizar la imagen con Google Vision para obtener etiquetas
    const keywords = await analyzeImageWithGoogleVision(mainImageUrl);
    if (keywords.length === 0) {
      throw new Error('No se obtuvieron etiquetas de Google Vision.');
    }

    // Buscar imágenes similares en Unsplash
    const similarImageUrls = await searchSimilarImages(keywords, 5); // Obtener 5 imágenes similares
    if (similarImageUrls.length === 0) {
      throw new Error('No se encontraron imágenes similares en Unsplash.');
    }

    // Subir las imágenes similares a WordPress y obtener sus IDs
    const uploadedImageIds = [];
    for (const url of similarImageUrls) {
      const imageId = await uploadImageToWordPress(url);
      if (imageId) {
        uploadedImageIds.push(imageId);
      }
    }

    if (uploadedImageIds.length === 0) {
      throw new Error('No se pudieron subir imágenes similares a WordPress.');
    }

    // Actualizar el metadato 'GoogleVision' en WordPress
    const metadataKey = 'GoogleVision'; // Asegúrate de que este es el nombre correcto del metadato
    const metadataValue = uploadedImageIds;

    await updateWordPressMetadata(postId, metadataKey, metadataValue);
    console.info(`Metadato '${metadataKey}' actualizado exitosamente en WordPress.`);

    return {
      success: true,
      message: `Imágenes similares obtenidas y subidas exitosamente al metadato '${metadataKey}'.`,
      imageIds: uploadedImageIds
    };
  } catch (error) {
    console.error(`Error procesando la imagen principal con Google Vision:`, error);
    throw error;
  }
};

// **Endpoint: Update Post Metadata with OpenAI Generated Text**
app.post('/update-metadata', async (req, res) => {
  const { postId, custom_post_type_name } = req.body; // postId y metadataKey

  if (!postId || !custom_post_type_name) {
    return res.status(400).json({ success: false, message: 'postId y custom_post_type_name son requeridos.' });
  }

  try {
    // Obtener detalles del post desde WordPress
    const getPostEndpoint = `${WORDPRESS_API_URL}/appraisals/${postId}`;

    const postResponse = await fetch(getPostEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(WORDPRESS_USERNAME)}:${WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('Error obteniendo post de WordPress:', errorText);
      return res.status(500).json({ success: false, message: 'Error obteniendo post de WordPress.' });
    }

    const postData = await postResponse.json();

    const postTitle = postData.title.rendered || '';
    const acfFields = postData.acf || {};

    // Obtener URLs de imágenes desde ACF
    const imageFields = ['main', 'age', 'signature'];
    const imageUrls = {};

    for (const field of imageFields) {
      imageUrls[field] = await getImageUrl(acfFields[field]);
    }

    // Registrar las URLs de las imágenes
    console.info(`Post ID: ${postId} - Images:`, imageUrls);

    // Obtener el prompt correspondiente
    const prompt = await getPrompt(custom_post_type_name);

    // Generar el texto con OpenAI
    const generatedText = await generateTextWithOpenAI(prompt, postTitle, imageUrls);

    // Actualizar el metadato en WordPress
    await updateWordPressMetadata(postId, custom_post_type_name, generatedText);

    res.json({ success: true, message: `Metadata '${custom_post_type_name}' actualizado exitosamente.` });
  } catch (error) {
    console.error('Error actualizando metadata:', error);
    res.status(500).json({ success: false, message: 'Error actualizando metadata.' });
  }
});

// **Endpoint: Process Main Image with Google Vision and Update WordPress**
app.post('/process-main-image', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, message: 'postId es requerido.' });
  }

  try {
    const result = await processMainImageWithGoogleVision(postId);
    res.json(result);
  } catch (error) {
    console.error('Error en /process-main-image:', error);
    res.status(500).json({ success: false, message: error.message || 'Error procesando la imagen principal.' });
  }
});

// Iniciar el servidor después de cargar los secretos e inicializar Vision Client
loadSecrets().then(() => {
  initializeVisionClient(); // Inicializar el cliente de Vision
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
  });
});

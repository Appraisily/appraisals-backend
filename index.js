// index.js

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config(); // Cargar variables de entorno

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// Variables de entorno
const {
  PORT = 8080,
  WORDPRESS_API_URL,
  WORDPRESS_USERNAME,
  WORDPRESS_APP_PASSWORD,
  OPENAI_API_KEY
} = process.env;

// Validación de variables de entorno
if (!WORDPRESS_API_URL || !WORDPRESS_USERNAME || !WORDPRESS_APP_PASSWORD || !OPENAI_API_KEY) {
  console.error('Error: Faltan variables de entorno necesarias.');
  process.exit(1);
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
  const fullPrompt = `Title: ${title}\nImages: ${JSON.stringify(imageUrls)}\n\n${prompt}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4', // Asegúrate de que el modelo soporta tus necesidades
        messages: [
          {
            role: 'system',
            content: 'You are a professional art expert.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
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
  const updateWpEndpoint = `${WORDPRESS_API_URL}/appraisals/${wpPostId}`; // Asegúrate de que el endpoint sea correcto

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

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});

const express = require('express');
const fetch = require('node-fetch');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const he = require('he');
const { format } = require('date-fns');
const config = require('./config');
const FormData = require('form-data');
const { processImageUrl } = require('./imageProcessor');

const router = express.Router();

// Initialize clients
let docs;
let drive;

// Function to initialize Google APIs
async function initializeGoogleApis() {
  try {
    const credentials = JSON.parse(config.GOOGLE_DOCS_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    const authClient = await auth.getClient();

    docs = google.docs({ version: 'v1', auth: authClient });
    drive = google.drive({ version: 'v3', auth: authClient });

    console.log('Google Docs and Drive clients initialized successfully');
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    throw error;
  }
}

// Function to insert images with compression
const insertImageAtAllPlaceholders = async (documentId, placeholder, imageUrl) => {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    const placeholderFull = `{{${placeholder}}}`;
    const placeholderLength = placeholderFull.length;
    const occurrences = [];

    // Find all placeholders in the document
    const findAllPlaceholders = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content.includes(placeholderFull)) {
              const textContent = textElement.textRun.content;
              let startIndex = textElement.startIndex;
              let index = textContent.indexOf(placeholderFull);

              while (index !== -1) {
                const placeholderStart = startIndex + index;
                const placeholderEnd = placeholderStart + placeholderLength;
                occurrences.push({ startIndex: placeholderStart, endIndex: placeholderEnd });
                index = textContent.indexOf(placeholderFull, index + placeholderLength);
              }
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              findAllPlaceholders(cell.content);
            }
          }
        }
      }
    };

    findAllPlaceholders(content);

    if (occurrences.length === 0) {
      console.warn(`No occurrences found for placeholder '{{${placeholder}}}'`);
      return;
    }

    // Process and compress the image
    let processedImageUrl = imageUrl;
    try {
      const compressedBuffer = await processImageUrl(imageUrl);
      
      const form = new FormData();
      form.append('file', compressedBuffer, `compressed-${uuidv4()}.jpg`);

      const uploadResponse = await fetch(`${config.WORDPRESS_API_URL}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${encodeURIComponent(config.WORDPRESS_USERNAME)}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error uploading compressed image: ${await uploadResponse.text()}`);
      }

      const uploadData = await uploadResponse.json();
      processedImageUrl = uploadData.source_url;
      console.log(`Compressed image uploaded: ${processedImageUrl}`);
    } catch (error) {
      console.warn(`Warning: Using original image URL. Compression failed: ${error.message}`);
    }

    // Replace placeholders with compressed image
    occurrences.sort((a, b) => b.startIndex - a.startIndex);

    const requests = [];
    for (const occ of occurrences) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: occ.startIndex,
            endIndex: occ.endIndex,
          },
        },
      });

      requests.push({
        insertInlineImage: {
          uri: processedImageUrl,
          location: {
            index: occ.startIndex,
          },
          objectSize: {
            height: { magnitude: 120, unit: 'PT' }, // Reduced from 150
            width: { magnitude: 120, unit: 'PT' }, // Reduced from 150
          },
        },
      });
    }

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests: requests,
        },
      });
      console.log(`All occurrences of placeholder '{{${placeholder}}}' replaced with compressed image`);
    }
  } catch (error) {
    console.error(`Error processing placeholder '{{${placeholder}}}':`, error);
  }
};

// Rest of your pdfGenerator.js code...
// (Keep all other existing functions)

// Export router and initialization function
module.exports = {
  router,
  initializeGoogleApis
};
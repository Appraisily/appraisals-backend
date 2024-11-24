const express = require('express');
const fetch = require('node-fetch');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const he = require('he');
const { format } = require('date-fns');
const config = require('./config');
const cors = require('cors');

const router = express.Router();

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient();

// Function to calculate dimensions preserving aspect ratio
const calculateDimensions = async (imageUrl, maxDimensions) => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Failed to fetch image metadata');
    }

    // Get image dimensions from server if available
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }

    // Since we can't get dimensions from HEAD request,
    // we'll use the maximum dimensions while preserving aspect ratio
    const aspectRatio = maxDimensions.width / maxDimensions.height;
    
    let width = maxDimensions.width;
    let height = maxDimensions.height;

    // Adjust dimensions to fit within maximum while preserving aspect ratio
    if (width / height > aspectRatio) {
      // Image is wider than target aspect ratio
      width = height * aspectRatio;
    } else {
      // Image is taller than target aspect ratio
      height = width / aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  } catch (error) {
    console.warn('Error calculating image dimensions:', error);
    // Return default dimensions if calculation fails
    return maxDimensions;
  }
};

const insertImageAtPlaceholder = async (documentId, placeholder, imageUrl) => {
  try {
    if (imageUrl) {
      // Define maximum dimensions for images (in points)
      const maxDimensions = {
        main_image: { width: 400, height: 300 },
        signature_image: { width: 200, height: 150 },
        age_image: { width: 300, height: 200 }
      };

      // Determine which dimensions to use based on placeholder
      let dimensions = { width: 200, height: 150 }; // Default dimensions
      const placeholderType = placeholder.toLowerCase();
      
      if (placeholderType.includes('main')) {
        dimensions = await calculateDimensions(imageUrl, maxDimensions.main_image);
      } else if (placeholderType.includes('signature')) {
        dimensions = await calculateDimensions(imageUrl, maxDimensions.signature_image);
      } else if (placeholderType.includes('age')) {
        dimensions = await calculateDimensions(imageUrl, maxDimensions.age_image);
      } else {
        dimensions = await calculateDimensions(imageUrl, dimensions);
      }

      await insertImageAtAllPlaceholders(documentId, placeholder, imageUrl, dimensions);
      console.log(`Placeholder '{{${placeholder}}}' replaced with resized image: ${imageUrl}`);
    } else {
      console.warn(`Invalid image URL for placeholder '{{${placeholder}}}'.`);
    }
  } catch (error) {
    console.warn(`Warning: Could not insert image for placeholder '{{${placeholder}}}'. Error: ${error.message}`);
  }
};

const insertImageAtAllPlaceholders = async (documentId, placeholder, imageUrl, dimensions) => {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;

    const placeholderFull = `{{${placeholder}}}`;
    const placeholderLength = placeholderFull.length;
    const occurrences = [];

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
      console.warn(`No occurrences found for placeholder '{{${placeholder}}}'.`);
      return;
    }

    console.log(`Found ${occurrences.length} occurrences of placeholder '{{${placeholder}}}'.`);

    // Sort occurrences in reverse order
    occurrences.sort((a, b) => b.startIndex - a.startIndex);

    // Prepare batch update requests
    const requests = [];

    for (const occ of occurrences) {
      // Delete placeholder
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: occ.startIndex,
            endIndex: occ.endIndex,
          },
        },
      });

      // Insert image with calculated dimensions
      requests.push({
        insertInlineImage: {
          uri: imageUrl,
          location: {
            index: occ.startIndex,
          },
          objectSize: {
            height: { magnitude: dimensions.height, unit: 'PT' },
            width: { magnitude: dimensions.width, unit: 'PT' },
          },
        },
      });
    }

    // Execute batch update
    if (requests.length > 0) {
      try {
        await docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: requests,
          },
        });
        console.log(`All occurrences of placeholder '{{${placeholder}}}' have been replaced with the resized image.`);
      } catch (error) {
        console.warn(`Warning: Could not insert image for placeholder '{{${placeholder}}}'. Error: ${error.message}`);
      }
    } else {
      console.warn(`No requests found to replace placeholder '{{${placeholder}}}'.`);
    }
  } catch (error) {
    console.error(`Error processing placeholder '{{${placeholder}}}':`, error);
  }
};

// Generic function to get a secret from Secret Manager
async function getSecret(secretName) {
  try {
    const projectId = 'civil-forge-403609';
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const [version] = await secretClient.accessSecretVersion({ name: secretPath });
    const payload = version.payload.data.toString('utf8');
    console.log(`Secret '${secretName}' retrieved successfully.`);
    return payload;
  } catch (error) {
    console.error(`Error getting secret '${secretName}':`, error);
    throw new Error(`Could not get secret '${secretName}'.`);
  }
}

// Initialize Google APIs client
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

    console.log('Google Docs and Drive clients initialized successfully.');
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    throw error;
  }
}

// Function to move file to specific folder in Google Drive
async function moveFileToFolder(fileId, folderId) {
  try {
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents',
      supportsAllDrives: true,
    });

    const previousParents = file.data.parents.join(',');

    await drive.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: previousParents,
      supportsAllDrives: true,
      fields: 'id, parents',
    });

    console.log(`File ${fileId} moved to folder ${folderId}`);
  } catch (error) {
    console.error('Error moving file:', error);
    throw new Error('Error moving file.');
  }
}

// Function to upload PDF to Google Drive
async function uploadPDFToDrive(pdfBuffer, pdfFilename, folderId) {
  try {
    const fileMetadata = {
      name: pdfFilename,
      parents: [folderId],
      mimeType: 'application/pdf',
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    console.log(`PDF uploaded to Google Drive with ID: ${file.data.id}`);
    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading PDF to Google Drive:', error);
    throw new Error('Error uploading PDF to Google Drive.');
  }
}

// Export router and initialization function
module.exports = { router, initializeGoogleApis };
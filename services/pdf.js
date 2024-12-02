const express = require('express');
const cors = require('cors');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { Readable } = require('stream');
const he = require('he');
const { format } = require('date-fns');
const config = require('../config');

let docs;
let drive;

// Initialize Google APIs
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

// Insert image at placeholder
async function insertImageAtPlaceholder(documentId, placeholder, imageUrl) {
  try {
    if (!imageUrl) {
      console.warn(`No image URL provided for placeholder {{${placeholder}}}`);
      return;
    }

    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const placeholderFull = `{{${placeholder}}}`;
    const occurrences = [];

    const findPlaceholders = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes(placeholderFull)) {
              const startIndex = elem.startIndex + elem.textRun.content.indexOf(placeholderFull);
              occurrences.push({
                startIndex,
                endIndex: startIndex + placeholderFull.length
              });
            }
          }
        }
      }
    };

    findPlaceholders(content);

    if (occurrences.length === 0) {
      console.warn(`No occurrences found for placeholder {{${placeholder}}}`);
      return;
    }

    const requests = [];
    for (const occurrence of occurrences) {
      requests.push(
        {
          deleteContentRange: {
            range: {
              startIndex: occurrence.startIndex,
              endIndex: occurrence.endIndex
            }
          }
        },
        {
          insertInlineImage: {
            location: {
              index: occurrence.startIndex
            },
            uri: imageUrl,
            objectSize: {
              height: { magnitude: 150, unit: 'PT' },
              width: { magnitude: 150, unit: 'PT' }
            }
          }
        }
      );
    }

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    console.log(`Replaced ${occurrences.length} occurrences of {{${placeholder}}} with image`);
  } catch (error) {
    console.error(`Error inserting image for placeholder {{${placeholder}}}:`, error);
    throw error;
  }
}

// Add gallery images
async function addGalleryImages(documentId, gallery) {
  try {
    console.log('Starting gallery image insertion:', gallery.length, 'images');
    
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let galleryIndex = -1;

    // Find gallery placeholder
    const findGalleryPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes('{{gallery}}')) {
              galleryIndex = elem.startIndex;
              return true;
            }
          }
        }
      }
      return false;
    };

    findGalleryPlaceholder(content);

    if (galleryIndex === -1) {
      console.warn('Gallery placeholder not found');
      return;
    }

    // Delete gallery placeholder
    const requests = [{
      deleteContentRange: {
        range: {
          startIndex: galleryIndex,
          endIndex: galleryIndex + '{{gallery}}'.length
        }
      }
    }];

    // Insert section title
    requests.push({
      insertText: {
        location: { index: galleryIndex },
        text: "Similar Artworks\n"
      }
    });

    // Style section title
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: galleryIndex,
          endIndex: galleryIndex + "Similar Artworks\n".length
        },
        paragraphStyle: {
          alignment: 'CENTER',
          namedStyleType: 'HEADING_3'
        },
        fields: 'alignment,namedStyleType'
      }
    });

    // Insert images with spacing
    let currentIndex = galleryIndex + "Similar Artworks\n".length;
    
    for (let i = 0; i < gallery.length; i++) {
      // Add image
      requests.push({
        insertInlineImage: {
          location: { index: currentIndex },
          uri: gallery[i],
          objectSize: {
            height: { magnitude: 150, unit: 'PT' },
            width: { magnitude: 150, unit: 'PT' }
          }
        }
      });

      // Add spacing after image
      requests.push({
        insertText: {
          location: { index: currentIndex + 1 },
          text: '   '  // 3 spaces for horizontal spacing
        }
      });

      // Add line break after every 3 images
      if ((i + 1) % 3 === 0) {
        requests.push({
          insertText: {
            location: { index: currentIndex + 4 },
            text: '\n\n'  // Double line break for vertical spacing
          }
        });
        currentIndex += 6;  // Account for image + spaces + line breaks
      } else {
        currentIndex += 4;  // Account for image + spaces
      }
    }

    // Execute all requests
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    console.log(`Successfully inserted ${gallery.length} images in grid layout`);
  } catch (error) {
    console.error('Error adding gallery images:', error);
    throw error;
  }
}

// Clone template document
async function cloneTemplate(templateId) {
  try {
    const sanitizedTemplateId = templateId.trim();
    console.log(`Cloning template with ID: '${sanitizedTemplateId}'`);

    const copiedFile = await drive.files.copy({
      fileId: sanitizedTemplateId,
      requestBody: {
        name: `Informe_Tasacion_${uuidv4()}`,
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });

    console.log(`Template cloned with ID: ${copiedFile.data.id}`);
    return { id: copiedFile.data.id, link: copiedFile.data.webViewLink };
  } catch (error) {
    console.error('Error cloning Google Docs template:', error);
    throw error;
  }
}

// Move file to folder
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
    throw error;
  }
}

// Replace placeholders in document
async function replacePlaceholdersInDocument(documentId, data) {
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
      console.log(`Placeholders replaced in document ID: ${documentId}`);
    } else {
      console.log('No placeholders found to replace.');
    }
  } catch (error) {
    console.error('Error replacing placeholders:', error);
    throw error;
  }
}

// Adjust title font size
async function adjustTitleFontSize(documentId, titleText) {
  try {
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let titleRange = null;

    const titleRegex = new RegExp(titleText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const findTitleInElements = (elements) => {
      for (const element of elements) {
        if (element.paragraph && element.paragraph.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun && elem.textRun.content.trim().match(titleRegex)) {
              titleRange = {
                startIndex: elem.startIndex,
                endIndex: elem.endIndex,
              };
              return true;
            }
          }
        }
      }
      return false;
    };

    findTitleInElements(content);

    if (!titleRange) {
      console.warn('Title not found for font size adjustment.');
      return;
    }

    let fontSize;
    if (titleText.length <= 20) {
      fontSize = 18;
    } else if (titleText.length <= 40) {
      fontSize = 16;
    } else {
      fontSize = 14;
    }

    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [{
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
        }],
      },
    });

    console.log(`Title font size adjusted to ${fontSize}pt`);
  } catch (error) {
    console.error('Error adjusting title font size:', error);
    throw error;
  }
}

// Export to PDF
async function exportToPDF(documentId) {
  try {
    const response = await drive.files.export(
      {
        fileId: documentId,
        mimeType: 'application/pdf',
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

// Upload PDF to Drive
async function uploadPDFToDrive(pdfBuffer, filename, folderId) {
  try {
    const fileMetadata = {
      name: filename,
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

    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

module.exports = {
  initializeGoogleApis,
  insertImageAtPlaceholder,
  addGalleryImages,
  cloneTemplate,
  moveFileToFolder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize,
  exportToPDF,
  uploadPDFToDrive
};
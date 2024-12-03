const { google } = require('googleapis');
const fetch = require('node-fetch');
const config = require('../../config');

async function getTemplateId(drive, postId) {
  try {
    // Get the appraisal type from column B
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post data: ${await response.text()}`);
    }

    const data = await response.json();
    const appraisalType = data.acf?.appraisal_type;

    console.log(`Appraisal type for post ${postId}:`, appraisalType);

    // Check if it's a TaxArt service
    if (appraisalType === 'TaxArt') {
      const templateId = process.env.GOOGLE_DOCS_TEMPLATE_TAX_ID;
      console.log('Using TaxArt template:', templateId);
      return templateId;
    }

    // Default template for other types
    const defaultTemplateId = process.env.GOOGLE_DOCS_TEMPLATE_ID;
    console.log('Using default template:', defaultTemplateId);
    return defaultTemplateId;
  } catch (error) {
    console.error('Error determining template ID:', error);
    throw error;
  }
}

async function cloneTemplate(drive, templateId) {
  try {
    if (!templateId || typeof templateId !== 'string') {
      throw new Error('Invalid template ID provided');
    }

    const sanitizedTemplateId = templateId.trim();
    console.log(`Cloning template with ID: '${sanitizedTemplateId}'`);

    const copiedFile = await drive.files.copy({
      fileId: sanitizedTemplateId,
      requestBody: {
        name: `Informe_Tasacion_${new Date().toISOString()}`,
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

async function moveFileToFolder(drive, fileId, folderId) {
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

async function replacePlaceholdersInDocument(docs, documentId, data) {
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
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (cell.content) {
                findAndReplace(cell.content);
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

async function adjustTitleFontSize(docs, documentId, titleText) {
  try {
    if (!titleText) {
      console.warn('No title text provided for font size adjustment.');
      return;
    }

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
        } else if (element.table) {
          for (const row of element.table.tableRows) {
            for (const cell of row.tableCells) {
              if (findTitleInElements(cell.content)) {
                return true;
              }
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

module.exports = {
  getTemplateId,
  cloneTemplate,
  moveFileToFolder,
  replacePlaceholdersInDocument,
  adjustTitleFontSize
};
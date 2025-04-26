// const { google } = require('googleapis'); // Remove unused google
const { getTemplateIdByType } = require('./utils/templateUtils');

async function getTemplateId(serviceType) {
  try {
    return getTemplateIdByType(serviceType);
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
        name: `Appraisal_Report_${new Date().toISOString()}`,
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

// Import the formatters
const { buildAppraisalCard, buildStatisticsSection } = require('./formatters');

async function replacePlaceholdersInDocument(docs, documentId, data) {
  try {
    console.log('Starting placeholder replacement');
    console.log('Checking for appraisal_value:', data.appraisal_value);
    
    // Process special container placeholders first
    await handleContainerPlaceholders(docs, documentId, data);
    
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    const requests = [];

    const findAndReplace = (elements) => {
      for (const element of elements) {
        console.log('Processing element:', element.paragraph ? 'paragraph' : element.table ? 'table' : 'other');
        if (element.paragraph && element.paragraph.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun && textElement.textRun.content) {
              for (const [key, value] of Object.entries(data)) {
                // Skip special objects like statistics
                if (typeof value === 'object' && value !== null) {
                  continue;
                }
                
                const placeholder = `{{${key}}}`;
                
                // Special logging for appraisal value
                if (key === 'appraisal_value' && textElement.textRun.content.includes(placeholder)) {
                  console.log('Found appraisal_value placeholder, replacing with:', value);
                }
                
                if (textElement.textRun.content.includes(placeholder)) {
                  console.log(`Found placeholder: ${placeholder}`);
                  
                  // Format value with special handling for specific fields
                  let cleanValue;
                  
                  // Special handling for summary fields that may contain structured data
                  if (key.endsWith('_summary') && value && value.includes(':')) {
                    cleanValue = formatSummaryField(value);
                  } else {
                    cleanValue = value !== undefined && value !== null 
                      ? String(value)
                          .replace(/\n/g, '\n\n')  // Convert single newlines to double
                          .replace(/\s+/g, ' ')    // Normalize whitespace
                          .trim()
                      : '';
                  }
                  
                  console.log(`Replacing with cleaned value (first 100 chars): ${cleanValue.substring(0, 100)}`);
                  requests.push({
                    replaceAllText: {
                      containsText: {
                        text: placeholder,
                        matchCase: true,
                      },
                      replaceText: cleanValue,
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
        requestBody: { requests },
      });
      console.log(`${requests.length} placeholders replaced in document ID: ${documentId}`);
    } else {
      console.log('No placeholders found to replace.');
    }
  } catch (error) {
    console.error('Error replacing placeholders:', error);
    throw error;
  }
}

/**
 * Format a summary field that contains key:value pairs or structured data
 * @param {string} text - Summary text with potential key-value pairs
 * @returns {string} - Formatted HTML
 */
function formatSummaryField(text) {
  // If it doesn't contain key-value pairs, return as is
  if (!text.includes(':')) {
    return text;
  }
  
  try {
    // Check if it starts with a dash suggesting it's already formatted as a list
    if (text.trim().startsWith('-')) {
      // Split by dashes, clean up each item and create a bullet list
      const items = text.split('-').filter(item => item.trim().length > 0);
      
      if (items.length === 0) return text;
      
      return items.map(item => `• ${item.trim()}`).join('\n\n');
    }
    
    // Check if it contains key-value pairs
    // Common formats:
    // 1. Key: Value
    // 2. - Key: Value
    // 3. Key_Name: Value
    
    // Split by line breaks or dashes
    const lines = text.split(/[\n\r-]/).map(line => line.trim()).filter(line => line);
    
    const formattedItems = lines.map(line => {
      // See if it's a key-value pair (contains a colon)
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim()
          .replace(/_/g, ' ') // Replace underscores with spaces
          .replace(/([A-Z])/g, ' $1') // Add spaces before uppercase letters
          .trim();
        
        const value = line.substring(colonIndex + 1).trim();
        
        // Format as bold key with normal value
        return `<strong>${key}:</strong> ${value}`;
      }
      return line; // No colon, return as is
    });
    
    // Join with line breaks between items
    return formattedItems.join('\n\n');
  } catch (error) {
    console.warn('Error formatting summary field:', error);
    return text; // Return original on error
  }
}

/**
 * Handle special container placeholders that require custom formatted content
 */
async function handleContainerPlaceholders(docs, documentId, data) {
  try {
    console.log('Processing container placeholders...');
    
    // Find and replace the appraisal card placeholder
    try {
      console.log('Replacing appraisal_card placeholder...');
      const appraisalCardContent = buildAppraisalCard(data);
      
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [{
            replaceAllText: {
              containsText: {
                text: '{{appraisal_card}}',
                matchCase: true,
              },
              replaceText: appraisalCardContent,
            },
          }],
        },
      });
      console.log('Appraisal card placeholder replaced successfully');
    } catch (error) {
      console.error('Error replacing appraisal card placeholder:', error);
    }
    
    // Find and replace the statistics section placeholder
    try {
      if (data.statistics) {
        console.log('Replacing statistics_section placeholder...');
        // Pass statistics, justification, and the full metadata to the formatter
        const statisticsSectionContent = buildStatisticsSection(
          data.statistics,
          data.justification || {},
          data // Pass the full metadata object
        );
        
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              replaceAllText: {
                containsText: {
                  text: '{{statistics_section}}',
                  matchCase: true,
                },
                replaceText: statisticsSectionContent,
              },
            }],
          },
        });
        console.log('Statistics section placeholder replaced successfully');
      } else {
        console.log('No statistics data available, replacing statistics_section with empty content');
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              replaceAllText: {
                containsText: {
                  text: '{{statistics_section}}',
                  matchCase: true,
                },
                replaceText: '',
              },
            }],
          },
        });
      }
    } catch (error) {
      console.error('Error replacing statistics section placeholder:', error);
    }
    
    console.log('Container placeholders processing completed');
    return true;
  } catch (error) {
    console.error('Error handling container placeholders:', error);
    return false;
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
  handleContainerPlaceholders,
  adjustTitleFontSize
};
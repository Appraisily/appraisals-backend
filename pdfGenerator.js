// Previous imports remain the same
const { processImageUrl } = require('./imageProcessor');

// ... (previous code remains the same until insertImageAtAllPlaceholders function)

const insertImageAtAllPlaceholders = async (documentId, placeholder, imageUrl) => {
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
      console.warn(`No se encontraron ocurrencias del placeholder '{{${placeholder}}}'.`);
      return;
    }

    console.log(`Se encontraron ${occurrences.length} ocurrencias del placeholder '{{${placeholder}}}'.`);

    // Process and compress the image before insertion
    let processedImageUrl = imageUrl;
    try {
      const compressedBuffer = await processImageUrl(imageUrl);
      
      // Create a temporary FormData to upload the compressed image
      const form = new FormData();
      form.append('file', compressedBuffer, `compressed-${uuidv4()}.jpg`);

      // Upload the compressed image to WordPress
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
      console.log(`Compressed image uploaded successfully: ${processedImageUrl}`);
    } catch (error) {
      console.warn(`Warning: Could not compress/upload image. Using original URL. Error: ${error.message}`);
      // Continue with original URL if compression fails
    }

    // Sort occurrences from highest to lowest index
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
            height: { magnitude: 150, unit: 'PT' },
            width: { magnitude: 150, unit: 'PT' },
          },
        },
      });
    }

    if (requests.length > 0) {
      try {
        await docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: requests,
          },
        });
        console.log(`Todas las ocurrencias del placeholder '{{${placeholder}}}' han sido reemplazadas con la imagen.`);
      } catch (error) {
        console.warn(`Advertencia: No se pudo insertar la imagen para el placeholder '{{${placeholder}}}'. Error: ${error.message}`);
      }
    } else {
      console.warn(`No se encontraron solicitudes para reemplazar el placeholder '{{${placeholder}}}'.`);
    }
  } catch (error) {
    console.error(`Error procesando el placeholder '{{${placeholder}}}':`, error);
  }
};

// ... (rest of the file remains exactly the same)
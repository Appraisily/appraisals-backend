const { createTable } = require('./createTable');
const { applyTableStyles } = require('./styleTable');
const { insertTableImages } = require('./insertImages');

async function processGalleryTable(docs, documentId, galleryIndex, gallery) {
  try {
    // Calculate table dimensions
    const columns = 3;
    const rows = Math.ceil(gallery.length / columns);
    
    console.log(`Processing gallery table with ${rows} rows and ${columns} columns`);
    console.log(`Total images: ${gallery.length}`);

    // Create table
    const tableElement = await createTable(docs, documentId, galleryIndex, rows, columns);

    // Apply styles
    await applyTableStyles(docs, documentId, tableElement);

    // Insert images
    const insertedImages = await insertTableImages(docs, documentId, tableElement, gallery);

    console.log(`Gallery table processing complete. Inserted ${insertedImages} images.`);
    return insertedImages;
  } catch (error) {
    console.error('Error processing gallery table:', error);
    throw error;
  }
}

module.exports = {
  processGalleryTable,
  createTable,
  applyTableStyles,
  insertTableImages
};
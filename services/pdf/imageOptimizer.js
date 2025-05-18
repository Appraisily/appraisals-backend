/**
 * Image optimization service for PDF generation
 * Provides various strategies for optimizing images before insertion into documents
 */

const sharp = require('sharp');
const fetch = require('node-fetch');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

// Cache directory for optimized images
const CACHE_DIR = path.join(__dirname, '../../../.cache/optimized-images');

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await mkdirAsync(CACHE_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error(`Error creating cache directory: ${error.message}`);
    }
  }
}

/**
 * Generate a unique hash for a URL and optimization parameters
 */
function generateCacheKey(url, width, height, quality) {
  const hash = createHash('md5');
  hash.update(`${url}|${width}|${height}|${quality}`);
  return hash.digest('hex');
}

/**
 * Check if an image is cached
 */
async function isImageCached(cacheKey) {
  try {
    await readFileAsync(path.join(CACHE_DIR, cacheKey));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch image from URL
 */
async function fetchImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  return response.buffer();
}

/**
 * Optimize image with sharp
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Optimization options
 */
async function optimizeWithSharp(buffer, options = {}) {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'jpeg'
  } = options;
  
  // Create a sharp instance
  let image = sharp(buffer);
  
  // Get metadata
  const metadata = await image.metadata();
  
  // Resize
  image = image.resize({
    width,
    height,
    fit: 'inside',
    withoutEnlargement: true
  });
  
  // Format and quality
  if (format === 'jpeg' || format === 'jpg') {
    image = image.jpeg({ quality });
  } else if (format === 'png') {
    image = image.png({ quality: Math.min(100, quality + 20) });
  } else if (format === 'webp') {
    image = image.webp({ quality });
  }
  
  // Generate optimized buffer
  return image.toBuffer();
}

/**
 * Optimize an image by URL
 * @param {string} url - Image URL
 * @param {Object} options - Optimization options
 */
async function optimizeImage(url, options = {}) {
  if (!url || typeof url !== 'string') {
    console.warn('Invalid image URL provided for optimization');
    return url;
  }
  
  try {
    // Ensure cache directory exists
    await ensureCacheDir();
    
    // Default options
    const {
      width = 800,
      height = 600,
      quality = 80,
      format = 'jpeg',
      useCache = true
    } = options;
    
    // Generate cache key
    const cacheKey = generateCacheKey(url, width, height, quality);
    const cacheFilePath = path.join(CACHE_DIR, cacheKey);
    
    // Check cache first
    if (useCache && await isImageCached(cacheKey)) {
      console.log(`Using cached optimized image for: ${url}`);
      // In a real implementation, you would return a URL to this cached file
      return url;
    }
    
    console.log(`Optimizing image: ${url}`);
    
    // Fetch image
    const buffer = await fetchImage(url);
    const originalSize = buffer.length;
    
    // Optimize
    const optimizedBuffer = await optimizeWithSharp(buffer, {
      width,
      height,
      quality,
      format
    });
    
    const optimizedSize = optimizedBuffer.length;
    const percentReduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
    
    console.log(`Image optimized: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percentReduction}% reduction)`);
    
    // Cache the optimized image
    if (useCache) {
      try {
        await writeFileAsync(cacheFilePath, optimizedBuffer);
        console.log(`Cached optimized image as: ${cacheKey}`);
      } catch (error) {
        console.error(`Error caching optimized image: ${error.message}`);
      }
    }
    
    // In a real implementation, you would upload this buffer somewhere and return the URL
    // For now, we'll just return the original URL
    return url;
  } catch (error) {
    console.error(`Error optimizing image: ${error.message}`);
    return url; // Return original URL on error
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get optimization options based on image type
 * @param {string} type - Image type (main, signature, age, gallery)
 */
function getOptimizationOptions(type) {
  switch (type) {
    case 'main':
      return {
        width: 800,
        height: 600,
        quality: 85,
        format: 'jpeg'
      };
    case 'signature':
    case 'age':
      return {
        width: 400,
        height: 300,
        quality: 80,
        format: 'jpeg'
      };
    case 'gallery':
      return {
        width: 300,
        height: 225,
        quality: 75,
        format: 'jpeg'
      };
    default:
      return {
        width: 600,
        height: 450,
        quality: 80,
        format: 'jpeg'
      };
  }
}

/**
 * Optimize all images in a collection
 * @param {Object} images - Collection of images by type
 * @returns {Promise<Object>} - Optimized images
 */
async function optimizeAllImages(images) {
  if (!images || typeof images !== 'object') {
    return images;
  }
  
  const optimizedImages = { ...images };
  const optimizationPromises = [];
  
  // Process each image type
  for (const [type, url] of Object.entries(images)) {
    if (url && typeof url === 'string') {
      // Skip gallery (handled separately)
      if (type === 'gallery') continue;
      
      const options = getOptimizationOptions(type);
      optimizationPromises.push(
        optimizeImage(url, options)
          .then(optimizedUrl => {
            optimizedImages[type] = optimizedUrl;
          })
          .catch(error => {
            console.error(`Error optimizing ${type} image: ${error.message}`);
          })
      );
    }
  }
  
  // Handle gallery (array of images)
  if (Array.isArray(images.gallery)) {
    const galleryOptions = getOptimizationOptions('gallery');
    const optimizedGallery = [];
    
    for (const url of images.gallery) {
      if (url && typeof url === 'string') {
        optimizationPromises.push(
          optimizeImage(url, galleryOptions)
            .then(optimizedUrl => {
              optimizedGallery.push(optimizedUrl);
            })
            .catch(error => {
              console.error(`Error optimizing gallery image: ${error.message}`);
              optimizedGallery.push(url); // Keep original on error
            })
        );
      }
    }
    
    // Wait for all gallery optimizations to complete
    await Promise.all(optimizationPromises);
    optimizedImages.gallery = optimizedGallery;
  }
  
  return optimizedImages;
}

module.exports = {
  optimizeImage,
  optimizeAllImages,
  getOptimizationOptions
}; 
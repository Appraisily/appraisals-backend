const client = require('./client');

async function fetchPostData(postId) {
  console.log('Fetching complete post data for:', postId);
  
  // Get all data in a single request including ACF fields and media
  const postData = await client.getPost(postId, [
    'acf',
    'title',
    'date',
    '_links',
    '_embedded'
  ], {
    _embed: 'wp:featuredmedia,wp:term'
  });

  console.log('Post data retrieved successfully');

  // Extract image URLs from embedded media
  const images = {
    main: extractImageUrl(postData.acf?.main),
    age: extractImageUrl(postData.acf?.age),
    signature: extractImageUrl(postData.acf?.signature),
    gallery: extractGalleryUrls(postData.acf?.googlevision)
  };

  return {
    postData,
    images,
    title: postData.title?.rendered || '',
    date: new Date(postData.date).toISOString().split('T')[0]
  };
}

function extractImageUrl(mediaField) {
  if (!mediaField) return null;
  
  // Handle different media field formats
  if (typeof mediaField === 'string' && mediaField.startsWith('http')) {
    return mediaField;
  }
  if (typeof mediaField === 'object' && mediaField.url) {
    return mediaField.url;
  }
  if (typeof mediaField === 'number' && mediaField > 0) {
    return `_wp_attached_file_${mediaField}`;
  }
  
  return null;
}

function extractGalleryUrls(galleryField) {
  if (!Array.isArray(galleryField)) return [];
  
  return galleryField
    .map(item => extractImageUrl(item))
    .filter(url => url !== null);
}

module.exports = {
  fetchPostData
};
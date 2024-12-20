const { getPost, getMedia } = require('./client');
const { parseDate } = require('./utils/dateUtils');

async function fetchPostData(postId) {
  console.log('Fetching complete post data for:', postId);
  
  // Get all data in a single request including ACF fields and media
  const postData = await getPost(postId, [
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
  const images = await extractImages(postData.acf);

  return {
    postData,
    images,
    title: postData.title?.rendered || '',
    date: parseDate(postData.date)
  };
}

async function extractImages(acf) {
  if (!acf) return {};

  // Get media URLs in parallel
  const [main, age, signature] = await Promise.all([
    getMediaUrl(acf.main),
    getMediaUrl(acf.age),
    getMediaUrl(acf.signature)
  ]);

  // Get gallery URLs
  const gallery = Array.isArray(acf.googlevision) 
    ? await Promise.all(acf.googlevision.map(id => getMediaUrl(id)))
    : [];

  return {
    main,
    age,
    signature,
    gallery: gallery.filter(url => url !== null)
  };
}

async function getMediaUrl(mediaId) {
  if (!mediaId) return null;

  // If it's already a URL, return it
  if (typeof mediaId === 'string' && mediaId.startsWith('http')) {
    return mediaId;
  }

  try {
    // Get media data from WordPress
    const media = await getMedia(mediaId);
    return media?.source_url || null;
  } catch (error) {
    console.warn(`Failed to get media URL for ID ${mediaId}:`, error.message);
    return null;
  }
}

module.exports = {
  fetchPostData
};
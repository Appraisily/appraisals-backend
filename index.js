// index.js
// ... (previous imports remain the same)

async function getImageUrl(mediaId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/media/${mediaId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      console.error(`Error fetching media ${mediaId}:`, await response.text());
      return null;
    }

    const media = await response.json();
    return media.source_url || null;
  } catch (error) {
    console.error(`Error getting image URL for media ${mediaId}:`, error);
    return null;
  }
}

async function getPostDetails(postId) {
  try {
    const response = await fetch(`${config.WORDPRESS_API_URL}/appraisals/${postId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching post: ${await response.text()}`);
    }

    const post = await response.json();
    
    // Get actual image URLs
    const [mainUrl, ageUrl, signatureUrl] = await Promise.all([
      post.acf?.main ? getImageUrl(post.acf.main) : null,
      post.acf?.age ? getImageUrl(post.acf.age) : null,
      post.acf?.signature ? getImageUrl(post.acf.signature) : null
    ]);

    return {
      title: post.title.rendered,
      acf: post.acf || {},
      images: {
        main: mainUrl,
        age: ageUrl,
        signature: signatureUrl
      }
    };
  } catch (error) {
    console.error('Error getting post details:', error);
    throw error;
  }
}

// ... (rest of the file remains the same)
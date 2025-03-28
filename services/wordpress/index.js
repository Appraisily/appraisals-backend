const { getPost, getMedia, updatePost } = require('./client');
const { fetchPostData, getImageUrl } = require('./dataFetching');
const { updatePostACFFields, updateWordPressMetadata, updateNotes } = require('./updates');
const { testWordPressConnection } = require('./connectionTest');
const { testWithCurl } = require('./curlTest');
const { runNetworkDiagnostics } = require('./networkDiagnostics');

// Export all functions explicitly to avoid naming conflicts
module.exports = {
  // Client methods
  getPost,
  getMedia,
  getImageUrl,
  updatePost,
  // Data fetching
  fetchPostData,
  // Updates
  updatePostACFFields,
  updateWordPressMetadata,
  updateNotes,
  // Testing and diagnostics
  testWordPressConnection,
  testWithCurl,
  runNetworkDiagnostics
};
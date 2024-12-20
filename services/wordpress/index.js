const { getPost, getMedia, updatePost } = require('./client');
const { fetchPostData } = require('./dataFetching');
const { updatePostACFFields, updateWordPressMetadata } = require('./updates');
const { testWordPressConnection } = require('./connectionTest');
const { testWithCurl } = require('./curlTest');
const { runNetworkDiagnostics } = require('./networkDiagnostics');

// Export all functions explicitly to avoid naming conflicts
module.exports = {
  // Client methods
  getPost,
  getMedia,
  updatePost,
  // Data fetching
  fetchPostData,
  // Updates
  updatePostACFFields,
  updateWordPressMetadata,
  // Testing and diagnostics
  testWordPressConnection,
  testWithCurl,
  runNetworkDiagnostics
};
const client = require('./client');
const { fetchPostData } = require('./dataFetching');
const { updatePostACFFields } = require('./updates');
const { testWordPressConnection } = require('./connectionTest');
const { testWithCurl } = require('./curlTest');
const { runNetworkDiagnostics } = require('./networkDiagnostics');

module.exports = {
  ...client,
  fetchPostData,
  updatePostACFFields,
  testWordPressConnection,
  testWithCurl,
  runNetworkDiagnostics
};
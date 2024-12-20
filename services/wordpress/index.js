// Main WordPress service entry point
const { fetchPostData } = require('./dataFetching');
const { updatePostACFFields } = require('./updates');

module.exports = {
  fetchPostData,
  updatePostACFFields
};
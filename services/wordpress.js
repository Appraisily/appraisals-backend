// Bridge file to expose WordPress service functionality
const wordpress = require('./wordpress/index');

// Re-export all WordPress functionality
module.exports = wordpress;
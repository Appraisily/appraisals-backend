function getTemplateIdByType() {
  const templateId = process.env.GOOGLE_DOCS_TEMPLATE_ID;
  
  if (!templateId) {
    throw new Error('GOOGLE_DOCS_TEMPLATE_ID not configured in environment variables');
  }
  
  console.log('Using template ID:', templateId);
  return templateId;
}

module.exports = {
  getTemplateIdByType
};
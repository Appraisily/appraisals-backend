const TEMPLATE_TYPES = {
  TAXART: 'TaxArt',
  DEFAULT: 'default'
};

function getTemplateIdByType(serviceType) {
  if (!serviceType) {
    console.log('No service type provided, using default template');
    return process.env.GOOGLE_DOCS_TEMPLATE_ID;
  }

  const normalizedType = serviceType.trim();
  
  if (normalizedType === TEMPLATE_TYPES.TAXART) {
    const templateId = process.env.GOOGLE_DOCS_TEMPLATE_TAX_ID;
    console.log('Using TaxArt template:', templateId);
    
    if (!templateId) {
      throw new Error('TaxArt template ID not configured in environment variables');
    }
    
    return templateId;
  }

  const defaultTemplateId = process.env.GOOGLE_DOCS_TEMPLATE_ID;
  console.log(`Using default template for service type "${normalizedType}":`, defaultTemplateId);
  
  if (!defaultTemplateId) {
    throw new Error('Default template ID not configured in environment variables');
  }
  
  return defaultTemplateId;
}

module.exports = {
  TEMPLATE_TYPES,
  getTemplateIdByType
};
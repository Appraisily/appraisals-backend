// Report structure and processing order
const PROMPT_PROCESSING_ORDER = [
  'test',
  'age1',
  'age2',
  'age_text',
  'authorship',
  'condition',
  'signature1',
  'signature2',
  'style',
  'valuation_method',
  'conclusion1',
  'conclusion2',
  'ad_copy',
  'table',
  'glossary'
];

const REPORT_INTRODUCTION = `
You are helping to complete an art appraisal report. This report will consist of several sections that together form a comprehensive analysis of an artwork. As you generate each section, you will have access to the previously generated content to maintain consistency and avoid repetition.

Report Structure:
1. Initial Analysis (test) - Basic artwork type and characteristics
2. Age Analysis (age1, age2, age_text) - Detailed examination of the artwork's age
3. Authorship Analysis (authorship) - Artist identification and verification
4. Condition Assessment (condition) - Current state and preservation
5. Signature Analysis (signature1, signature2) - Authentication through signature
6. Style Analysis (style) - Artistic style and historical context
7. Valuation Method (valuation_method) - Methodology used for appraisal
8. Conclusions (conclusion1, conclusion2) - Final assessment
9. Marketing Description (ad_copy) - Engaging description for potential buyers
10. Technical Details (table) - Structured artwork specifications
11. Art Terms (glossary) - Relevant terminology explained

Guidelines:
- Each section builds upon previous content
- Maintain consistency across all sections
- Avoid repeating information already covered
- Focus on unique aspects for each section
- Use formal, professional language throughout
`;

module.exports = {
  PROMPT_PROCESSING_ORDER,
  REPORT_INTRODUCTION
};
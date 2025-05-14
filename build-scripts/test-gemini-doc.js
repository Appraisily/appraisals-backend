/**
 * Test script for Gemini document generation
 * 
 * Usage:
 *   npm run test-gemini-doc -- --post-id <id> [--format docs|pdf] [--output file.pdf] [--compare]
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

program
  .option('-p, --post-id <id>', 'WordPress post ID')
  .option('-f, --format <format>', 'Output format (docs or pdf)', 'docs')
  .option('-o, --output <path>', 'Output file path for PDF')
  .option('-c, --compare', 'Compare with traditional generation', false)
  .option('-u, --api-url <url>', 'API endpoint URL', 'http://localhost:8080/api/gemini-docs/generate')
  .option('-t, --test', 'Run in test mode', false)
  .parse(process.argv);

const options = program.opts();

if (!options.postId) {
  console.error('Error: Post ID is required');
  console.error('Usage: npm run test-gemini-doc -- --post-id <id> [--format docs|pdf] [--output file.pdf] [--compare]');
  process.exit(1);
}

async function testGeminiDoc() {
  try {
    console.log(`Generating ${options.format} document for post ${options.postId} in ${options.test ? 'test' : 'normal'} mode`);
    
    // Call the API
    const endpoint = `${options.apiUrl}/${options.postId}?format=${options.format}&test=${options.test}`;
    console.log(`Calling API endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Response: ${errorText}`);
      process.exit(1);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      console.error('Error:', result.message);
      if (result.error) {
        console.error('Details:', result.error);
      }
      process.exit(1);
    }
    
    console.log('');
    console.log('Document generated successfully:');
    console.log(`- Doc URL: ${result.data.documentUrl}`);
    
    if (result.data.pdfUrl) {
      console.log(`- PDF URL: ${result.data.pdfUrl}`);
      
      // Download PDF if output specified
      if (options.output) {
        console.log(`Downloading PDF to ${options.output}...`);
        const pdfResponse = await fetch(result.data.pdfUrl);
        if (!pdfResponse.ok) {
          console.error(`Error downloading PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
          process.exit(1);
        }
        
        const pdfBuffer = await pdfResponse.buffer();
        fs.writeFileSync(options.output, pdfBuffer);
        console.log('PDF downloaded successfully');
      }
    }
    
    // Compare with traditional generation if requested
    if (options.compare) {
      console.log('');
      console.log('Comparing with traditional generation...');
      const traditionalUrl = 'http://localhost:8080/api/pdf/generate-pdf-steps';
      console.log(`Calling traditional API: ${traditionalUrl}`);
      
      try {
        const traditionalResponse = await fetch(traditionalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: options.postId })
        });
        
        if (!traditionalResponse.ok) {
          console.error(`Traditional API error: ${traditionalResponse.status} ${traditionalResponse.statusText}`);
          const errorText = await traditionalResponse.text();
          console.error(`Response: ${errorText}`);
        } else {
          const traditionalResult = await traditionalResponse.json();
          
          if (!traditionalResult.success) {
            console.error('Error with traditional generation:', traditionalResult.message);
            if (traditionalResult.error) {
              console.error('Details:', traditionalResult.error);
            }
          } else {
            console.log('Traditional document generated successfully:');
            console.log(`- Traditional PDF URL: ${traditionalResult.data.pdfUrl}`);
            
            // Download traditional PDF if output specified
            if (options.output) {
              const traditionalOutputPath = path.join(
                path.dirname(options.output),
                `traditional-${path.basename(options.output)}`
              );
              
              console.log(`Downloading traditional PDF to ${traditionalOutputPath}...`);
              const tradPdfResponse = await fetch(traditionalResult.data.pdfUrl);
              
              if (!tradPdfResponse.ok) {
                console.error(`Error downloading traditional PDF: ${tradPdfResponse.status} ${tradPdfResponse.statusText}`);
              } else {
                const tradPdfBuffer = await tradPdfResponse.buffer();
                fs.writeFileSync(traditionalOutputPath, tradPdfBuffer);
                console.log('Traditional PDF downloaded successfully');
              }
            }
          }
        }
      } catch (compareError) {
        console.error('Error comparing with traditional generation:', compareError.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testGeminiDoc(); 
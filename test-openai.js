/**
 * Test script for OpenAI service with image handling
 * 
 * Run with: node test-openai.js
 */

require('dotenv').config();
const openaiService = require('./services/openai');

async function runTest() {
  try {
    console.log('=== OpenAI Service Test ===');
    console.log('Testing with a sample appraisal input');
    
    const postTitle = "Test Artwork - Landscape Painting";
    const postData = {
      acf: {
        value: "1200",
        creator: "Test Artist",
        medium: "Oil on Canvas"
      }
    };
    
    const images = {
      // Use a test image URL - replace with a valid URL for testing
      main: "https://picsum.photos/800/600",
    };
    
    const statistics = {
      average_price: 1500,
      median_price: 1200,
      price_min: 800,
      price_max: 3500,
      count: 12,
      price_trend_percentage: "+2.5%",
      data_quality: "Good - Substantial relevant market data found",
      confidence_level: "Medium-High",
      historical_significance: 65,
      investment_potential: 70,
      comparable_sales: [
        {
          title: "Similar landscape by Test Artist",
          house: "Test Auction House",
          date: "2024-03-15",
          price: 1350,
          currency: "USD",
          relevanceScore: 0.85
        },
        {
          title: "Mountain view by Test Artist",
          house: "Another Auction",
          date: "2024-01-20",
          price: 1100,
          currency: "USD",
          relevanceScore: 0.75
        }
      ]
    };
    
    // Generate a simple text first to test the API connection
    console.log('\n1. Testing basic text generation');
    const content = await openaiService.generateContent(
      "Describe this test artwork in 2-3 sentences.",
      postTitle,
      {},
      'gpt-4o',
      "You're a helpful art curator. Keep responses very brief.",
      150,
      0.7
    );
    
    console.log('\nGenerated Content:');
    console.log(content);
    
    // Test metadata generation with images
    console.log('\n2. Testing metadata generation with images');
    console.log('This will take longer as it processes images and generates structured data...');
    
    const metadata = await openaiService.generateStructuredMetadata(
      postTitle,
      postData,
      images,
      statistics
    );
    
    console.log('\nGenerated Metadata (sample):');
    console.log('Creator:', metadata.metadata?.creator);
    console.log('Medium:', metadata.metadata?.medium);
    console.log('Object Type:', metadata.metadata?.object_type);
    console.log('Condition Score:', metadata.metadata?.condition_score);
    
    console.log('\n=== Test Completed Successfully ===');
  } catch (error) {
    console.error('Test failed with error:', error);
    if (error.message && error.message.includes('OpenAI API error')) {
      try {
        const parsedError = JSON.parse(error.message.replace('OpenAI API error: ', ''));
        console.error('API Error Details:', parsedError.error);
      } catch (e) {
        console.error('Error message:', error.message);
      }
    }
  }
}

runTest(); 
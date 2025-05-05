/**
 * OpenAI Debug Script
 * 
 * This script tests the OpenAI integration with detailed debugging output
 * Run with: node test-openai-debug.js
 */

require('dotenv').config();
const openaiService = require('./services/openai');
const fs = require('fs').promises;
const path = require('path');

// Flag to control whether to use fake content for testing structure parsing
const USE_FAKE_CONTENT = false;

// Mock response that's intentionally malformed to test error handling
const MOCK_MALFORMED_RESPONSE = {
  choices: [
    {
      message: {
        content: `{ "incomplete": "json`
      }
    }
  ]
};

// Mock response with incorrect structure (missing metadata object)
const MOCK_INCORRECT_STRUCTURE = {
  choices: [
    {
      message: {
        content: `{ "data": { "creator": "Test" } }`
      }
    }
  ]
};

async function runDebugTest() {
  try {
    console.log('=== OpenAI Debug Test ===');
    console.log('Testing with detailed logging and error handling');
    
    const postTitle = "Debug Test - Landscape Painting";
    const postData = {
      acf: {
        value: "1200",
        creator: "Test Artist",
        medium: "Oil on Canvas"
      }
    };
    
    const images = {
      // Use a test image URL
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
        }
      ]
    };
    
    console.log('\n1. Testing metadata generation with all debugging enabled');
    console.log('This will log full request/response to the logs/ directory...');
    
    // Set environment to production to test fallback handling
    if (process.argv.includes('--production')) {
      process.env.NODE_ENV = 'production';
      console.log('Running in simulated production mode - fallbacks enabled');
    }

    try {
      // Default test - normal operation
      const metadata = await openaiService.generateStructuredMetadata(
        postTitle,
        postData,
        images,
        statistics
      );
      
      console.log('\nGenerated Metadata:');
      console.log(JSON.stringify(metadata, null, 2));
      
      console.log('\n=== Test Completed Successfully ===');
    } catch (error) {
      console.error('\nTest failed with error:', error);
    }
    
    // Optional: Test specific error cases
    if (process.argv.includes('--test-errors')) {
      console.log('\n2. Testing malformed JSON response handling');
      // This section would need to mock the OpenAI API to return invalid JSON
      // For now, just report that it would be tested
      console.log('(Would test error handling for invalid JSON responses)');
      
      console.log('\n3. Testing missing metadata structure handling');
      // This would test the case where the response has valid JSON but missing the expected structure
      console.log('(Would test error handling for responses with missing metadata structure)');
    }
    
    // Show logs location
    console.log('\nCheck logs/ directory for detailed request/response data');
  } catch (error) {
    console.error('Test script error:', error);
  }
}

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

runDebugTest(); 
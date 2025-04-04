/**
 * Test script for Gemini visualization integration
 * 
 * This script tests the Gemini API integration for generating
 * enhanced visualization HTML from statistics data
 */

const { 
  initializeGeminiClient,
  generateEnhancedAnalyticsWithGemini,
  generateAppraisalCardWithGemini
} = require('./services/gemini-visualization');

const fs = require('fs');

// Sample statistics data for testing
const sampleStats = {
  count: 8,
  average_price: 4850,
  median_price: 4600,
  price_min: 2500,
  price_max: 7200,
  standard_deviation: 1250,
  coefficient_of_variation: 25.8,
  percentile: "65th",
  confidence_level: "High",
  price_trend_percentage: "+6.8%",
  value: 4900,
  target_marker_position: 62,
  condition_score: 85,
  rarity: 73,
  market_demand: 68,
  historical_significance: 78,
  investment_potential: 72,
  provenance_strength: 65,
  comparable_sales: [
    { title: "Similar Item #1", house: "Christie's", date: "2023-12-15", price: 5200, diff: "+6.1%" },
    { title: "Your Item", house: "-", date: "Current", price: 4900, diff: "-", is_current: true },
    { title: "Similar Item #2", house: "Sotheby's", date: "2023-10-22", price: 4600, diff: "-6.1%" },
    { title: "Similar Item #3", house: "Phillips", date: "2023-08-05", price: 5800, diff: "+18.4%" },
    { title: "Similar Item #4", house: "Bonhams", date: "2023-05-19", price: 3900, diff: "-20.4%" }
  ],
  histogram: [
    { min: 2500, max: 3500, count: 2, height: 25, position: 0, contains_target: false },
    { min: 3500, max: 4500, count: 3, height: 37.5, position: 20, contains_target: false },
    { min: 4500, max: 5500, count: 8, height: 100, position: 40, contains_target: true },
    { min: 5500, max: 6500, count: 4, height: 50, position: 60, contains_target: false },
    { min: 6500, max: 7500, count: 1, height: 12.5, position: 80, contains_target: false }
  ]
};

// Sample appraisal data for testing
const sampleAppraisal = {
  title: "Untitled Abstract Composition",
  creator: "Richard Smith",
  object_type: "Painting",
  estimated_age: "Mid-20th Century",
  medium: "Oil on Canvas",
  condition_summary: "Very Good",
  market_demand: 68,
  rarity: 73,
  condition_score: 85,
  value: 4900,
  appraiser_name: "Andrés Gómez"
};

async function runTest() {
  try {
    console.log("Testing Gemini visualization integration");
    
    // Initialize Gemini client
    await initializeGeminiClient();
    console.log("✅ Successfully initialized Gemini client");
    
    // Generate enhanced analytics HTML
    console.log("Generating enhanced analytics HTML with Gemini...");
    const enhancedAnalyticsHtml = await generateEnhancedAnalyticsWithGemini(sampleStats);
    
    if (enhancedAnalyticsHtml && enhancedAnalyticsHtml.length > 1000) {
      console.log(`✅ Successfully generated enhanced analytics HTML (${enhancedAnalyticsHtml.length} chars)`);
      fs.writeFileSync('./test-enhanced-analytics.html', enhancedAnalyticsHtml);
      console.log("Saved to test-enhanced-analytics.html");
    } else {
      console.error("❌ Generated HTML is too short or empty");
    }
    
    // Generate appraisal card HTML
    console.log("Generating appraisal card HTML with Gemini...");
    const appraisalCardHtml = await generateAppraisalCardWithGemini(sampleAppraisal, sampleStats);
    
    if (appraisalCardHtml && appraisalCardHtml.length > 1000) {
      console.log(`✅ Successfully generated appraisal card HTML (${appraisalCardHtml.length} chars)`);
      fs.writeFileSync('./test-appraisal-card.html', appraisalCardHtml);
      console.log("Saved to test-appraisal-card.html");
    } else {
      console.error("❌ Generated HTML is too short or empty");
    }
    
    console.log("Test completed");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
runTest();
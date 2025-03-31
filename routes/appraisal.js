const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadata');
const { getClientIp } = require('request-ip');

router.post('/complete-appraisal-report', async (req, res) => {
  console.log('[Appraisal] Starting report generation');

  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn('[Appraisal] Post title not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
        details: {
          postId,
          title: null,
          visionAnalysis: null,
          processedFields: []
        }
      });
    }

    console.log(`[Appraisal] Processing: "${postTitle}"`);

    let visionResult;
    try {
      visionResult = await processMainImageWithGoogleVision(postId);
    } catch (error) {
      console.error(`[Appraisal] Vision error: ${error.message}`);
      visionResult = {
        success: false,
        message: error.message,
        similarImagesCount: 0
      };
    }

    let metadataResults;
    try {
      metadataResults = await processAllMetadata(postId, postTitle, { postData, images });
    } catch (error) {
      console.error(`[Appraisal] Metadata error: ${error.message}`);
      metadataResults = [];
    }

    // Process justification metadata
    let justificationResult;
    try {
      justificationResult = await processJustificationMetadata(
        postId,
        postTitle,
        postData.acf?.value
      );
      if (justificationResult) {
        metadataResults.push(justificationResult);
      }
    } catch (error) {
      console.error(`[Appraisal] Justification error: ${error.message}`);
      metadataResults.push({
        field: 'justification_html',
        status: 'error',
        error: error.message
      });
    }

    // Generate HTML visualizations (if not already done in processJustificationMetadata)
    let htmlResults;
    try {
      console.log(`[Appraisal] Checking if HTML visualizations already exist for: "${postTitle}"`);
      
      // Check if HTML fields already exist and are not empty
      const htmlFields = await wordpress.checkHtmlFields(postId);
      
      if (htmlFields.exists) {
        console.log('[Appraisal] HTML visualizations already exist, skipping generation');
        metadataResults.push({
          field: 'html_visualizations',
          status: 'skipped',
          message: 'HTML visualizations already generated in processJustificationMetadata'
        });
      } else {
        // Only generate HTML if not already done
        console.log(`[Appraisal] Generating HTML visualizations for: "${postTitle}"`);
        
        // Extract the statistics data
        const statisticsData = postData.acf?.statistics || {};
        
        // Prepare the appraisal data object
        const appraisalData = {
          title: postTitle,
          featured_image: images.main?.url || '',
          creator: postData.acf?.creator || '',
          object_type: postData.acf?.object_type || '',
          estimated_age: postData.acf?.estimated_age || '',
          medium: postData.acf?.medium || '',
          condition_summary: postData.acf?.condition_summary || '',
          market_demand: postData.acf?.market_demand || '',
          rarity: postData.acf?.rarity || '',
          condition_score: postData.acf?.condition_score || '',
          value: postData.acf?.value || '',
          appraiser_name: postData.acf?.appraiser_name || 'Andrés Gómez',
          // Additional fields
          artist_dates: postData.acf?.artist_dates || '',
          color_palette: postData.acf?.color_palette || '',
          style: postData.acf?.style || '',
          dimensions: postData.acf?.dimensions || '',
          framed: postData.acf?.framed || '',
          edition: postData.acf?.edition || '',
          publisher: postData.acf?.publisher || '',
          composition_description: postData.acf?.composition_description || '',
          signed: postData.acf?.signed || '',
          provenance: postData.acf?.provenance || '',
          registration_number: postData.acf?.registration_number || '',
          notes: postData.acf?.notes || '',
          coa: postData.acf?.coa || '',
          meaning: postData.acf?.meaning || ''
        };

        // Check if statistics data is a string and try to parse it
        let parsedStatistics = statisticsData;
        if (typeof statisticsData === 'string') {
          try {
            // Clean the input before parsing to handle WordPress stored data
            let cleanedData = statisticsData;
            
            // Replace PHP-style array notation
            if (cleanedData.includes('=>')) {
              console.log('[Appraisal] Detected PHP array notation, attempting conversion');
              cleanedData = cleanedData.replace(/(\w+)\s*=>\s*/gi, '"$1":');
              cleanedData = cleanedData.replace(/'([^']+)':/gi, '"$1":');
            }
            
            // Replace smart quotes and other problematic characters
            cleanedData = cleanedData
              .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
              .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
              .replace(/\u00A0/g, ' ')         // Replace non-breaking spaces
              .replace(/\u2022/g, '-')         // Replace bullet points
              .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
              
            // Fix common JSON syntax issues
            cleanedData = cleanedData
              .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
              .replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
            
            // Try to parse the cleaned data
            try {
              parsedStatistics = JSON.parse(cleanedData);
              console.log('[Appraisal] Successfully parsed cleaned statistics data');
            } catch (cleanedError) {
              // If still failing, try with stripslashes (WordPress standard)
              try {
                const strippedData = cleanedData.replace(/\\/g, '');
                parsedStatistics = JSON.parse(strippedData);
                console.log('[Appraisal] Successfully parsed stripped statistics data');
              } catch (strippedError) {
                // If all parsing attempts fail, log details for debugging
                console.warn('[Appraisal] Could not parse statistics data as JSON:', cleanedError.message);
                console.log('[Appraisal] First 100 chars of statistics data:', statisticsData.substring(0, 100));
                // Continue with original data as fallback
              }
            }
          } catch (error) {
            console.warn('[Appraisal] Error during statistics data cleaning:', error.message);
            console.log('[Appraisal] First 100 chars of statistics data:', statisticsData.substring(0, 100));
          }
        }

        // Update the HTML fields in WordPress
        await wordpress.updateHtmlFields(postId, appraisalData, parsedStatistics);
        
        // Add HTML generation result to metadata results
        metadataResults.push({
          field: 'enhanced_analytics_html',
          status: 'success',
          message: 'HTML visualizations generated successfully'
        });
        
        metadataResults.push({
          field: 'appraisal_card_html',
          status: 'success',
          message: 'HTML visualizations generated successfully'
        });
        
        console.log('[Appraisal] HTML visualization generation complete');
      }
    } catch (error) {
      console.error(`[Appraisal] HTML generation error: ${error.message}`);
      metadataResults.push({
        field: 'html_visualizations',
        status: 'error',
        error: error.message
      });
    }

    console.log('[Appraisal] Report generation complete');

    res.status(200).json({
      success: true,
      message: 'Appraisal report completed successfully.',
      details: {
        postId,
        title: postTitle,
        visionAnalysis: visionResult,
        processedFields: metadataResults
      }
    });
  } catch (error) {
    console.error(`[Appraisal] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Error completing appraisal report.',
      details: {
        postId,
        error: error.message,
        visionAnalysis: null,
        processedFields: []
      }
    });
  }
});

/**
 * Generate HTML visualizations for an appraisal post
 * POST /generate-visualizations
 */
router.post('/generate-visualizations', async (req, res) => {
  console.log('[Appraisal] Starting HTML visualization generation');

  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Fetch post data from WordPress
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn('[Appraisal] Post not found for HTML generation');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
      });
    }

    console.log(`[Appraisal] Checking if HTML visualizations already exist for: "${postTitle}"`);
    
    // Check if HTML fields already exist and are not empty
    const htmlFields = await wordpress.checkHtmlFields(postId);
    
    if (htmlFields.exists) {
      console.log('[Appraisal] HTML visualizations already exist, skipping generation');
      
      // Return success but indicate HTML was not regenerated
      return res.status(200).json({
        success: true,
        message: 'HTML visualizations already exist.',
        details: {
          postId,
          title: postTitle,
          visualizations: ['enhanced_analytics_html', 'appraisal_card_html'],
          status: 'skipped'
        }
      });
    }
    
    // Only generate HTML if not already done
    console.log(`[Appraisal] Generating HTML visualizations for: "${postTitle}"`);

    // Extract the statistics data
    const statisticsData = postData.acf?.statistics || {};
    
    // Prepare the appraisal data object
    const appraisalData = {
      title: postTitle,
      featured_image: images.main?.url || '',
      creator: postData.acf?.creator || '',
      object_type: postData.acf?.object_type || '',
      estimated_age: postData.acf?.estimated_age || '',
      medium: postData.acf?.medium || '',
      condition_summary: postData.acf?.condition_summary || '',
      market_demand: postData.acf?.market_demand || '',
      rarity: postData.acf?.rarity || '',
      condition_score: postData.acf?.condition_score || '',
      value: postData.acf?.value || '',
      appraiser_name: postData.acf?.appraiser_name || 'Andrés Gómez',
      // Additional fields
      artist_dates: postData.acf?.artist_dates || '',
      color_palette: postData.acf?.color_palette || '',
      style: postData.acf?.style || '',
      dimensions: postData.acf?.dimensions || '',
      framed: postData.acf?.framed || '',
      edition: postData.acf?.edition || '',
      publisher: postData.acf?.publisher || '',
      composition_description: postData.acf?.composition_description || '',
      signed: postData.acf?.signed || '',
      provenance: postData.acf?.provenance || '',
      registration_number: postData.acf?.registration_number || '',
      notes: postData.acf?.notes || '',
      coa: postData.acf?.coa || '',
      meaning: postData.acf?.meaning || ''
    };

    // Check if statistics data is a string and try to parse it
    let parsedStatistics = statisticsData;
    if (typeof statisticsData === 'string') {
      try {
        // Clean the input before parsing to handle WordPress stored data
        let cleanedData = statisticsData;
        
        // Replace PHP-style array notation
        if (cleanedData.includes('=>')) {
          console.log('[Appraisal] Detected PHP array notation, attempting conversion');
          cleanedData = cleanedData.replace(/(\w+)\s*=>\s*/gi, '"$1":');
          cleanedData = cleanedData.replace(/'([^']+)':/gi, '"$1":');
        }
        
        // Replace smart quotes and other problematic characters
        cleanedData = cleanedData
          .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
          .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
          .replace(/\u00A0/g, ' ')         // Replace non-breaking spaces
          .replace(/\u2022/g, '-')         // Replace bullet points
          .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
          
        // Fix common JSON syntax issues
        cleanedData = cleanedData
          .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
          .replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
        
        // Try to parse the cleaned data
        try {
          parsedStatistics = JSON.parse(cleanedData);
          console.log('[Appraisal] Successfully parsed cleaned statistics data');
        } catch (cleanedError) {
          // If still failing, try with stripslashes (WordPress standard)
          try {
            const strippedData = cleanedData.replace(/\\/g, '');
            parsedStatistics = JSON.parse(strippedData);
            console.log('[Appraisal] Successfully parsed stripped statistics data');
          } catch (strippedError) {
            // If all parsing attempts fail, log details for debugging
            console.warn('[Appraisal] Could not parse statistics data as JSON:', cleanedError.message);
            console.log('[Appraisal] First 100 chars of statistics data:', statisticsData.substring(0, 100));
            // Continue with original data as fallback
          }
        }
      } catch (error) {
        console.warn('[Appraisal] Error during statistics data cleaning:', error.message);
        console.log('[Appraisal] First 100 chars of statistics data:', statisticsData.substring(0, 100));
      }
    }

    // Update the HTML fields in WordPress
    await wordpress.updateHtmlFields(postId, appraisalData, parsedStatistics);

    console.log('[Appraisal] HTML visualization generation complete');

    res.status(200).json({
      success: true,
      message: 'HTML visualizations generated successfully.',
      details: {
        postId,
        title: postTitle,
        visualizations: ['enhanced_analytics_html', 'appraisal_card_html']
      }
    });
  } catch (error) {
    console.error(`[Appraisal] HTML generation error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating HTML visualizations.',
      details: {
        postId,
        error: error.message
      }
    });
  }
});

module.exports = router;
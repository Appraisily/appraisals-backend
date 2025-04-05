const express = require('express');
const router = express.Router();
const wordpress = require('../services/wordpress');
const { processMainImageWithGoogleVision } = require('../services/vision');
const { processAllMetadata, processJustificationMetadata } = require('../services/metadata');
const { getClientIp } = require('request-ip');

router.post('/complete-appraisal-report', async (req, res) => {
  console.log('[Appraisal] Starting report generation');

  const { postId, justificationOnly } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }
  
  // If justificationOnly is true, skip directly to justification process
  if (justificationOnly === true) {
    console.log('[Appraisal] Skipping to justification process as requested');
    
    try {
      const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
      
      if (!postTitle) {
        console.warn('[Appraisal] Post title not found');
        return res.status(404).json({
          success: false,
          message: 'Post not found or title is missing'
        });
      }
      
      const justificationResult = await processJustificationMetadata(
        postId,
        postTitle,
        postData.acf?.value
      );
      
      return res.status(200).json({
        success: true,
        message: 'Justification process completed successfully.',
        details: {
          postId,
          title: postTitle,
          processedFields: [justificationResult]
        }
      });
    } catch (error) {
      console.error(`[Appraisal] Justification error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        details: { postId, error: error.message }
      });
    }
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

/**
 * Process justification for an appraisal post directly (for debugging/testing)
 * POST /process-justification
 */
router.post('/process-justification', async (req, res) => {
  console.log('[Appraisal] Starting direct justification process');

  const { postId, skipMetadataGeneration } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    const { postData, title: postTitle } = await wordpress.fetchPostData(postId);

    if (!postTitle) {
      console.warn('[Appraisal] Post title not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing'
      });
    }

    console.log(`[Appraisal] Processing justification for: "${postTitle}"`);

    // Process justification metadata with optional skip flag for testing
    const justificationResult = await processJustificationMetadata(
      postId,
      postTitle,
      postData.acf?.value,
      skipMetadataGeneration === true
    );

    console.log('[Appraisal] Justification process complete');

    res.status(200).json({
      success: true,
      message: 'Justification process completed successfully.',
      details: {
        postId,
        title: postTitle,
        result: justificationResult
      }
    });
  } catch (error) {
    console.error(`[Appraisal] Justification error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing justification.',
      details: {
        postId,
        error: error.message
      }
    });
  }
});

/**
 * Regenerate statistics and HTML visualizations for an appraisal post
 * POST /regenerate-statistics-and-visualizations
 */
router.post('/regenerate-statistics-and-visualizations', async (req, res) => {
  console.log('[Appraisal] Starting statistics and visualizations regeneration');

  const { postId } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Get post data from WordPress
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    
    if (!postTitle) {
      console.warn('[Appraisal] Post not found for statistics regeneration');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing',
      });
    }

    // Get the target value
    const targetValue = parseFloat(postData.acf?.value);
    if (isNaN(targetValue)) {
      console.warn('[Appraisal] Post has invalid or missing value');
      return res.status(400).json({
        success: false,
        message: 'Post has invalid or missing value'
      });
    }
    
    console.log(`[Appraisal] Regenerating statistics for: "${postTitle}" with value ${targetValue}`);
    
    // Call valuer-agent to regenerate statistics
    console.log('[Appraisal] Calling valuer-agent for enhanced statistics');
    const response = await fetch('https://valuer-agent-856401495068.us-central1.run.app/api/enhanced-statistics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: postTitle,
        value: targetValue,
        limit: 20,
        minPrice: Math.floor(targetValue * 0.6),
        maxPrice: Math.ceil(targetValue * 1.6)
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Appraisal] Error from valuer-agent:', errorText);
      return res.status(500).json({
        success: false,
        message: 'Error regenerating statistics from valuer agent',
        error: errorText
      });
    }
    
    const statsResponse = await response.json();
    if (!statsResponse.success || !statsResponse.statistics) {
      console.error('[Appraisal] Invalid response from valuer-agent:', statsResponse);
      return res.status(500).json({
        success: false,
        message: 'Invalid response from valuer agent'
      });
    }
    
    console.log('[Appraisal] Statistics regenerated successfully, saving to WordPress');
    
    // Apply validation and sanitization to statistics data
    // Similar to what's done in processJustificationMetadata
    const { validateStatisticsData } = require('../services/metadata');
    const validatedStats = validateStatisticsData(statsResponse.statistics);
    
    // Create a sanitized version for WordPress storage
    const sanitizedStats = JSON.parse(JSON.stringify(validatedStats, (key, value) => {
      // Extra safety: clean all string values to ensure WordPress compatibility
      if (typeof value === 'string') {
        // Replace problematic quotes and Unicode characters
        return value
          .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
          .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
          .replace(/\u00A0/g, ' ')         // Replace non-breaking spaces
          .replace(/\u2022/g, '-')         // Replace bullet points
          .replace(/[^\x00-\x7F]/g, '');   // Strip other non-ASCII characters
      }
      return value;
    }));
    
    // Save the regenerated statistics to WordPress
    await wordpress.updatePostACFFields(postId, {
      statistics: JSON.stringify(sanitizedStats)
    });
    
    console.log('[Appraisal] Statistics saved, regenerating HTML visualizations');
    
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
    
    // Regenerate HTML visualizations
    await wordpress.updateHtmlFields(postId, appraisalData, sanitizedStats);
    
    console.log('[Appraisal] HTML visualizations regenerated successfully');
    
    // Update processing metadata to track the regeneration
    const timestamp = new Date().toISOString();
    await wordpress.updatePostMeta(postId, 'processing_history', [
      {
        step: 'regenerate_statistics',
        timestamp,
        status: 'completed'
      },
      {
        step: 'regenerate_visualizations',
        timestamp,
        status: 'completed'
      }
    ]);
    
    return res.json({
      success: true,
      message: 'Statistics and visualizations regenerated successfully',
      details: {
        postId,
        title: postTitle,
        statistics: {
          count: sanitizedStats.count || 0,
          average_price: sanitizedStats.average_price || 0,
          confidence_level: sanitizedStats.confidence_level || 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('[Appraisal] Error regenerating statistics and visualizations:', error);
    return res.status(500).json({
      success: false,
      message: 'Error regenerating statistics and visualizations',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Enhance description for an appraisal
 * POST /enhance-description
 */
router.post('/enhance-description', async (req, res) => {
  console.log('[Appraisal] Starting description enhancement');
  
  const { postId } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false, 
      message: 'postId is required.' 
    });
  }
  
  try {
    // Get post data from WordPress
    const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
    
    if (!postTitle) {
      console.warn('[Appraisal] Post not found for description enhancement');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing'
      });
    }
    
    console.log(`[Appraisal] Enhancing description for: "${postTitle}"`);
    
    // Get the original content
    const originalContent = postData.content?.rendered || '';
    
    // Generate enhanced description using OpenAI
    console.log('[Appraisal] Generating enhanced description with OpenAI');
    
    const { generateContent } = require('../services/openai');
    const prompt = `
    You are a professional art expert specializing in appraisals. 
    Enhance the following description to make it more detailed, professional and accurate:
    
    "${postTitle}"
    
    Make it more eloquent and descriptive. Keep the core information intact but add art-specific details.
    Your enhanced description should be appropriate for a formal appraisal document.
    Keep the response under 400 words.
    `;
    
    const enhancedDescription = await generateContent(prompt, postTitle);
    
    // Update the WordPress post with the enhanced description
    await wordpress.updatePostACFFields(postId, {
      enhanced_description: enhancedDescription
    });
    
    // Check if we should update the main content
    let contentUpdated = false;
    if (req.body.updateContent === true) {
      console.log('[Appraisal] Updating main post content with enhanced description');
      await wordpress.client.updatePost(postId, {
        content: enhancedDescription
      });
      contentUpdated = true;
    }
    
    console.log('[Appraisal] Description enhancement complete');
    
    // Update processing metadata to track the enhancement
    const timestamp = new Date().toISOString();
    await wordpress.updatePostMeta(postId, 'processing_history', [
      {
        step: 'enhance_description',
        timestamp,
        status: 'completed'
      }
    ]);
    
    return res.json({
      success: true,
      message: 'Description enhanced successfully',
      details: {
        postId,
        title: postTitle,
        contentUpdated,
        original_length: originalContent.length,
        enhanced_length: enhancedDescription.length
      }
    });
  } catch (error) {
    console.error('[Appraisal] Error enhancing description:', error);
    return res.status(500).json({
      success: false,
      message: 'Error enhancing description',
      error: error.message
    });
  }
});

/**
 * Update WordPress post with additional metadata
 * POST /update-wordpress
 */
router.post('/update-wordpress', async (req, res) => {
  console.log('[Appraisal] Starting WordPress update');
  
  const { postId } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false, 
      message: 'postId is required.' 
    });
  }
  
  try {
    // Get post data from WordPress
    const { postData, title: postTitle } = await wordpress.fetchPostData(postId);
    
    if (!postTitle) {
      console.warn('[Appraisal] Post not found for WordPress update');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing'
      });
    }
    
    console.log(`[Appraisal] Updating WordPress post: "${postTitle}"`);
    
    // Update ACF fields with any provided data
    const acfFields = req.body.acfFields || {};
    
    // Always include basic fields
    const updatedFields = {
      ...acfFields,
      last_updated: new Date().toISOString(),
      appraisal_status: 'completed'
    };
    
    // Update WordPress post ACF fields
    await wordpress.updatePostACFFields(postId, updatedFields);
    
    // Insert template shortcodes if requested
    let contentUpdated = false;
    if (req.body.insertShortcodes === true) {
      console.log('[Appraisal] Checking for shortcodes in content');
      
      // Get the current content
      const content = postData.content?.rendered || '';
      let updatedContent = content;
      
      // Determine appraisal type
      const appraisalType = postData.acf?.appraisal_type || req.body.appraisalType || 'RegularArt';
      
      // Add shortcodes if not present
      if (!updatedContent.includes('[pdf_download]')) {
        updatedContent += '\n[pdf_download]';
      }
      
      if (!updatedContent.includes(`[AppraisalTemplates`)) {
        updatedContent += `\n[AppraisalTemplates type="${appraisalType}"]`;
      }
      
      // Update content if changed
      if (updatedContent !== content) {
        console.log('[Appraisal] Adding missing shortcodes to content');
        await wordpress.client.updatePost(postId, {
          content: updatedContent
        });
        contentUpdated = true;
      } else {
        console.log('[Appraisal] Shortcodes already present in content');
      }
    }
    
    console.log('[Appraisal] WordPress update complete');
    
    // Update processing metadata to track the update
    const timestamp = new Date().toISOString();
    await wordpress.updatePostMeta(postId, 'processing_history', [
      {
        step: 'update_wordpress',
        timestamp,
        status: 'completed'
      }
    ]);
    
    return res.json({
      success: true,
      message: 'WordPress updated successfully',
      details: {
        postId,
        title: postTitle,
        contentUpdated,
        fieldsUpdated: Object.keys(updatedFields)
      }
    });
  } catch (error) {
    console.error('[Appraisal] Error updating WordPress:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating WordPress',
      error: error.message
    });
  }
});

/**
 * Generate HTML content for an appraisal
 * POST /html-content
 */
router.post('/html-content', async (req, res) => {
  console.log('[Appraisal] Starting HTML content generation');
  
  const { postId, contentType } = req.body;
  
  if (!postId) {
    return res.status(400).json({
      success: false, 
      message: 'postId is required.' 
    });
  }
  
  try {
    // Get post data from WordPress
    const { postData, images, title: postTitle } = await wordpress.fetchPostData(postId);
    
    if (!postTitle) {
      console.warn('[Appraisal] Post not found for HTML generation');
      return res.status(404).json({
        success: false,
        message: 'Post not found or title is missing'
      });
    }
    
    console.log(`[Appraisal] Generating HTML content for: "${postTitle}"`);
    
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
    
    // Extract and parse statistics data
    let statisticsData = postData.acf?.statistics || '{}';
    let statisticsObj = {};
    
    if (typeof statisticsData === 'string') {
      try {
        const { jsonCleaner } = require('../services/utils/jsonCleaner');
        statisticsObj = jsonCleaner.cleanAndParse(statisticsData);
        console.log('[Appraisal] Successfully parsed statistics data from post');
      } catch (error) {
        console.error('[Appraisal] Error parsing statistics data:', error);
        statisticsObj = {}; // Default to empty object
      }
    } else if (typeof statisticsData === 'object') {
      statisticsObj = statisticsData;
    }
    
    // Generate both types of HTML content
    console.log('[Appraisal] Generating enhanced analytics HTML');
    const enhancedAnalyticsHtml = await wordpress.updateEnhancedAnalyticsHtml(postId, statisticsObj);
    
    console.log('[Appraisal] Generating appraisal card HTML');
    const appraisalCardHtml = await wordpress.updateAppraisalCardHtml(postId, appraisalData, statisticsObj);
    
    console.log('[Appraisal] HTML generation complete');
    
    // Update processing metadata to track the generation
    const timestamp = new Date().toISOString();
    await wordpress.updatePostMeta(postId, 'processing_history', [
      {
        step: 'generate_html',
        timestamp,
        status: 'completed'
      }
    ]);
    
    return res.json({
      success: true,
      message: 'HTML content generated successfully',
      details: {
        postId,
        title: postTitle,
        htmlTypes: ['enhanced_analytics_html', 'appraisal_card_html']
      }
    });
  } catch (error) {
    console.error('[Appraisal] Error generating HTML content:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating HTML content',
      error: error.message
    });
  }
});

module.exports = router;
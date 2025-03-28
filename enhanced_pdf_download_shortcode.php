<?php
/**
 * Snippet Name: Enhanced PDF Download Shortcode
 * Description: Modern PDF download button with sticky scroll behavior
 * Snippet Type: Shortcode
 */

function enhanced_pdf_download_shortcode() {
  // Get PDF link from ACF field
  $pdf_link = get_field('pdflink');
  
  // If no PDF link is available, return empty
  if (empty($pdf_link)) {
    return '';
  }
  
  // Start output buffering to capture HTML
  ob_start();
?>
<div id="pdf-download-container" class="enhanced-pdf-download">
  <a href="<?php echo esc_url($pdf_link); ?>" target="_blank" id="pdf-download-button" class="download-link">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M9 11L12 14L15 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7 14H5C3.89543 14 3 14.8954 3 16V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V16C21 14.8954 20.1046 14 19 14H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    Download Appraisal in PDF
  </a>
</div>

<style>
:root {
  /* Primary colors */
  --pdf-primary-500: #3b82f6;
  --pdf-primary-600: #2563eb;
  --pdf-primary-700: #1d4ed8;
  
  /* Neutral colors */
  --pdf-neutral-50: #f9fafb;
  --pdf-neutral-100: #f3f4f6;
  --pdf-neutral-200: #e5e7eb;
  --pdf-neutral-700: #374151;
  
  /* Border radius */
  --pdf-radius-md: 0.375rem;
  
  /* Shadows */
  --pdf-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --pdf-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.enhanced-pdf-download {
  position: relative;
  z-index: 100;
  margin: 10px 0;
  transition: all 0.3s ease;
}

.enhanced-pdf-download.fixed {
  position: fixed;
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
  animation: pdfFadeIn 0.3s ease forwards;
}

.enhanced-pdf-download.hidden {
  opacity: 0;
  pointer-events: none;
}

.download-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: white;
  color: var(--pdf-neutral-700);
  text-decoration: none;
  border-radius: var(--pdf-radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--pdf-shadow-md);
  transition: all 0.15s ease;
  border: 1px solid var(--pdf-neutral-200);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

.fixed .download-link {
  background: var(--pdf-primary-600);
  color: white;
  border-color: var(--pdf-primary-700);
}

.download-link:hover {
  background: var(--pdf-neutral-100);
  color: var(--pdf-primary-700);
  transform: translateY(-2px);
}

.fixed .download-link:hover {
  background: var(--pdf-primary-700);
  color: white;
}

@keyframes pdfFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Responsive styles */
@media (max-width: 767px) {
  .enhanced-pdf-download.fixed {
    width: 100%;
    left: 0;
    transform: none;
    top: 0;
    backdrop-filter: blur(8px);
    background-color: rgba(255, 255, 255, 0.8);
    padding: 8px;
  }
  
  .fixed .download-link {
    width: 100%;
    justify-content: center;
  }
  
  @keyframes pdfFadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
}

@media (max-width: 480px) {
  .download-link {
    font-size: 0.75rem;
    padding: 0.4rem 0.8rem;
  }
  
  .download-link svg {
    width: 14px;
    height: 14px;
  }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
  initPdfButton();
});

function initPdfButton() {
  const pdfContainer = document.getElementById('pdf-download-container');
  if (!pdfContainer) return;
  
  // Find the closest appraisal card or content container to associate with
  const contentContainer = document.querySelector('.modern-appraisal-card') || 
                         document.querySelector('article') || 
                         document.querySelector('.entry-content') ||
                         pdfContainer.parentElement;
                         
  if (!contentContainer) return;
  
  const containerRect = contentContainer.getBoundingClientRect();
  const containerTop = containerRect.top + window.pageYOffset;
  const containerBottom = containerTop + contentContainer.offsetHeight;
  
  let lastScrollTop = 0;
  let scrollingDown = true;
  let ticking = false;
  
  window.addEventListener('scroll', function() {
    lastScrollTop = window.pageYOffset;
    scrollingDown = lastScrollTop > (this.oldScroll || 0);
    this.oldScroll = lastScrollTop;
    
    if (!ticking) {
      window.requestAnimationFrame(function() {
        updatePdfButtonPosition(pdfContainer, containerTop, containerBottom, lastScrollTop, scrollingDown);
        ticking = false;
      });
      
      ticking = true;
    }
  });
  
  // Initial position
  updatePdfButtonPosition(pdfContainer, containerTop, containerBottom, window.pageYOffset, true);
}

function updatePdfButtonPosition(pdfContainer, containerTop, containerBottom, scrollTop, scrollingDown) {
  // Determine thresholds: when to show fixed button
  const showFixedThreshold = containerTop + 50; // Show fixed after scrolling past container top + 50px
  
  // If we're between the start and end of the content section
  if (scrollTop >= showFixedThreshold && scrollTop <= containerBottom - 200) {
    pdfContainer.classList.add('fixed');
    pdfContainer.classList.remove('hidden');
  } 
  // If we're scrolled above the content start
  else if (scrollTop < showFixedThreshold) {
    pdfContainer.classList.remove('fixed');
    pdfContainer.classList.remove('hidden');
  } 
  // If we're scrolled below the content end
  else {
    if (scrollingDown) {
      pdfContainer.classList.add('hidden');
    } else {
      pdfContainer.classList.remove('hidden');
    }
  }
}
</script>

<?php
  // Get the output buffer content
  $output = ob_get_clean();
  
  // Return the complete HTML
  return $output;
}

// Register the shortcode
add_shortcode('enhanced_pdf_download', 'enhanced_pdf_download_shortcode');
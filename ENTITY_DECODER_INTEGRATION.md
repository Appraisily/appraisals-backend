# HTML Entity Decoder Integration

To fix the HTML entity encoding issues observed in the visualization components, follow these steps:

## 1. Add the Entity Decoder Script

1. Include the following script tag in both the enhanced analytics and appraisal card templates:

```html
<script type="text/javascript">
  // HTML Entity Decoder
  (function() {
    // Define the decode function
    function decodeHtmlEntities(text) {
      if (!text || typeof text !== 'string') return '';
      
      // Use textarea trick for basic entity decoding
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      let decoded = textarea.value;
      
      // Handle common numeric entities
      decoded = decoded.replace(/&#(\d+);/g, function(match, dec) {
        return String.fromCharCode(dec);
      });
      
      // Handle specific entities that may not be properly decoded
      const replacements = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&#215;': '×',
        '&times;': '×',
        '&ndash;': '–',
        '&mdash;': '—',
        '&lsquo;': ''',
        '&rsquo;': ''',
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&bull;': '•',
        '&hellip;': '…'
      };
      
      for (const entity in replacements) {
        const regex = new RegExp(entity.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"), 'g');
        decoded = decoded.replace(regex, replacements[entity]);
      }
      
      return decoded;
    }
    
    // Process all text elements after DOM is loaded
    function decodeHtmlInElements() {
      const selectors = [
        '.artwork-title', '.artwork-creator', '.artwork-description',
        '.detail-value', '.item-name', '.statistic-value', '.metric-value',
        'h1', 'h2', 'h3', 'h4', 'h5', 'th', 'td', 'p:not(.chart-fallback p)'
      ];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.textContent && el.textContent.includes('&')) {
            el.textContent = decodeHtmlEntities(el.textContent);
          }
        });
      });
      
      console.log('HTML entity decoder has processed text elements');
    }
    
    // Run decoder after page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', decodeHtmlInElements);
    } else {
      // DOM already loaded, run decoder immediately
      setTimeout(decodeHtmlInElements, 100);
    }
  })();
</script>
```

## 2. Server-Side Decoding

For elements that are populated on the server side, ensure proper decoding:

```javascript
// Add this function to your template generators
function decodeServerSide(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#215;/g, '×')
    .replace(/&times;/g, '×');
}

// When processing data, apply the function:
title = decodeServerSide(title);
description = decodeServerSide(description);
```

## 3. Update Function Calls

In your data processing functions (e.g., in the templates), make sure to use the decoder:

```javascript
// Example:
for (const sale of comparable_sales) {
  const title = decodeServerSide(sale.title || 'Unknown Item');
  // Other processing...
  
  sales_html += `<tr class="${highlight}">
    <td class="item-cell">
      <div class="item-details"><span class="item-name">${title}</span></div>
    </td>
    <!-- Other cells... -->
  </tr>`;
}
```

## 4. CSS Fixes for Proper Layout

In addition to fixing the encoding issues, add these CSS rules to improve layout:

```css
/* Ensure proper handling of long text with special characters */
.item-name, .artwork-title, .detail-value {
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Improve table readability */
.sales-table td {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

## Implementation Notes

1. The client-side decoder runs automatically after DOM content is loaded
2. The server-side decoder should be applied to text before insertion into HTML
3. Both approaches together provide complete coverage for all text elements
4. CSS improvements help with proper text display even after entity decoding

These changes will ensure that special characters like `×` (multiplication sign), curly quotes, and other entities are properly displayed in the visualizations.
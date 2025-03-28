# Appraisal Card Redesign

This document outlines the proposed redesign for the appraisal summary card to match the modern, clean aesthetic of the newer visualization sections like Price History Analysis and Item Metrics Analysis.

## Design Goals

1. Create a cohesive visual language across all components
2. Enhance user engagement through modern UI patterns
3. Improve information hierarchy and readability
4. Add subtle animations for a more polished experience
5. Maintain full responsiveness across all device sizes

## Current Style Analysis

The newer sections (Price History Analysis and Item Metrics Analysis) feature:

- Clean, minimal design with ample white space
- Soft shadows and subtle border radiuses
- Modern color palette with primary blues and supporting accent colors
- Interactive elements with hover states
- Card-based layouts with clear visual hierarchy
- Consistent spacing and typography

## Redesign Concept

### Color Palette

```css
:root {
  /* Primary colors */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;
  
  /* Neutral colors */
  --neutral-50: #f9fafb;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;
  
  /* Success/accent colors */
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
  --purple-500: #8b5cf6;
}
```

### Typography

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  
  /* Font sizes */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
  
  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;
}
```

### Shadow System

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  
  /* Colored shadows */
  --shadow-primary: 0 4px 14px 0 rgba(59, 130, 246, 0.3);
  --shadow-success: 0 4px 14px 0 rgba(16, 185, 129, 0.3);
}
```

### Spacing System

```css
:root {
  --spacing-0: 0;
  --spacing-px: 1px;
  --spacing-0-5: 0.125rem;  /* 2px */
  --spacing-1: 0.25rem;     /* 4px */
  --spacing-1-5: 0.375rem;  /* 6px */
  --spacing-2: 0.5rem;      /* 8px */
  --spacing-2-5: 0.625rem;  /* 10px */
  --spacing-3: 0.75rem;     /* 12px */
  --spacing-3-5: 0.875rem;  /* 14px */
  --spacing-4: 1rem;        /* 16px */
  --spacing-5: 1.25rem;     /* 20px */
  --spacing-6: 1.5rem;      /* 24px */
  --spacing-8: 2rem;        /* 32px */
  --spacing-10: 2.5rem;     /* 40px */
  --spacing-12: 3rem;       /* 48px */
  --spacing-16: 4rem;       /* 64px */
  --spacing-20: 5rem;       /* 80px */
  --spacing-24: 6rem;       /* 96px */
}
```

### Border Radius System

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.125rem;   /* 2px */
  --radius-md: 0.375rem;   /* 6px */
  --radius-lg: 0.5rem;     /* 8px */
  --radius-xl: 0.75rem;    /* 12px */
  --radius-2xl: 1rem;      /* 16px */
  --radius-3xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;
}
```

## HTML Markup Changes

The new appraisal card design will include the following structural changes:

```html
<div class="appraisal-card">
  <div class="appraisal-card__header">
    <div class="appraisal-card__badge">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
      </svg>
    </div>
    <div class="appraisal-card__title">
      <h2>Art Analysis Report</h2>
      <div class="appraisal-card__date">[display_publish_date]</div>
    </div>
    <div class="appraisal-card__value">
      <span class="appraisal-card__value-label">Appraised Value</span>
      <span class="appraisal-card__value-amount">[acf field="value" format="$%d USD"]</span>
    </div>
  </div>
  
  <div class="appraisal-card__body">
    <div class="appraisal-card__image-container">
      <div class="appraisal-card__image">
        [acf_dynamic_img fieldname="main" format="thumbnail" class="main-thumbnail"]
        <div class="image-overlay"></div>
      </div>
      <div class="appraisal-card__image-nav">
        <button class="appraisal-card__nav-button prev" aria-label="Previous image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor"/>
          </svg>
        </button>
        <button class="appraisal-card__nav-button next" aria-label="Next image">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="appraisal-card__artwork-info">
      <h3 class="appraisal-card__artwork-title">[get_custom_field field_name="title" default="Artwork Title"]</h3>
      <div class="appraisal-card__artwork-creator">[get_custom_field field_name="creator" default="Unknown Artist"]</div>
    </div>
    
    <div class="appraisal-card__details">
      <div class="appraisal-card__detail">
        <div class="appraisal-card__detail-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="appraisal-card__detail-content">
          <span class="appraisal-card__detail-label">Object Type</span>
          <span class="appraisal-card__detail-value">[get_custom_field field_name="object_type" default="Art Object"]</span>
        </div>
      </div>
      
      <div class="appraisal-card__detail">
        <div class="appraisal-card__detail-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="appraisal-card__detail-content">
          <span class="appraisal-card__detail-label">Period/Age</span>
          <span class="appraisal-card__detail-value">[get_custom_field field_name="estimated_age" default="20th Century"]</span>
        </div>
      </div>
      
      <div class="appraisal-card__detail">
        <div class="appraisal-card__detail-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C6.49 22 2 17.51 2 12C2 6.49 6.49 2 12 2C17.51 2 22 6.49 22 12C22 17.51 17.51 22 12 22ZM12 4C7.59 4 4 7.59 4 12C4 16.41 7.59 20 12 20C16.41 20 20 16.41 20 12C20 7.59 16.41 4 12 4ZM15 16H13V9H11V7H15V16Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="appraisal-card__detail-content">
          <span class="appraisal-card__detail-label">Medium</span>
          <span class="appraisal-card__detail-value">[get_custom_field field_name="medium" default="Mixed Media"]</span>
        </div>
      </div>
      
      <div class="appraisal-card__detail">
        <div class="appraisal-card__detail-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="appraisal-card__detail-content">
          <span class="appraisal-card__detail-label">Condition</span>
          <span class="appraisal-card__detail-value">[get_custom_field field_name="condition_summary" default="Good"]</span>
        </div>
      </div>
    </div>
    
    <div class="appraisal-card__metrics">
      <div class="appraisal-card__metric">
        <h4 class="appraisal-card__metric-title">Market Demand</h4>
        <div class="appraisal-card__metric-chart">
          <div class="appraisal-card__donut-chart" data-percentage="[get_percentage field_name='market_demand' default='80']">
            <div class="appraisal-card__donut-label">[get_custom_field field_name='market_demand' default='80']%</div>
          </div>
        </div>
        <div class="appraisal-card__metric-description">Current collector interest</div>
      </div>
      
      <div class="appraisal-card__metric">
        <h4 class="appraisal-card__metric-title">Rarity</h4>
        <div class="appraisal-card__metric-chart">
          <div class="appraisal-card__donut-chart" data-percentage="[get_percentage field_name='rarity' default='80']">
            <div class="appraisal-card__donut-label">[get_custom_field field_name='rarity' default='80']%</div>
          </div>
        </div>
        <div class="appraisal-card__metric-description">Availability in the market</div>
      </div>
      
      <div class="appraisal-card__metric">
        <h4 class="appraisal-card__metric-title">Condition</h4>
        <div class="appraisal-card__metric-chart">
          <div class="appraisal-card__donut-chart" data-percentage="[get_percentage field_name='condition_score' default='85']">
            <div class="appraisal-card__donut-label">[get_custom_field field_name='condition_score' default='85']%</div>
          </div>
        </div>
        <div class="appraisal-card__metric-description">Physical state assessment</div>
      </div>
    </div>
  </div>
  
  <div class="appraisal-card__tabs">
    <div class="appraisal-card__tab-buttons">
      <button class="appraisal-card__tab-button active" data-tab="nutshell">In a Nutshell</button>
      <button class="appraisal-card__tab-button" data-tab="market">Market Analysis</button>
      <button class="appraisal-card__tab-button" data-tab="similar">Similar Items</button>
    </div>
    
    <div class="appraisal-card__tab-content">
      <div id="nutshell" class="appraisal-card__tab-pane active">
        <div class="appraisal-card__nutshell">
          [format_table field_name="table"]
        </div>
      </div>
      
      <div id="market" class="appraisal-card__tab-pane">
        <div class="appraisal-card__market">
          [display_compact_analytics]
          <p class="appraisal-card__market-text">[get_custom_field field_name="statistics_summary" default="Market analysis reveals strong demand for similar items with consistent price appreciation over the past 5 years."]</p>
        </div>
      </div>
      
      <div id="similar" class="appraisal-card__tab-pane">
        <div class="appraisal-card__similar">
          [similar_gallery field_name="googlevision" limit="3" class="summary-similar-gallery"]
        </div>
      </div>
    </div>
  </div>
  
  <div class="appraisal-card__footer">
    <div class="appraisal-card__appraiser">
      <span>Appraised by: <strong>Andrés Gómez</strong>, Accredited Art Appraiser</span>
    </div>
    <button class="appraisal-card__expand-button">
      <span>Show Details</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z" fill="currentColor"/>
      </svg>
    </button>
  </div>
</div>
```

## CSS Styling

```css
/* Base component styles */
.appraisal-card {
  font-family: var(--font-sans);
  background-color: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--neutral-200);
  max-width: 1200px;
  width: 100%;
  margin: var(--spacing-8) auto;
}

.appraisal-card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
}

/* Header section */
.appraisal-card__header {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
  color: white;
  padding: var(--spacing-6) var(--spacing-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.appraisal-card__badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  margin-right: var(--spacing-4);
}

.appraisal-card__title {
  flex: 1;
}

.appraisal-card__title h2 {
  margin: 0;
  font-size: var(--font-size-3xl);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: white;
}

.appraisal-card__date {
  font-size: var(--font-size-sm);
  opacity: 0.8;
  margin-top: var(--spacing-1);
}

.appraisal-card__value {
  background: rgba(255, 255, 255, 0.15);
  padding: var(--spacing-4) var(--spacing-6);
  border-radius: var(--radius-lg);
  text-align: center;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-md);
}

.appraisal-card__value-label {
  display: block;
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: var(--spacing-1);
  font-weight: 500;
}

.appraisal-card__value-amount {
  font-size: var(--font-size-xl);
  font-weight: 700;
}

/* Body section */
.appraisal-card__body {
  padding: var(--spacing-8);
  display: grid;
  gap: var(--spacing-6);
}

/* Image container */
.appraisal-card__image-container {
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.appraisal-card__image {
  width: 100%;
  height: 350px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--neutral-100);
  position: relative;
}

.appraisal-card__image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
  pointer-events: none;
}

.appraisal-card__image-nav {
  position: absolute;
  bottom: var(--spacing-4);
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 var(--spacing-4);
}

.appraisal-card__nav-button {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.appraisal-card__nav-button:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: scale(1.1);
}

/* Artwork info */
.appraisal-card__artwork-info {
  text-align: center;
}

.appraisal-card__artwork-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin: 0 0 var(--spacing-2);
  color: var(--neutral-900);
}

.appraisal-card__artwork-creator {
  font-size: var(--font-size-lg);
  color: var(--neutral-600);
}

/* Details section */
.appraisal-card__details {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
}

.appraisal-card__detail {
  display: flex;
  align-items: center;
  background: var(--neutral-50);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--neutral-200);
  transition: all 0.2s;
}

.appraisal-card__detail:hover {
  background: var(--primary-50);
  border-color: var(--primary-200);
  transform: translateY(-2px);
}

.appraisal-card__detail-icon {
  color: var(--primary-600);
  margin-right: var(--spacing-3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--neutral-100);
  border-radius: var(--radius-full);
}

.appraisal-card__detail-content {
  display: flex;
  flex-direction: column;
}

.appraisal-card__detail-label {
  font-size: var(--font-size-xs);
  color: var(--neutral-500);
  margin-bottom: var(--spacing-1);
}

.appraisal-card__detail-value {
  font-weight: 600;
  color: var(--neutral-900);
}

/* Metrics section */
.appraisal-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-4);
}

.appraisal-card__metric {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--neutral-200);
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;
}

.appraisal-card__metric:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.appraisal-card__metric:nth-child(1) {
  --metric-color: var(--primary-500);
}

.appraisal-card__metric:nth-child(2) {
  --metric-color: var(--purple-500);
}

.appraisal-card__metric:nth-child(3) {
  --metric-color: var(--success-500);
}

.appraisal-card__metric-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--neutral-700);
  text-align: center;
  margin: 0 0 var(--spacing-4);
}

.appraisal-card__metric-chart {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: var(--spacing-3) 0;
}

.appraisal-card__donut-chart {
  --size: 120px;
  --thickness: 12px;
  width: var(--size);
  height: var(--size);
  border-radius: var(--radius-full);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.appraisal-card__donut-chart::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--radius-full);
  background: conic-gradient(
    var(--metric-color) 0%,
    var(--metric-color) calc(var(--percentage) * 1%),
    var(--neutral-200) calc(var(--percentage) * 1%) 100%
  );
  mask: radial-gradient(
    transparent 0,
    transparent calc(var(--size) / 2 - var(--thickness)),
    #fff calc(var(--size) / 2 - var(--thickness) + 1px),
    #fff calc(var(--size) / 2)
  );
  -webkit-mask: radial-gradient(
    transparent 0,
    transparent calc(var(--size) / 2 - var(--thickness)),
    #fff calc(var(--size) / 2 - var(--thickness) + 1px),
    #fff calc(var(--size) / 2)
  );
  transform: rotate(-90deg);
}

.appraisal-card__donut-label {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--neutral-900);
}

.appraisal-card__metric-description {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--neutral-500);
  margin-top: var(--spacing-3);
}

/* Tabs section */
.appraisal-card__tabs {
  border-top: 1px solid var(--neutral-200);
}

.appraisal-card__tab-buttons {
  display: flex;
  border-bottom: 1px solid var(--neutral-200);
  background: var(--neutral-50);
}

.appraisal-card__tab-button {
  padding: var(--spacing-4) var(--spacing-6);
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 600;
  color: var(--neutral-600);
  transition: all 0.2s;
  font-size: var(--font-size-base);
}

.appraisal-card__tab-button.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-600);
}

.appraisal-card__tab-button:hover:not(.active) {
  background: var(--neutral-100);
  color: var(--neutral-800);
}

.appraisal-card__tab-content {
  padding: var(--spacing-6) var(--spacing-8);
  min-height: 250px;
}

.appraisal-card__tab-pane {
  display: none;
  animation: fadeIn 0.5s ease;
}

.appraisal-card__tab-pane.active {
  display: block;
}

.appraisal-card__nutshell dl {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--spacing-2) var(--spacing-4);
  margin: 0;
}

.appraisal-card__nutshell dt {
  font-weight: 600;
  color: var(--neutral-600);
}

.appraisal-card__nutshell dd {
  margin: 0;
  color: var(--neutral-900);
}

.appraisal-card__market-text {
  margin-top: var(--spacing-5);
  color: var(--neutral-700);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
  border-top: 1px solid var(--neutral-200);
  padding-top: var(--spacing-5);
}

.appraisal-card__similar {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-5);
}

.appraisal-card__similar img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: var(--radius-lg);
  transition: all 0.25s;
  border: 1px solid var(--neutral-200);
}

.appraisal-card__similar img:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-200);
}

/* Footer section */
.appraisal-card__footer {
  background: var(--neutral-50);
  padding: var(--spacing-5) var(--spacing-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--neutral-200);
}

.appraisal-card__appraiser {
  font-size: var(--font-size-sm);
  color: var(--neutral-600);
}

.appraisal-card__expand-button {
  background: white;
  border: 1px solid var(--primary-200);
  border-radius: var(--radius-md);
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--primary-600);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.appraisal-card__expand-button:hover {
  background: var(--primary-50);
  transform: translateY(-2px);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes donutFill {
  from {
    transform: rotate(-90deg);
    background: conic-gradient(
      var(--metric-color) 0%,
      var(--neutral-200) 0% 100%
    );
  }
  to {
    transform: rotate(-90deg);
    background: conic-gradient(
      var(--metric-color) 0%,
      var(--metric-color) calc(var(--percentage) * 1%),
      var(--neutral-200) calc(var(--percentage) * 1%) 100%
    );
  }
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .appraisal-card__header {
    padding: var(--spacing-5) var(--spacing-6);
  }
  
  .appraisal-card__body {
    padding: var(--spacing-6);
    gap: var(--spacing-5);
  }
  
  .appraisal-card__details {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .appraisal-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-4);
    padding: var(--spacing-5);
  }
  
  .appraisal-card__value {
    width: 100%;
  }
  
  .appraisal-card__body {
    padding: var(--spacing-5);
    gap: var(--spacing-5);
  }
  
  .appraisal-card__image {
    height: 250px;
  }
  
  .appraisal-card__metrics {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }
  
  .appraisal-card__tab-button {
    padding: var(--spacing-3) var(--spacing-4);
    font-size: var(--font-size-sm);
  }
  
  .appraisal-card__tab-content {
    padding: var(--spacing-5);
  }
  
  .appraisal-card__nutshell dl {
    grid-template-columns: 150px 1fr;
  }
  
  .appraisal-card__footer {
    padding: var(--spacing-4) var(--spacing-5);
    flex-direction: column;
    gap: var(--spacing-4);
    align-items: flex-start;
  }
  
  .appraisal-card__expand-button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .appraisal-card__details {
    grid-template-columns: 1fr;
  }
  
  .appraisal-card__nutshell dl {
    grid-template-columns: 1fr;
  }
  
  .appraisal-card__nutshell dt {
    margin-top: var(--spacing-3);
    border-top: 1px solid var(--neutral-200);
    padding-top: var(--spacing-2);
  }
  
  .appraisal-card__nutshell dt:first-of-type {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
  
  .appraisal-card__donut-chart {
    --size: 100px;
    --thickness: 10px;
  }
  
  .appraisal-card__donut-label {
    font-size: var(--font-size-xl);
  }
}
```

## JavaScript Interactions

```javascript
// Initialize the appraisal card functionality
function initAppraisalCard() {
  const card = document.querySelector('.appraisal-card');
  if (!card) return;
  
  // Tab switching
  const tabButtons = card.querySelectorAll('.appraisal-card__tab-button');
  const tabPanes = card.querySelectorAll('.appraisal-card__tab-pane');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const targetId = button.dataset.tab;
      const targetPane = card.querySelector(`#${targetId}`);
      if (targetPane) targetPane.classList.add('active');
    });
  });
  
  // Image gallery navigation
  const prevButton = card.querySelector('.prev');
  const nextButton = card.querySelector('.next');
  
  if (prevButton && nextButton) {
    // Initialize image array
    const allImages = [];
    let currentImageIndex = 0;
    
    function initImageArray() {
      const mainImg = card.querySelector('.main-thumbnail');
      if (mainImg) allImages.push(mainImg.src);
      
      // Get additional images from signature and age fields
      document.querySelectorAll('[fieldname="signature"] img, [fieldname="age"] img').forEach(img => {
        allImages.push(img.src);
      });
    }
    
    function cycleImages(direction) {
      if (allImages.length <= 1) return;
      
      currentImageIndex = (currentImageIndex + direction + allImages.length) % allImages.length;
      const mainImg = card.querySelector('.main-thumbnail');
      if (mainImg) {
        // Add fade transition
        mainImg.style.opacity = '0';
        mainImg.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
          mainImg.src = allImages[currentImageIndex];
          mainImg.style.opacity = '1';
          mainImg.style.transform = 'scale(1)';
        }, 200);
      }
    }
    
    prevButton.addEventListener('click', () => cycleImages(-1));
    nextButton.addEventListener('click', () => cycleImages(1));
    
    // Initialize images on page load
    initImageArray();
  }
  
  // Donut chart animations
  const donutCharts = card.querySelectorAll('.appraisal-card__donut-chart');
  
  function initDonutCharts() {
    donutCharts.forEach(chart => {
      const percentage = chart.dataset.percentage || 75;
      chart.style.setProperty('--percentage', percentage);
      
      // Add staggered animation
      chart.style.animation = 'none'; // Reset animation
      void chart.offsetWidth; // Trigger reflow
      chart.style.animation = `donutFill 1.5s ease-out forwards`;
    });
  }
  
  // Initialize animations when card is in viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        initDonutCharts();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  
  observer.observe(card);
  
  // Expand/collapse functionality
  const expandButton = card.querySelector('.appraisal-card__expand-button');
  
  if (expandButton) {
    expandButton.addEventListener('click', () => {
      const buttonText = expandButton.querySelector('span');
      const buttonIcon = expandButton.querySelector('svg');
      
      if (card.classList.contains('collapsed')) {
        // Expand
        card.classList.remove('collapsed');
        buttonText.textContent = 'Show Details';
        buttonIcon.style.transform = 'rotate(0deg)';
        card.style.maxHeight = '';
        card.style.overflow = '';
      } else {
        // Collapse
        card.classList.add('collapsed');
        buttonText.textContent = 'Show Summary';
        buttonIcon.style.transform = 'rotate(180deg)';
        card.style.maxHeight = '80px';
        card.style.overflow = 'hidden';
      }
    });
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initAppraisalCard);
```

## Implementation Benefits

1. **Visual Consistency**: Creates a cohesive design language matching the modern chart sections
2. **Improved User Experience**: Smoother interactions, clearer information hierarchy
3. **Better Accessibility**: Improved contrast, keyboard navigation, and screen reader support
4. **Optimized Animation**: Subtle transitions that enhance but don't distract
5. **CSS Variables**: More maintainable code with theme variables
6. **Mobile-First Design**: Fully responsive across all device sizes

## Implementation Steps

1. Replace the existing HTML markup in FULL_TEMPLATE.html with the new structure
2. Update the CSS styles, ensuring to maintain any existing functionality
3. Add the new JavaScript code to handle tab switching, image gallery, and animations
4. Test thoroughly across various device sizes and browsers
5. Ensure all WordPress shortcodes and dynamic content functions correctly

This redesign brings a modern, fresh look to the appraisal card while maintaining all existing functionality. The new design creates a consistent visual language that aligns with the newer sections of the appraisal report, creating a more cohesive and premium user experience.
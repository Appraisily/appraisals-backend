# Dual Title Implementation for Appraisal System

## Overview

We've implemented a dual title system for the appraisal process:

1. **Brief Title**: A concise title (max 60 characters) displayed in the WordPress post title and UI
2. **Detailed Title**: A comprehensive, metadata-rich description (1-2 paragraphs) stored as an ACF field and used by AI agents

## Components Modified

### 1. OpenAI Service (`openai.service.js`)

The OpenAI service now generates three outputs from the merged descriptions:
- Brief title (max 60 characters)
- Detailed title (1-2 paragraphs with rich metadata)
- Merged description (combining appraiser and AI descriptions)

The prompt has been updated to instruct the AI to create these distinct outputs in a structured format.

### 2. WordPress Service (`wordpress.service.js`)

The WordPress service has been updated to:
- Handle the detailed_title as an ACF field
- Keep the briefTitle as the main WordPress post title
- Store the detailedTitle in the new detailed_title ACF field

### 3. Appraisal Service (`appraisal.service.js`)

The Appraisal Service has been updated to:
- Process the new response format from OpenAI with both titles
- Pass both titles to the WordPress service 
- Handle backward compatibility for older appraisals that don't have separate titles

### 4. ACF Field Configuration

A new ACF field has been added:
- **Field Name**: detailed_title
- **Type**: Text Area
- **Purpose**: Store the comprehensive metadata-rich description

## Implementation Steps Completed

1. Enhanced OpenAI service to generate structured output with brief and detailed titles
2. Modified WordPress service to handle storing the detailed title in ACF
3. Updated Appraisal service to process and route both titles appropriately
4. Added documentation in ACF_METADATA.md
5. Created PHP file with instructions for adding the field in WordPress

## Usage

The system now automatically generates both titles during the appraisal process:

1. The brief title appears in WordPress post listings, browser tabs, and UI elements
2. The detailed title is available for AI processing and metadata extraction
3. Both titles are generated with no additional input required from users

## Benefits

- Improved UI with concise, readable titles
- Enhanced backend processing with metadata-rich detailed titles
- Better separation of presentation and data concerns
- AI agent has access to comprehensive information while users see clean, concise titles

## Technical Details

### OpenAI Prompt Format

The prompt now instructs the AI to generate output in this format:
```
BRIEF_TITLE: A concise title for the WordPress post (max 60 characters)
DETAILED_TITLE: A comprehensive 1-2 paragraph description with rich metadata
MERGED_DESCRIPTION: A cohesive summary description of about 200 words
```

### Data Flow

1. User or AI provides descriptions
2. OpenAI merges descriptions and generates both titles
3. Appraisal service processes the titles
4. WordPress service stores brief title as post title and detailed title as ACF field
5. Templates display brief title while AI processes use detailed title

## Future Enhancements

Potential future improvements include:
- Add UI in WordPress admin to view/edit both titles
- Implement analytics to track how detailed titles impact appraisal quality
- Add controls to regenerate either title independently 
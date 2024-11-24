# Appraisals Backend Service - Prompt Structure

This document outlines the structure and requirements for the appraisal report generation system.

## Endpoints

### POST /complete-appraisal-report

Generates metadata and analyzes images for an artwork appraisal.

Required parameters:
- postId: WordPress post ID

Process:
1. Retrieves post title and images from WordPress
2. Processes main image with Google Vision AI to find similar images
3. Generates metadata content using OpenAI GPT-4 Vision
4. Updates WordPress post with generated content

### POST /generate-pdf

Generates a PDF report from the appraisal data.

Required parameters:
- postId: WordPress post ID
- session_ID: (Optional) Custom filename identifier

Process:
1. Clones template from Google Docs
2. Replaces placeholders with content and images
3. Exports to PDF and uploads to Google Drive
4. Returns links to both PDF and source Doc

## WordPress Configuration

Required ACF fields:
- main: Main artwork image
- age: Age-related image
- signature: Signature image
- googlevision: Gallery field for similar images
- Various text fields for metadata:
  - test: Initial artwork type analysis
  - ad_copy: Marketing description
  - age1: Age analysis part 1
  - age2: Age analysis part 2
  - age_text: Age description
  - authorship: Authorship analysis
  - condition: Condition assessment
  - conclusion1: Report conclusion part 1
  - conclusion2: Report conclusion part 2
  - glossary: Art terms glossary
  - signature1: Signature analysis part 1
  - signature2: Signature analysis part 2
  - style: Style analysis
  - table: Artwork specifications
  - valuation_method: Valuation methodology

## Image Requirements

Maximum dimensions (preserving aspect ratio):
- Main image: 400x300 pts
- Signature image: 200x150 pts
- Age image: 300x200 pts

## Content Generation

Each prompt file should:
1. Analyze provided images (main, age, signature)
2. Consider report title information
3. Generate specific content based on prompt type
4. Return well-structured, professional content

## Response Format

All generated content should be:
- Professional and formal in tone
- Well-structured and coherent
- Free of technical jargon unless necessary
- Focused on the specific aspect being analyzed
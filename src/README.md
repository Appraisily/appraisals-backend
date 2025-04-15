# Source Code Organization

This directory contains the organized source code for the appraisals backend. The code structure has been refactored to eliminate duplicated implementations and centralize common utilities.

## Directory Structure

- `services/` - Core backend services with clear responsibilities
  - `openai.js` - OpenAI API integration for content generation
  - `wordpress/` - WordPress API integration services
    - `index.js` - Main entry point for all WordPress functionality
    - `updates.js` - Functions for updating WordPress content
    - `htmlUpdates.js` - Functions for updating HTML content
    - `client.js` - WordPress API client
    - `...` - Other WordPress specific services
  - `utils/` - Shared utility functions
    - `jsonCleaner.js` - JSON processing utilities
    - `promptUtils.js` - Prompt management utilities
  - `constants/` - Static configuration values
    - `reportStructure.js` - Report structure definitions
    - `staticMetadata.js` - Static content by appraisal type
  - `metadataProcessor.js` - Core processing logic for appraisal metadata

- `templates/` - Centralized template management
  - `index.js` - Entry point for accessing template generators

## Code Organization Principles

1. **No Duplicate Implementations** - We've eliminated bridge files and duplicate services.
2. **Direct Imports** - Services are imported directly from their source locations.
3. **Centralized Utilities** - Common functions are centralized in utility modules.
4. **Clear Responsibilities** - Each file has a single, clear responsibility.

## Templates

Template generation logic is organized in the `templates/` directory, which provides a clean interface to the template generators defined in the root `templates` directory.

The skeleton templates used for AI prompting are kept in the root `templates/skeletons/` directory. 
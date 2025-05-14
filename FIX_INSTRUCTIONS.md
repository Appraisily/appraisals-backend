# Docker Build Fix Instructions

We've made the following changes to fix the Docker build issue:

## 1. Updated package.json and package-lock.json

We ran `npm install` to update the package-lock.json file with the new `commander` dependency which was added for the Gemini document generation test script.

## 2. Modified the Dockerfile

Changed the dependency installation command from `npm ci --only=production` to `npm install --only=production` to ensure compatibility with the package.json file. This is important because:

```diff
- RUN npm ci --only=production
+ RUN npm install --only=production
```

The `npm ci` command is stricter and requires exact matching between package.json and package-lock.json. By using `npm install` instead, we ensure that any small discrepancies are resolved during the build.

## 3. Added Local Development Support

Added a `start:local` script to package.json that sets `SKIP_SECRET_MANAGER=true` automatically:

```json
"scripts": {
  "start": "node index.js",
  "start:local": "cross-env SKIP_SECRET_MANAGER=true node index.js",
  "lint": "eslint . --ext .js",
  "test-gemini-doc": "node build-scripts/test-gemini-doc.js"
}
```

## 4. Updated Error Handling for Local Development

Modified the OpenAI client initialization in `services/openai.js` to gracefully handle missing API keys in local development mode by creating a mock client.

## How to Build and Deploy

1. Make sure you have Docker Desktop running
2. From the appraisals-backend directory, run:
   ```
   docker build -t appraisals-backend .
   ```
3. The build should now complete successfully

## Local Development

For local development without Docker, you'll need to:

1. Create a `.env` file in the appraisals-backend directory with:
   ```
   SKIP_SECRET_MANAGER=true
   WORDPRESS_API_URL=https://your-wordpress-site.com/wp-json
   wp_username=your_wordpress_username
   wp_app_password=your_wordpress_app_password
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. Run the service:
   ```
   npm run start:local
   ```

## Notes for Production Deployment

In production, the service will use Google Cloud Secret Manager to retrieve credentials, so you don't need to include them in environment variables directly. The `SKIP_SECRET_MANAGER` environment variable should be omitted or set to `false` in production. 
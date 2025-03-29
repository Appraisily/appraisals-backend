# APPRAISERS Codebase Guidelines

## Build & Run Commands
- **Main Backend**: `npm start` - Runs the Express server
- **Development**: `npm run dev` (if added to package.json)
- **Lint**: Add ESLint with `npm install --save-dev eslint` and run with `npm run lint`
- **Tests**: Add Jest with `npm install --save-dev jest` and run with `npm test`
- **Single test**: `npx jest path/to/test.js -t "test name"` - Run specific test

## Code Style
- **JS/Node**: ES6+, Express middleware pattern, service-based architecture
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Formatting**: 2-space indentation, semicolons required
- **Imports**: Group by: 1) core Node modules, 2) external packages, 3) internal modules
- **Error Handling**: Try/catch blocks for async code, consistent error response format
- **API Responses**: Use standard format: `{ success: true|false, message: "...", details: {...} }`
- **Logging**: Consistent console logging with service prefix: `[ServiceName] Message`

## Architecture
- Express.js backend with RESTful API endpoints
- Service-based design pattern with separate modules for different functionality
- Config management via environment variables and Secret Manager
- Error handling with appropriate HTTP status codes and detailed response messages
# WordPress Integration Guide for Appraisals Backend

This document outlines how the `appraisals-backend` service (and related services like `appraisers-task-queue` that share the `wordpress.service.js`) interacts with the WordPress instance to retrieve and manage appraisal post data.

## 1. Credentials Management

All credentials required to connect to the WordPress REST API are stored securely in **Google Cloud Secret Manager**.

### Secret Names:

The following secrets must be configured in Google Cloud Secret Manager for the service to function correctly:

-   `WORDPRESS_API_URL`: The base URL of your WordPress REST API. 
    *Example: `https://yourdomain.com/wp-json/wp/v2` or a custom namespace like `https://yourdomain.com/wp-json/yourcustomplugin/v1`*
-   `wp_username`: The WordPress username that has the necessary permissions to read and write posts (and any custom post types like 'appraisals').
-   `wp_app_password`: An **Application Password** generated for the `wp_username`. Application Passwords are more secure for API access than using the user's main password.

## 2. Authentication

The service uses **HTTP Basic Authentication** to authenticate with the WordPress REST API.

-   The `wp_username` and `wp_app_password` retrieved from Secret Manager are combined in the format `username:password`.
-   This string is then Base64 encoded.
-   The encoded string is sent in the `Authorization` header with the `Basic` prefix.
    *Example: `Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=`*

## 3. WordPress API URL

-   The base URL for API requests is retrieved from the `WORDPRESS_API_URL` secret in Secret Manager.
-   Specific endpoints are then appended to this base URL.

## 4. Accessing Post Data

The `wordpress.service.js` module provides several methods to interact with WordPress data. Primarily for retrieving post and media information:

### Fetching a Specific Post (e.g., an Appraisal)

-   **Method:** `getPost(postId)`
-   **Endpoint Used:** `GET {WORDPRESS_API_URL}/appraisals/{postId}` (Note: The `/appraisals/` part of the path might be specific to a custom post type or a custom route in your WordPress setup. Standard posts are usually at `/posts/{postId}`).
-   **Headers:**
    -   `Authorization: Basic <base64_credentials>`
    -   `Content-Type: application/json`

### Fetching Media (Images, PDFs, etc.)

-   **Method:** `getMedia(mediaId)`
-   **Endpoint Used:** `GET https://resources.appraisily.com/wp-json/wp/v2/media/{mediaId}`
    *Note: This uses a specific, potentially hardcoded, base URL for media. Ensure this is intended and correct for your setup.*
-   **Headers:**
    -   `Authorization: Basic <base64_credentials>`
    -   `Content-Type: application/json`

### Resolving Image URLs

-   **Method:** `getImageUrl(imageField)`
-   This is a utility method that takes a field value which might be a direct URL, a WordPress media ID, or an object containing a URL. It attempts to resolve it to a full, usable image URL, often by calling `getMedia(mediaId)` if an ID is provided.

## 5. Expected Data Structure (from `getPost`)

When fetching a post (e.g., an appraisal), the service generally expects a JSON object with a structure similar to the standard WordPress REST API response for a post. Key fields include:

```json
{
  "id": 123,                       // Integer: The unique ID of the post.
  "date": "2023-10-27T10:00:00",     // String: ISO8601 date string for when the post was published.
  "date_gmt": "2023-10-27T10:00:00", // String: ISO8601 date string in GMT.
  "guid": {                       // Object: The globally unique identifier for the post.
    "rendered": "https://yourdomain.com/?p=123"
  },
  "modified": "2023-10-27T10:05:00",
  "modified_gmt": "2023-10-27T10:05:00",
  "slug": "my-example-post",         // String: The URL-friendly slug for the post.
  "status": "publish",               // String: The publication status (e.g., 'publish', 'draft', 'pending').
  "type": "post",                  // String: The post type (e.g., 'post', 'page', 'appraisals').
  "link": "https://yourdomain.com/my-example-post/", // String: The canonical URL for the post.
  "title": {                      // Object: The title of the post.
    "rendered": "My Example Post Title"
  },
  "content": {                    // Object: The main content of the post.
    "rendered": "<p>This is the HTML content of the post.</p>\n",
    "protected": false
  },
  "excerpt": {                    // Object: The excerpt or summary of the post.
    "rendered": "<p>This is a short summary.</p>\n",
    "protected": false
  },
  "author": 1,                     // Integer: The ID of the author user.
  "featured_media": 456,           // Integer: The ID of the featured media attachment (if any).
  "comment_status": "open",          // String: Whether comments are open or closed.
  "ping_status": "open",           // String: Whether pings are open or closed.
  "template": "",                  // String: The template file used for the post (if applicable).
  "meta": [],                       // Array or Object: Post metadata fields (often customized).
  "acf": {                        // Object: Advanced Custom Fields data (if ACF plugin is used).
    "value": "1500",
    "detailedtitle": "A Very Detailed Title for the Appraisal",
    "object_type": "Painting",
    "creator": "Artist Name",
    "estimated_age": "c. 1950",
    // ... other ACF fields ...
  },
  "_links": {                     // Object: HAL links for related resources.
    "self": [ { "href": "https://yourdomain.com/wp-json/wp/v2/posts/123" } ],
    "collection": [ { "href": "https://yourdomain.com/wp-json/wp/v2/posts" } ],
    // ... other links ...
  }
}
```

**Important Considerations for Data Structure:**

-   The exact structure, especially within `acf` and `meta` fields, will depend heavily on your specific WordPress configuration, active plugins (like Advanced Custom Fields), and custom post type definitions.
-   Fields like `title.rendered` and `content.rendered` provide the HTML-ready output.

## 6. How to Use Credentials and Fetch Data (Conceptual Steps)

While the `wordpress.service.js` abstracts these steps, here's a conceptual flow:

1.  **Initialize Service:** On application startup, the `WordPressService` initializes.
2.  **Fetch Secrets:** During initialization, it connects to Google Cloud Secret Manager and retrieves `WORDPRESS_API_URL`, `wp_username`, and `wp_app_password`.
3.  **Prepare Auth Header:** It creates the Base64 encoded `Authorization` header.
4.  **Make API Request:** When a function like `getPost(postId)` is called:
    a.  It constructs the full API endpoint URL (e.g., `{WORDPRESS_API_URL}/appraisals/{postId}`).
    b.  It makes an HTTP GET request to this URL.
    c.  It includes the prepared `Authorization` header and `Content-Type: application/json`.
5.  **Process Response:** It parses the JSON response from WordPress and returns it.

To use this in a new service or part of the application that needs to fetch WordPress data directly (if not using the existing `wordpress.service.js`):

1.  Ensure your new service has access to the Google Cloud project and the necessary IAM permissions to read secrets from Secret Manager.
2.  Implement logic to fetch the named secrets (`WORDPRESS_API_URL`, `wp_username`, `wp_app_password`).
3.  Construct the Basic Authentication header as described above.
4.  Use an HTTP client (like `node-fetch` or `axios`) to make requests to the WordPress REST API endpoints, including the `Authorization` header.

This guide should provide a comprehensive overview for interacting with your WordPress instance. 
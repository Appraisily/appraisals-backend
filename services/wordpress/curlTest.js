const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const config = require('../../config');

async function testWithCurl(postId) {
  const endpoint = `${config.WORDPRESS_API_URL}/appraisals/${postId}?_fields=acf,title,date`;
  const auth = Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64');
  
  const command = `curl -v -H "Authorization: Basic ${auth}" "${endpoint}"`;

  try {
    const { stdout, stderr } = await execAsync(command);
    return {
      success: true,
      curl: {
        command: command.replace(auth, '[REDACTED]'),
        stdout,
        stderr
      }
    };
  } catch (error) {
    return {
      success: false,
      curl: {
        command: command.replace(auth, '[REDACTED]'),
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      }
    };
  }
}
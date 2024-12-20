const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function runNetworkDiagnostics(host) {
  try {
    // Run traceroute
    const traceroute = await execAsync(`traceroute ${host}`).catch(err => ({
      stdout: '',
      stderr: `Traceroute failed: ${err.message}`
    }));

    // Run ping
    const ping = await execAsync(`ping -c 4 ${host}`).catch(err => ({
      stdout: '',
      stderr: `Ping failed: ${err.message}`
    }));

    // Run DNS lookup
    const nslookup = await execAsync(`nslookup ${host}`).catch(err => ({
      stdout: '',
      stderr: `DNS lookup failed: ${err.message}`
    }));

    return {
      success: true,
      diagnostics: {
        traceroute: {
          output: traceroute.stdout,
          error: traceroute.stderr
        },
        ping: {
          output: ping.stdout,
          error: ping.stderr
        },
        dns: {
          output: nslookup.stdout,
          error: nslookup.stderr
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
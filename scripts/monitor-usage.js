#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const config = {
  baseUrl: process.env.STYLESCOUT_URL || 'http://localhost:3000',
  adminKey: process.env.ADMIN_API_KEY || 'stylescout_admin_2025_secure_key'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'usage';

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-Admin-Key': config.adminKey
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Display usage statistics
async function showUsage() {
  try {
    const data = await makeRequest('/api/admin/usage');
    
    console.log(`\n${colors.bright}StyleScout API Usage Report${colors.reset}`);
    console.log(`${colors.cyan}Date: ${data.date}${colors.reset}\n`);
    
    for (const [provider, stats] of Object.entries(data.providers)) {
      const percent = stats.percentUsed;
      let color = colors.green;
      
      if (percent >= 90) color = colors.red;
      else if (percent >= 70) color = colors.yellow;
      
      const bar = createProgressBar(percent);
      
      console.log(`${colors.bright}${provider}:${colors.reset}`);
      console.log(`  Usage: ${color}${stats.requests}/${stats.limit}${colors.reset} (${percent}%)`);
      console.log(`  ${bar}`);
      console.log(`  Remaining: ${stats.remaining} requests\n`);
    }
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Create a visual progress bar
function createProgressBar(percent) {
  const width = 30;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  
  let color = colors.green;
  if (percent >= 90) color = colors.red;
  else if (percent >= 70) color = colors.yellow;
  
  return `[${color}${'█'.repeat(filled)}${colors.reset}${'-'.repeat(empty)}]`;
}

// Reset a provider
async function resetProvider(provider) {
  if (!provider) {
    console.error(`${colors.red}Error: Provider name required${colors.reset}`);
    console.log('Usage: node monitor-usage.js reset <provider>');
    process.exit(1);
  }
  
  try {
    const data = await makeRequest(`/api/admin/reset/${provider}`, 'POST');
    console.log(`${colors.green}✓ ${data.message}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Reset all providers
async function resetAll() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question(`${colors.yellow}Are you sure you want to reset ALL counters? (yes/no): ${colors.reset}`, async (answer) => {
    readline.close();
    
    if (answer.toLowerCase() === 'yes') {
      try {
        const data = await makeRequest('/api/admin/reset-all', 'POST');
        console.log(`${colors.green}✓ ${data.message}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        process.exit(1);
      }
    } else {
      console.log('Reset cancelled.');
    }
  });
}

// Show configuration
async function showConfig() {
  try {
    const data = await makeRequest('/api/admin/config');
    
    console.log(`\n${colors.bright}StyleScout Rate Limit Configuration${colors.reset}`);
    console.log(`${colors.cyan}Current Provider: ${data.currentProvider}${colors.reset}\n`);
    
    console.log(`${colors.bright}Daily Limits:${colors.reset}`);
    for (const [provider, limit] of Object.entries(data.limits)) {
      console.log(`  ${provider}: ${limit} requests/day`);
    }
    
    console.log(`\n${colors.bright}Admin Endpoints:${colors.reset}`);
    for (const [name, endpoint] of Object.entries(data.adminEndpoints)) {
      console.log(`  ${name}: ${endpoint}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  console.log(`
${colors.bright}StyleScout Usage Monitor${colors.reset}

${colors.cyan}Usage:${colors.reset}
  node monitor-usage.js [command] [options]

${colors.cyan}Commands:${colors.reset}
  usage              Show current usage statistics (default)
  reset <provider>   Reset a specific provider's counter
  reset-all          Reset all counters
  config             Show rate limit configuration
  help               Show this help message

${colors.cyan}Environment Variables:${colors.reset}
  STYLESCOUT_URL     Base URL of your StyleScout instance
                     (default: http://localhost:3000)
  ADMIN_API_KEY      Admin API key for authentication
                     (default: stylescout_admin_2025_secure_key)

${colors.cyan}Examples:${colors.reset}
  node monitor-usage.js
  node monitor-usage.js reset openai
  STYLESCOUT_URL=https://myapp.onrender.com node monitor-usage.js usage
`);
}

// Main execution
async function main() {
  switch (command) {
    case 'usage':
      await showUsage();
      break;
    case 'reset':
      await resetProvider(args[1]);
      break;
    case 'reset-all':
      await resetAll();
      break;
    case 'config':
      await showConfig();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
      showHelp();
      process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});
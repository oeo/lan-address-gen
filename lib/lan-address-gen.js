#!/usr/bin/env node

const crypto = require('crypto');
const { exec } = require('child_process');

function parsePattern(pattern = '192.168') {
  const parts = pattern.split('.');
  if (parts.length > 4) throw new Error('invalid ip pattern: too many segments');
  return parts.filter(p => p !== 'x').join('.');
}

function stringToIp(inputString, salt = '', pattern = '192.168') {
  const hash = crypto.createHash('sha256');
  hash.update(inputString + salt);
  const hashHex = hash.digest('hex');
  const hashInt = parseInt(hashHex.slice(-6), 16);
  
  const prefix = parsePattern(pattern);
  const prefixParts = prefix.split('.').length;
  
  if (prefixParts === 2) {
    const mappedInt = hashInt % (2 ** 16);
    const thirdOctet = (mappedInt >> 8) & 255;
    const fourthOctet = mappedInt & 255;
    return { prefix, thirdOctet, fourthOctet };
  } else if (prefixParts === 1) {
    const mappedInt = hashInt % (2 ** 24);
    const secondOctet = (mappedInt >> 16) & 255;
    const thirdOctet = (mappedInt >> 8) & 255;
    const fourthOctet = mappedInt & 255;
    return { prefix, secondOctet, thirdOctet, fourthOctet };
  } else {
    throw new Error('invalid ip pattern: must leave room for at least 2 octets');
  }
}

function ipToString(ip) {
  if (!ip.secondOctet) {
    return `${ip.prefix}.${ip.thirdOctet}.${ip.fourthOctet}`;
  }
  return `${ip.prefix}.${ip.secondOctet}.${ip.thirdOctet}.${ip.fourthOctet}`;
}

function incrementIp(ip) {
  const hasSecondOctet = 'secondOctet' in ip;
  
  ip.fourthOctet++;
  if (ip.fourthOctet > 255) {
    ip.fourthOctet = 0;
    ip.thirdOctet++;
    if (ip.thirdOctet > 255) {
      ip.thirdOctet = 0;
      if (hasSecondOctet) {
        ip.secondOctet++;
        if (ip.secondOctet > 255) {
          ip.secondOctet = 0;
        }
      }
    }
  }
  return ip;
}

function pingCheck(ip) {
  return new Promise((resolve) => {
    exec(`ping -c 1 -W 1 ${ip}`, (error) => {
      resolve(!error);
    });
  });
}

async function findAvailableIp(initialIp) {
  let currentIp = initialIp;
  while (await pingCheck(ipToString(currentIp))) {
    currentIp = incrementIp(currentIp);
  }
  return currentIp;
}

function printUsage() {
  console.log('Usage: lan-address-gen <input_string> [options]');
  console.log('Generate a deterministic LAN address from the input string');
  console.log('Options:');
  console.log('  --ping          Check if the generated IP is already in use and find an available one');
  console.log('  --verbose       Display detailed output');
  console.log('  --help          Display this help message');
  console.log('  --salt <salt>   Provide a salt for the hash (overrides LAN_ADDRESS_SALT env variable)');
  console.log('  --pattern <pat> IP pattern to use (default: 192.168)');
  console.log('');
  console.log('Pattern examples:');
  console.log('  192.168   - generates 192.168.x.x addresses (default)');
  console.log('  10        - generates 10.x.x.x addresses');
  console.log('  172.16    - generates 172.16.x.x addresses');
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    ping: args.includes('--ping'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help'),
    salt: '',
    pattern: '192.168'
  };

  // Check for --salt argument
  const saltIndex = args.indexOf('--salt');
  if (saltIndex !== -1 && saltIndex + 1 < args.length) {
    options.salt = args[saltIndex + 1];
  } else {
    options.salt = process.env.LAN_ADDRESS_SALT || '';
  }

  // Check for --pattern argument
  const patternIndex = args.indexOf('--pattern');
  if (patternIndex !== -1 && patternIndex + 1 < args.length) {
    options.pattern = args[patternIndex + 1];
  }

  if (options.help || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const inputString = args.find(arg => !arg.startsWith('--') && arg !== options.salt && arg !== options.pattern);

  if (!inputString) {
    console.error('Error: Input string is required');
    printUsage();
    process.exit(1);
  }

  if (options.verbose) {
    if (options.salt) console.log(`Using salt: ${options.salt}`);
    console.log(`Using pattern: ${options.pattern}`);
  }

  const initialIp = stringToIp(inputString, options.salt, options.pattern);
  if (options.verbose) console.log(`Generated IP: ${ipToString(initialIp)}`);

  let finalIp = initialIp;

  if (options.ping) {
    if (options.verbose) console.log('Checking for an available IP...');
    finalIp = await findAvailableIp(initialIp, options.verbose);
    if (options.verbose) console.log(`Available IP found: ${ipToString(finalIp)}`);
  }

  console.log(ipToString(finalIp));
}

if (!module.parent || process.env.LAN_ADDRESS_CLI) {
  main().catch(console.error);
}

module.exports = {
  stringToIp,
  ipToString,
  incrementIp
};

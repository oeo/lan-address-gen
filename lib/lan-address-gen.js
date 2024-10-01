#!/usr/bin/env node

const crypto = require('crypto');
const { exec } = require('child_process');

function stringToIp(inputString, salt = '') {
  const hash = crypto.createHash('sha256');
  hash.update(inputString + salt);
  const hashHex = hash.digest('hex');
  const hashInt = parseInt(hashHex.slice(-6), 16);
  const mappedInt = hashInt % (2 ** 24);
  const secondOctet = (mappedInt >> 16) & 255;
  const thirdOctet = (mappedInt >> 8) & 255;
  const fourthOctet = mappedInt & 255;
  return { secondOctet, thirdOctet, fourthOctet };
}

function ipToString({ secondOctet, thirdOctet, fourthOctet }) {
  return `10.${secondOctet}.${thirdOctet}.${fourthOctet}`;
}

function incrementIp({ secondOctet, thirdOctet, fourthOctet }) {
  fourthOctet++;
  if (fourthOctet > 255) {
    fourthOctet = 0;
    thirdOctet++;
    if (thirdOctet > 255) {
      thirdOctet = 0;
      secondOctet++;
      if (secondOctet > 255) {
        secondOctet = 0;
      }
    }
  }
  return { secondOctet, thirdOctet, fourthOctet };
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
  console.log('  --ping        Check if the generated IP is already in use and find an available one');
  console.log('  --verbose     Display detailed output');
  console.log('  --help        Display this help message');
  console.log('  --salt <salt> Provide a salt for the hash (overrides LAN_ADDRESS_SALT env variable)');
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    ping: args.includes('--ping'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help'),
    salt: ''
  };

  // Check for --salt argument
  const saltIndex = args.indexOf('--salt');
  if (saltIndex !== -1 && saltIndex + 1 < args.length) {
    options.salt = args[saltIndex + 1];
  } else {
    // If no --salt argument, check for LAN_ADDRESS_SALT env variable
    options.salt = process.env.LAN_ADDRESS_SALT || '';
  }

  if (options.help || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const inputString = args.find(arg => !arg.startsWith('--') && arg !== options.salt);

  if (!inputString) {
    console.error('Error: Input string is required');
    printUsage();
    process.exit(1);
  }

  if (options.verbose && options.salt) {
    console.log(`Using salt: ${options.salt}`);
  }

  const initialIp = stringToIp(inputString, options.salt);
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

module.exports = { stringToIp, ipToString, incrementIp };



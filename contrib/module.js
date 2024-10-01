// vim: set expandtab tabstop=2 shiftwidth=2 softtabstop=2
const crypto = require('crypto');

function stringToIp(inputString) {
  const hash = crypto.createHash('sha256');
  hash.update(inputString);

  const hashHex = hash.digest('hex');

  const hashInt = parseInt(hashHex.slice(-6), 16);
  const mappedInt = hashInt % (2 ** 24);

  const secondOctet = (mappedInt >> 16) & 255;
  const thirdOctet = (mappedInt >> 8) & 255;
  const fourthOctet = mappedInt & 255;

  return `10.${secondOctet}.${thirdOctet}.${fourthOctet}`;
}

// example
if (!module.parent) {
  const testStrings = ["example1", "example2", "test123", "longerstringexample"];

  testStrings.forEach(testString => {
    const ip = stringToIp(testString);
    console.log(`String: ${testString} -> IP: ${ip}`);
  });
}

module.exports = { stringToIp }


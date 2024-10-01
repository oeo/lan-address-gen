const assert = require('assert');
const crypto = require('crypto');

const { stringToIp, ipToString, incrementIp } = require('./lib/lan-address-gen.js');

const TEST_TIMEOUT = 30000;

// timeout wrapper function
function withTimeout(testFn, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);

    try {
      testFn();
      clearTimeout(timer);
      resolve();
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

// test suite
async function runTests() {
  const tests = [
    testBasicFunctionality,
    testCollisions,
    testDistribution,
    testIncrementIP,
  ];

  for (const test of tests) {
    try {
      await withTimeout(test, TEST_TIMEOUT);
      console.log(`🚀 ${test.name} passed`);
    } catch (error) {
      console.error(`😡 ${test.name} failed: ${error.message}`);
    }
  }
}

function testBasicFunctionality() {
  const result = ipToString(stringToIp('test input'));
  assert.match(result, /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
}

function testCollisions() {
  const iterations = 10000;
  const ips = new Set();

  for (let i = 0; i < iterations; i++) {
    const input = crypto.randomBytes(16).toString('hex');
    const ip = ipToString(stringToIp(input));
    ips.add(ip);
  }

  const collisionRate = (iterations - ips.size) / iterations;
  console.log(`Collision rate: ${(collisionRate * 100).toFixed(2)}%`);
  assert(collisionRate < 0.01, 'Collision rate is too high');
}

function testDistribution() {
  const iterations = 100000;
  const distribution = Array(256).fill(0);

  for (let i = 0; i < iterations; i++) {
    const input = crypto.randomBytes(16).toString('hex');
    const ip = stringToIp(input);
    distribution[ip.secondOctet]++;
  }

  const min = Math.min(...distribution);
  const max = Math.max(...distribution);
  const range = max - min;
  const averageUse = iterations / 256;

  console.log(`Distribution range: ${range}`);
  console.log(`Min occurrences: ${min}, Max occurrences: ${max}`);
  console.log(`Average occurrences: ${averageUse.toFixed(2)}`);

  // chi-square test
  const chiSquare = distribution.reduce((sum, observed) => {
    const expected = averageUse;
    return sum + Math.pow(observed - expected, 2) / expected;
  }, 0);

  const degreesOfFreedom = 255;

  console.log(`Chi-square value: ${chiSquare.toFixed(2)}`);

  // calculate p-value (this is an approximation)
  const pValue = 1 - require('jstat').chisquare.cdf(chiSquare, degreesOfFreedom);
  console.log(`Approximate p-value: ${pValue.toFixed(4)}`);

  // Test if p-value is greater than 0.01 (99% confidence level)
  assert(pValue > 0.01, 'Distribution is not uniform enough (chi-square test at 99% confidence)');

  // test for range (allowing a bit more tolerance)
  const tolerance = averageUse * 0.35;
  assert(range < tolerance, 'Distribution range is too large');
}

// test ip increment function
function testIncrementIP() {
  let ip = { secondOctet: 255, thirdOctet: 255, fourthOctet: 255 };
  ip = incrementIp(ip);
  assert.deepStrictEqual(ip, { secondOctet: 0, thirdOctet: 0, fourthOctet: 0 });

  ip = { secondOctet: 10, thirdOctet: 255, fourthOctet: 255 };
  ip = incrementIp(ip);
  assert.deepStrictEqual(ip, { secondOctet: 11, thirdOctet: 0, fourthOctet: 0 });
}

runTests().then(() => console.log('All tests completed'));

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
    testPatterns
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
  // Default pattern (192.168.x.x)
  const result = ipToString(stringToIp('test input'));
  assert.match(result, /^192\.168\.\d{1,3}\.\d{1,3}$/);

  // Custom pattern (10.x.x.x)
  const tenResult = ipToString(stringToIp('test input', '', '10'));
  assert.match(tenResult, /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
}

function testCollisions() {
  const iterations = 10000;
  const ips = new Set();
  const tenIps = new Set();

  for (let i = 0; i < iterations; i++) {
    const input = crypto.randomBytes(16).toString('hex');
    const ip = ipToString(stringToIp(input));
    const tenIp = ipToString(stringToIp(input, '', '10'));
    ips.add(ip);
    tenIps.add(tenIp);
  }

  const collisionRate = (iterations - ips.size) / iterations;
  const tenCollisionRate = (iterations - tenIps.size) / iterations;
  console.log(`Collision rate (192.168.x.x): ${(collisionRate * 100).toFixed(2)}%`);
  console.log(`Collision rate (10.x.x.x): ${(tenCollisionRate * 100).toFixed(2)}%`);

  // More lenient threshold for 192.168.x.x due to smaller address space
  assert(collisionRate < 0.10, 'Collision rate is too high for 192.168.x.x range (>10%)');
  // Stricter threshold for 10.x.x.x due to larger address space
  assert(tenCollisionRate < 0.01, 'Collision rate is too high for 10.x.x.x range (>1%)');
}

function testDistribution() {
  const iterations = 100000;
  const distribution = Array(256).fill(0);
  const tenDistribution = Array(256).fill(0);

  for (let i = 0; i < iterations; i++) {
    const input = crypto.randomBytes(16).toString('hex');
    const ip = stringToIp(input);
    const tenIp = stringToIp(input, '', '10');
    distribution[ip.thirdOctet]++;
    tenDistribution[tenIp.secondOctet]++;
  }

  // Test 192.168.x.x range
  const min = Math.min(...distribution);
  const max = Math.max(...distribution);
  const range = max - min;
  const averageUse = iterations / 256;

  console.log('192.168.x.x range:');
  console.log(`Distribution range: ${range}`);
  console.log(`Min occurrences: ${min}, Max occurrences: ${max}`);
  console.log(`Average occurrences: ${averageUse.toFixed(2)}`);

  // Test 10.x.x.x range
  const tenMin = Math.min(...tenDistribution);
  const tenMax = Math.max(...tenDistribution);
  const tenRange = tenMax - tenMin;
  const tenAverageUse = iterations / 256;

  console.log('\n10.x.x.x range:');
  console.log(`Distribution range: ${tenRange}`);
  console.log(`Min occurrences: ${tenMin}, Max occurrences: ${tenMax}`);
  console.log(`Average occurrences: ${tenAverageUse.toFixed(2)}`);

  // chi-square test for both ranges
  const chiSquare = distribution.reduce((sum, observed) => {
    const expected = averageUse;
    return sum + Math.pow(observed - expected, 2) / expected;
  }, 0);

  const tenChiSquare = tenDistribution.reduce((sum, observed) => {
    const expected = tenAverageUse;
    return sum + Math.pow(observed - expected, 2) / expected;
  }, 0);

  const degreesOfFreedom = 255;

  console.log(`\n192.168.x.x Chi-square value: ${chiSquare.toFixed(2)}`);
  console.log(`10.x.x.x Chi-square value: ${tenChiSquare.toFixed(2)}`);

  // calculate p-values
  const pValue = 1 - require('jstat').chisquare.cdf(chiSquare, degreesOfFreedom);
  const tenPValue = 1 - require('jstat').chisquare.cdf(tenChiSquare, degreesOfFreedom);
  console.log(`192.168.x.x Approximate p-value: ${pValue.toFixed(4)}`);
  console.log(`10.x.x.x Approximate p-value: ${tenPValue.toFixed(4)}`);

  assert(pValue > 0.01, 'Distribution is not uniform enough for 192.168.x.x range (chi-square test at 99% confidence)');
  assert(tenPValue > 0.01, 'Distribution is not uniform enough for 10.x.x.x range (chi-square test at 99% confidence)');

  const tolerance = averageUse * 0.35;
  assert(range < tolerance, 'Distribution range is too large for 192.168.x.x range');
  assert(tenRange < tolerance, 'Distribution range is too large for 10.x.x.x range');
}

function testIncrementIP() {
  // Test 192.168.x.x range
  let ip = { prefix: '192.168', thirdOctet: 255, fourthOctet: 255 };
  ip = incrementIp(ip);
  assert.deepStrictEqual(ip, { prefix: '192.168', thirdOctet: 0, fourthOctet: 0 });

  ip = { prefix: '192.168', thirdOctet: 10, fourthOctet: 255 };
  ip = incrementIp(ip);
  assert.deepStrictEqual(ip, { prefix: '192.168', thirdOctet: 11, fourthOctet: 0 });

  // Test 10.x.x.x range
  let tenIp = { prefix: '10', secondOctet: 255, thirdOctet: 255, fourthOctet: 255 };
  tenIp = incrementIp(tenIp);
  assert.deepStrictEqual(tenIp, { prefix: '10', secondOctet: 0, thirdOctet: 0, fourthOctet: 0 });

  tenIp = { prefix: '10', secondOctet: 10, thirdOctet: 255, fourthOctet: 255 };
  tenIp = incrementIp(tenIp);
  assert.deepStrictEqual(tenIp, { prefix: '10', secondOctet: 11, thirdOctet: 0, fourthOctet: 0 });
}

function testPatterns() {
  // Test various patterns
  const patterns = {
    '192.168': /^192\.168\.\d{1,3}\.\d{1,3}$/,
    '10': /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    '172.16': /^172\.16\.\d{1,3}\.\d{1,3}$/,
    '172.20': /^172\.20\.\d{1,3}\.\d{1,3}$/
  };

  for (const [pattern, regex] of Object.entries(patterns)) {
    const result = ipToString(stringToIp('test', '', pattern));
    assert.match(result, regex, `Pattern ${pattern} failed to match ${regex}`);
  }

  // Test invalid patterns
  assert.throws(() => stringToIp('test', '', '192.168.1.1'), /invalid ip pattern/);
  assert.throws(() => stringToIp('test', '', '192.168.1'), /invalid ip pattern/);
}

runTests().then(() => console.log('All tests completed'));

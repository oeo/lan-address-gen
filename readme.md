# lan-address-gen

this tool (and lib) generates lan addresses using deterministic static
hashing. it maps input strings to ip addresses within private ip ranges,
defaulting to 192.168.x.x but supporting other patterns like 10.x.x.x.

*it has no non-native deps to run and only requires jest to run the test suite.*

i use this as part of my homelab toolkit for static ip assignment.

## how it works

1. takes an input string (and optional salt)
1. creates a sha-256 hash of the string
1. uses the last 24 bits of the hash to generate a number
1. maps this number to an ip in the specified range:
   - 192.168.x.x (default) - 65,536 possible addresses
   - 10.x.x.x (with --pattern 10) - 16,777,216 possible addresses
   - 172.16.x.x (with --pattern 172.16) - 65,536 possible addresses
   - etc.

note that if the `--ping` option is provided it will attempt to verify
that it cannot contact the address via ping before returning the address.
if it can, it will increment the ip address until it finds an available
address and return that.

## collision rates

due to the different sizes of address spaces, collision rates vary:
- 192.168.x.x and other /16 ranges: ~7-8% collisions with 10k inputs
- 10.x.x.x and other /8 ranges: ~0.04% collisions with 10k inputs

if collisions are a concern, you can:
1. use a larger address space (like 10.x.x.x)
2. add a salt to your inputs
3. verify availability with --ping

## installation

global install:

```bash
npm install -g lan-address-gen
```

local install:

```bash
npm install lan-address-gen
```

## usage

### cli

```bash
lan-address-gen <input_string> [options]

options:
  --ping          check if the ip is in use and find an available one
  --verbose       show more details
  --help          display help
  --salt <salt>   add some spice to your hash
  --pattern <pat> ip pattern to use (default: 192.168)

pattern examples:
  192.168   - generates 192.168.x.x addresses (default)
  10        - generates 10.x.x.x addresses
  172.16    - generates 172.16.x.x addresses
```

simple (using default 192.168.x.x pattern):

```bash
lan-address-gen proxmox

192.168.140.108
```

using 10.x.x.x pattern:

```bash
lan-address-gen proxmox --pattern 10

10.248.60.218
```

using 172.16.x.x pattern:

```bash
lan-address-gen proxmox --pattern 172.16

172.16.140.108
```

specify a custom salt:

```bash
lan-address-gen proxmox --salt test

192.168.140.108
```

verbose with ping verification:

```bash
lan-address-gen proxmox --ping --verbose

Generated IP: 192.168.140.108
Checking for an available IP...
Available IP found: 192.168.140.108
192.168.140.108
```

### module

```javascript
const { stringToIp, ipToString } = require('lan-address-gen');

// default pattern (192.168.x.x)
const ip = ipToString(stringToIp('proxmox', 'optional salt'));
console.log(ip); // outputs something like 192.168.45.67

// custom pattern (10.x.x.x)
const tenIp = ipToString(stringToIp('proxmox', 'optional salt', '10'));
console.log(tenIp); // outputs something like 10.45.67.89

// custom pattern (172.16.x.x)
const corpIp = ipToString(stringToIp('proxmox', 'optional salt', '172.16'));
console.log(corpIp); // outputs something like 172.16.45.67
```

you can also set a salt with the LAN_ADDRESS_SALT environment variable
if you use the module programmatically.

## development

run tests with:

```bash
npm test
```

here's what you should see:

```bash
🚀 testBasicFunctionality passed
Collision rate (192.168.x.x): 7.56%
Collision rate (10.x.x.x): 0.04%
🚀 testCollisions passed
Distribution range: 108
Min occurrences: 337, Max occurrences: 445
Average occurrences: 390.63
Chi-square value: 281.18
Approximate p-value: 0.1249
🚀 testDistribution passed
🚀 testIncrementIP passed
🚀 testPatterns passed
All tests completed
```

looks good, right?

## notes

this is just for fun. in the real world, think about:

- hash collisions (they happen, especially in smaller ranges)
- your network's rules
- security stuff (predictable ips aren't always great)

use responsibly or irresponsibly

## license

mit

## contrib

prs welcome.



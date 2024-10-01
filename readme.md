# lan-address-gen

this tool (and lib) generates lan addresses using deterministic static
hashing. it maps input strings to ip addresses within the 10.0.0.0/8 private
ip range.

*it has no non-native deps to run and only requires jest to run the test suite.*

i use this as part of my homelab toolkit for static ip assignment.

## how it works

1. takes an input string (and optional salt)
1. creates a sha-256 hash of the string
1. uses the last 24 bits of the hash to generate a number
1. maps this number to an ip in the 10.x.x.x range

note that if the `--ping` option is provided it will attempt to verify
that it cannot contact the address via ping before returning the address.
if it can, it will increment the ip address until it finds an available
address and return that.

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
  --ping        check if the ip is in use and find an available one
  --verbose     show more details
  --help        display help
  --salt <salt> add some spice to your hash
```

#### simple
```bash
lan-address-gen proxmox

10.248.60.218
```

#### custom salt
```bash
lan-address-gen proxmox --salt test

10.231.140.108
```

#### verbose with ping verification
```bash
lan-address-gen proxmox --ping --verbose

Generated IP: 10.248.60.218
Checking for an available IP...
Available IP found: 10.248.60.218
10.248.60.218
```

### module

```bash
const { stringToIp, ipToString } = require('lan-address-gen');

const ip = ipToString(stringToIp('proxmox', 'optional salt'));
console.log(ip); // outputs something like 10.123.45.67
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
Collision rate: 0.02%
🚀 testCollisions passed
Distribution range: 108
Min occurrences: 337, Max occurrences: 445
Average occurrences: 390.63
Chi-square value: 281.18
Approximate p-value: 0.1249
🚀 testDistribution passed
🚀 testIncrementIP passed
All tests completed
```

looks good, right?

## notes

this is just for fun. in the real world, think about:

- hash collisions (they happen)
- your network's rules
- security stuff (predictable ips aren't always great)

use responsibly or irresponsibly

## license

mit

## contrib

prs welcome.



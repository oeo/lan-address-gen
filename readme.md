# deterministic lan address generators

this script provides examples of how to create lan addresses using deterministic static hashing. it's designed to map input strings to ip addresses within the 10.0.0.0/8 private ip range.

## how it works

1. takes an input string
2. creates a sha-256 hash of the string
3. uses the last 24 bits of the hash to generate a number
4. maps this number to an ip in the 10.x.x.x range

## usage

the script includes example usage with test strings. you can modify these or add your own input strings to see how they map to ip addresses.

## note

this is for demonstration purposes only. in a real-world scenario, consider:

- potential hash collisions
- network requirements and policies
- security implications of predictable ip assignments

use responsibly and adapt as needed for your specific use case.

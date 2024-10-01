import hashlib

def string_to_ip(input_string):
    hash_object = hashlib.sha256(input_string.encode())
    hash_hex = hash_object.hexdigest()

    hash_int = int(hash_hex[-6:], 16)
    mapped_int = hash_int % (2**24)

    second_octet = (mapped_int >> 16) & 255
    third_octet = (mapped_int >> 8) & 255
    fourth_octet = mapped_int & 255

    return f"10.{second_octet}.{third_octet}.{fourth_octet}"

test_strings = ["example1", "example2", "test123", "longerstringexample"]

for test_string in test_strings:
    ip = string_to_ip(test_string)
    print(f"String: {test_string} -> IP: {ip}")


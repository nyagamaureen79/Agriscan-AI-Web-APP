from base64 import b64encode
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5

# Load and parse the X.509 certificate
with open("sandbox.pem", "rb") as f:
    cert_data = f.read()

cert = x509.load_pem_x509_certificate(cert_data, default_backend())


# Extract the public key from the certificate
pub_key = cert.public_key().public_bytes(
    encoding=None,
    format=None
)

# Import that into PyCryptodome
rsa_key = RSA.importKey(pub_key)
cipher = PKCS1_v1_5.new(rsa_key)

# Replace with your actual initiator password
initiator_password = "YOUR_INITIATOR_PASSWORD_HERE"

# Encrypt and encode
encrypted = cipher.encrypt(initiator_password.encode())
encoded = b64encode(encrypted).decode()

print("\n✅ Your SecurityCredential:\n")
print(encoded)

#!/usr/bin/env python3
"""
Secret Key Generator for JWT HS256 Algorithm
Generates cryptographically secure secret keys for JWT tokens.
"""

import secrets
import string
import base64
import os
from datetime import datetime


def generate_random_string(length=64):
    """Generate a random string with letters, digits, and special characters."""
    characters = string.ascii_letters + string.digits + "!@#$%^&*()_+-=[]{}|;:,.<>?"
    return ''.join(secrets.choice(characters) for _ in range(length))


def generate_base64_key(length=32):
    """Generate a base64 encoded key."""
    random_bytes = secrets.token_bytes(length)
    return base64.urlsafe_b64encode(random_bytes).decode('utf-8').rstrip('=')


def generate_hex_key(length=32):
    """Generate a hexadecimal key."""
    return secrets.token_hex(length)


def generate_strong_secret_key():
    """Generate a strong secret key suitable for HS256."""
    # Generate 32 random bytes and encode as base64
    return generate_base64_key(32)


def main():
    """Main function to generate and display secret keys."""
    print("🔐 JWT Secret Key Generator for HS256 Algorithm")
    print("=" * 60)
    print(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Generate different types of keys
    print("1. Strong Base64 Key (Recommended for HS256):")
    strong_key = generate_strong_secret_key()
    print(f"   {strong_key}")
    print()
    
    print("2. Hexadecimal Key:")
    hex_key = generate_hex_key(32)
    print(f"   {hex_key}")
    print()
    
    print("3. Random String Key (64 characters):")
    random_key = generate_random_string(64)
    print(f"   {random_key}")
    print()
    
    print("4. Extra Strong Key (48 bytes):")
    extra_strong = generate_base64_key(48)
    print(f"   {extra_strong}")
    print()
    
    print("=" * 60)
    print("📝 Usage Instructions:")
    print("1. Copy one of the keys above")
    print("2. Add it to your .env file:")
    print(f"   SECRET_KEY={strong_key}")
    print()
    print("⚠️  Security Notes:")
    print("- Keep your secret key private and secure")
    print("- Never commit secret keys to version control")
    print("- Use different keys for development and production")
    print("- The first key (Base64) is recommended for HS256")
    print()
    
    # Ask if user wants to save to .env
    save_to_env = input("💾 Do you want to save the recommended key to .env file? (y/n): ").lower().strip()
    
    if save_to_env in ['y', 'yes']:
        env_file = ".env"
        if os.path.exists(env_file):
            # Read existing .env file
            with open(env_file, 'r') as f:
                lines = f.readlines()
            
            # Update or add SECRET_KEY
            updated = False
            for i, line in enumerate(lines):
                if line.startswith('SECRET_KEY='):
                    lines[i] = f'SECRET_KEY={strong_key}\n'
                    updated = True
                    break
            
            if not updated:
                lines.append(f'SECRET_KEY={strong_key}\n')
            
            # Write back to file
            with open(env_file, 'w') as f:
                f.writelines(lines)
            
            print(f"✅ Secret key saved to {env_file}")
        else:
            # Create new .env file
            with open(env_file, 'w') as f:
                f.write(f'SECRET_KEY={strong_key}\n')
            print(f"✅ New {env_file} file created with secret key")
    else:
        print("📋 Please manually add the secret key to your .env file")


if __name__ == "__main__":
    main()

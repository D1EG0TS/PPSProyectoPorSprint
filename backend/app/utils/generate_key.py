import secrets

def generate_secret_key():
    """Genera una clave secreta segura de 32 bytes (64 caracteres hexadecimales)."""
    return secrets.token_hex(32)

if __name__ == "__main__":
    secret = generate_secret_key()
    print("--- Nuevo JWT_SECRET_KEY generado ---")
    print(secret)
    print("-------------------------------------")
    print("Copia este valor en tu archivo .env")

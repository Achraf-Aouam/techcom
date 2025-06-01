\
import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

# JWT Settings
# IMPORTANT: Change this key in a real application and keep it secret!
# Consider generating a strong key, e.g., using: openssl rand -hex 32
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-please-change-it-and-keep-it-safe")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Example .env entries you should add:
# SECRET_KEY=a_very_strong_random_secret_key_here
# ACCESS_TOKEN_EXPIRE_MINUTES=60

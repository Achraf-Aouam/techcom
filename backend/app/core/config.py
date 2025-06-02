\
import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-please-change-it-and-keep-it-safe")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))



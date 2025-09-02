#!/usr/bin/env python3
"""
Test production server logging
"""

import os
import sys

# Clear SSL certificate variables
os.environ.pop('CURL_CA_BUNDLE', None)
os.environ.pop('REQUESTS_CA_BUNDLE', None) 
os.environ.pop('SSL_CERT_FILE', None)

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment variables loaded from .env file")
except ImportError:
    print("⚠️  python-dotenv not available")

# Test environment variables
print("\n🔧 Current Environment Settings:")
print(f"   FLASK_ENV: {os.getenv('FLASK_ENV', 'not set')}")
print(f"   FLASK_DEBUG: {os.getenv('FLASK_DEBUG', 'not set')}")
print(f"   LOG_LEVEL: {os.getenv('LOG_LEVEL', 'not set')}")
print(f"   HOST: {os.getenv('HOST', 'not set')}")
print(f"   PORT: {os.getenv('PORT', 'not set')}")

# Test logging configuration
import logging
log_level_str = os.getenv('LOG_LEVEL', 'info').upper()
log_level = getattr(logging, log_level_str, logging.INFO)

print(f"\n📝 Logging Configuration:")
print(f"   Log Level String: {log_level_str}")
print(f"   Log Level Number: {log_level}")

# Configure logging
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)

print(f"\n🧪 Testing Log Levels:")
logger.debug("🐛 This is a DEBUG message")
logger.info("ℹ️  This is an INFO message") 
logger.warning("⚠️  This is a WARNING message")
logger.error("❌ This is an ERROR message")

print(f"\n✅ Logging test complete!")
print(f"🚀 Ready to start production server with proper logging!")

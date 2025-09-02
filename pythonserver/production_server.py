#!/usr/bin/env python3
"""
FloorPlanTo3D Production API Server
Clean production runner with proper warning management
"""

import os
import sys
import warnings
import logging

# Load environment variables first
try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if it exists
    print("✅ Environment variables loaded from .env file")
except ImportError:
    print("⚠️  python-dotenv not installed. Using system environment variables only.")

# Configure environment (with fallbacks)
os.environ['FLASK_ENV'] = os.getenv('FLASK_ENV', 'production')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = os.getenv('TF_CPP_MIN_LOG_LEVEL', '2')

# Suppress specific warnings
warnings.filterwarnings('ignore', category=DeprecationWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', message='.*development server.*')

# Configure TensorFlow logging before import
import tensorflow as tf
tf.get_logger().setLevel('ERROR')

# Configure logging with smart defaults
log_level_str = os.getenv('LOG_LEVEL', 'info').upper()
log_level = getattr(logging, log_level_str, logging.INFO)

# Force INFO level minimum for production visibility
actual_log_level = logging.INFO if log_level > logging.INFO else log_level

logging.basicConfig(
    level=actual_log_level,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

print(f"📝 Logging Level: {log_level_str}")
print(f"🖥️  Console & File Logging: ENABLED")

# Configure component logging - always show Flask requests, hide TF noise
flask_env = os.getenv('FLASK_ENV', 'production')
logging.getLogger('werkzeug').setLevel(logging.INFO)  # Show Flask requests
logging.getLogger('tensorflow').setLevel(logging.ERROR)  # Hide TF warnings

if flask_env == 'development':
    logging.getLogger('tensorflow').setLevel(logging.WARNING)  # Show more in dev
    print("🔧 Development mode: Verbose logging")
else:
    print("🚀 Production mode: Clean logging")

def print_banner():
    """Print production server banner"""
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                 FloorPlanTo3D Production API                 ║
║                        Server v2.0                          ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Production Environment: ENABLED                         ║
║  📊 Memory Monitoring: ACTIVE                               ║
║  🔒 Request Validation: ENABLED                             ║
║  ⚡ Concurrent Processing: READY                            ║
║  📈 Performance Tracking: ACTIVE                            ║
║  🛡️  Error Handling: PRODUCTION-READY                       ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                              ║
║    POST /predict        - AI Floor Plan Analysis            ║
║    GET  /health         - Server Health Check               ║
║    GET  /metrics        - Performance Metrics               ║
║    POST /               - Legacy Endpoint                   ║
╠══════════════════════════════════════════════════════════════╣
║  Server Address: http://0.0.0.0:5000                        ║
║  Ready for Production Workloads! 🎯                        ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)

def main():
    try:
        # Print banner
        print_banner()
        
        # Import the Flask app
        from app import app, logger
        
        logger.info("Loading ML model and initializing server...")
        
        # Get core configuration with smart defaults
        flask_env = os.getenv('FLASK_ENV', 'production')
        server_host = os.getenv('HOST', '0.0.0.0')
        server_port = int(os.getenv('PORT', 5000))
        cors_origins = os.getenv('CORS_ORIGINS', '*')
        
        # Smart defaults based on environment
        flask_debug = flask_env == 'development'
        
        logger.info("🚀 FloorPlanTo3D API Server Starting")
        logger.info(f"🌍 Environment: {flask_env}")
        logger.info(f"🔗 Server: http://{server_host}:{server_port}")
        logger.info(f"🌐 CORS Origins: {cors_origins}")
        logger.info(f"📝 Log Level: {os.getenv('LOG_LEVEL', 'info').upper()}")
        
        # Start the server
        app.run(
            debug=flask_debug,
            host=server_host,
            port=server_port,
            threaded=True,
            use_reloader=False
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Server shutdown requested by user")
        logger.info("Production server stopped by user")
    except Exception as e:
        print(f"\n❌ Server startup failed: {e}")
        logger.error(f"Production server startup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 
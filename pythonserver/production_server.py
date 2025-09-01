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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

# Suppress werkzeug logs
logging.getLogger('werkzeug').setLevel(logging.WARNING)
logging.getLogger('tensorflow').setLevel(logging.ERROR)

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
        
        # Start the server
        app.run(
            debug=False,
            host='0.0.0.0',
            port=5000,
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
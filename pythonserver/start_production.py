#!/usr/bin/env python3
"""
Production startup script for FloorPlanTo3D API
This script handles initialization and starts the Gunicorn server
"""

import os
import sys
import time
import signal
import subprocess
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ProductionServer:
    def __init__(self):
        self.gunicorn_process = None
        self.weights_path = "./weights/maskrcnn_15_epochs.h5"
        
    def check_requirements(self):
        """Check if all requirements are met before starting"""
        logger.info("Checking requirements...")
        
        # Check if weights file exists
        if not os.path.exists(self.weights_path):
            logger.error(f"Model weights not found at {self.weights_path}")
            logger.error("Please download the model weights from:")
            logger.error("https://drive.google.com/file/d/14fDV0b_sKDg0_DkQBTyO1UaT6mHrW9es/view?usp=sharing")
            return False
        
        # Check if weights folder exists
        if not os.path.exists("./weights"):
            logger.error("Weights folder not found")
            return False
            
        # Check if mrcnn module exists
        if not os.path.exists("./mrcnn"):
            logger.error("MRCNN module not found")
            return False
            
        logger.info("All requirements met")
        return True
    
    def start_server(self):
        """Start the Gunicorn server"""
        if not self.check_requirements():
            logger.error("Requirements not met. Exiting.")
            return False
            
        logger.info("Starting FloorPlanTo3D API production server...")
        
        # Gunicorn command
        cmd = [
            "gunicorn",
            "--config", "gunicorn.conf.py",
            "app:app"
        ]
        
        try:
            # Start Gunicorn
            self.gunicorn_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True
            )
            
            logger.info(f"Gunicorn started with PID: {self.gunicorn_process.pid}")
            
            # Monitor the process
            while True:
                output = self.gunicorn_process.stdout.readline()
                if output:
                    print(output.strip())
                elif self.gunicorn_process.poll() is not None:
                    break
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            self.stop_server()
        except Exception as e:
            logger.error(f"Error starting server: {e}")
            return False
    
    def stop_server(self):
        """Stop the Gunicorn server"""
        if self.gunicorn_process:
            logger.info("Stopping Gunicorn server...")
            self.gunicorn_process.terminate()
            
            # Wait for graceful shutdown
            try:
                self.gunicorn_process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                logger.warning("Gunicorn didn't stop gracefully, forcing...")
                self.gunicorn_process.kill()
                
            logger.info("Server stopped")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}")
    if hasattr(signal_handler, 'server'):
        signal_handler.server.stop_server()
    sys.exit(0)

if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Create and start server
    server = ProductionServer()
    signal_handler.server = server
    
    try:
        server.start_server()
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1) 
#!/usr/bin/env python3
"""
All-in-one test runner for FloorPlanTo3D API
Starts the server and runs tests automatically
"""

import subprocess
import time
import sys
import threading
import requests
import json
from pathlib import Path

def start_server():
    """Start the production server in background"""
    print("🚀 Starting production server...")
    
    try:
        # Start server process
        server_process = subprocess.Popen(
            [sys.executable, "production_server.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Give server time to start
        time.sleep(5)
        
        # Check if server started successfully
        for i in range(30):  # Wait up to 60 seconds
            try:
                response = requests.get("http://localhost:5000/health", timeout=2)
                if response.status_code == 200:
                    print("✅ Server started successfully!")
                    return server_process
            except:
                pass
            
            print(f"⏳ Waiting for server to start... ({i+1}/30)")
            time.sleep(2)
        
        print("❌ Server failed to start")
        server_process.terminate()
        return None
        
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return None

def test_api():
    """Run API tests"""
    print("\n" + "="*60)
    print("🧪 TESTING FLOORPLAN API")
    print("="*60)
    
    # Test health endpoint
    print("\n1️⃣ Testing Health Endpoint...")
    try:
        response = requests.get("http://localhost:5000/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health OK - Memory: {health_data.get('memory_stats', {}).get('current_mb', 0):.1f}MB")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test metrics endpoint
    print("\n2️⃣ Testing Metrics Endpoint...")
    try:
        response = requests.get("http://localhost:5000/metrics")
        if response.status_code == 200:
            metrics = response.json()
            print(f"✅ Metrics OK - Model Loaded: {metrics.get('model_loaded', False)}")
        else:
            print(f"❌ Metrics failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Metrics error: {e}")
    
    # Test floor plan prediction
    print("\n3️⃣ Testing Floor Plan Prediction...")
    test_image = Path("test/testfloorplan.png")
    
    if not test_image.exists():
        print(f"❌ Test image not found: {test_image}")
        return False
    
    print(f"📁 Using: {test_image} ({test_image.stat().st_size/1024:.1f}KB)")
    
    try:
        start_time = time.time()
        
        with open(test_image, 'rb') as f:
            files = {'image': ('testfloorplan.png', f, 'image/png')}
            response = requests.post(
                "http://localhost:5000/predict",
                files=files,
                timeout=120
            )
        
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"✅ PREDICTION SUCCESS! ({processing_time:.1f}s)")
            print(f"📏 Image: {result.get('width')}x{result.get('height')} pixels")
            print(f"🔍 Detections: {result.get('num_detections', 0)}")
            
            # Count detected objects
            classes = result.get('classes', [])
            if classes:
                counts = {}
                for cls in classes:
                    name = cls.get('name', 'unknown')
                    counts[name] = counts.get(name, 0) + 1
                
                print("🏷️  Detected objects:")
                for obj, count in counts.items():
                    print(f"   • {obj.capitalize()}: {count}")
            
            return True
            
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown')}")
            except:
                print(f"   Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Prediction timed out (>2 minutes)")
        return False
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return False

def main():
    print("🏗️  FloorPlanTo3D API Test Runner")
    print("="*60)
    
    # Start server
    server_process = start_server()
    if not server_process:
        print("❌ Cannot start server. Exiting.")
        return
    
    try:
        # Run tests
        success = test_api()
        
        # Results
        print("\n" + "="*60)
        if success:
            print("🎉 ALL TESTS PASSED!")
            print("✅ Production API is working correctly!")
        else:
            print("⚠️  SOME TESTS FAILED")
            print("❌ Check the output above for details")
        print("="*60)
        
    finally:
        # Clean up
        print("\n🛑 Stopping server...")
        server_process.terminate()
        time.sleep(2)
        if server_process.poll() is None:
            server_process.kill()
        print("✅ Server stopped")

if __name__ == "__main__":
    main() 
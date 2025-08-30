#!/usr/bin/env python3
"""
Test script for FloorPlanTo3D Production API
Tests the API with the test floor plan image
"""

import requests
import time
import json
import sys
import os
from pathlib import Path

def wait_for_server(url="http://localhost:5000/health", timeout=60):
    """Wait for the server to be ready"""
    print("⏳ Waiting for server to be ready...")
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print("✅ Server is ready!")
                return True
        except requests.exceptions.RequestException:
            pass
        
        print("⏳ Server starting up... (waiting)")
        time.sleep(2)
    
    print("❌ Server failed to start within timeout")
    return False

def test_health_endpoint():
    """Test the health endpoint"""
    print("\n" + "="*60)
    print("🏥 TESTING HEALTH ENDPOINT")
    print("="*60)
    
    try:
        response = requests.get("http://localhost:5000/health")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Health Check Response:")
            print(json.dumps(health_data, indent=2))
            return health_data
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return None

def test_metrics_endpoint():
    """Test the metrics endpoint"""
    print("\n" + "="*60)
    print("📊 TESTING METRICS ENDPOINT")
    print("="*60)
    
    try:
        response = requests.get("http://localhost:5000/metrics")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            metrics_data = response.json()
            print("✅ Metrics Response:")
            print(f"Memory Current: {metrics_data.get('memory_current_mb', 0):.2f} MB")
            print(f"Memory Peak: {metrics_data.get('memory_peak_mb', 0):.2f} MB")
            print(f"CPU Percent: {metrics_data.get('cpu_percent', 0):.2f}%")
            print(f"Uptime: {metrics_data.get('uptime_seconds', 0):.2f} seconds")
            print(f"Requests Processed: {metrics_data.get('requests_processed', 0)}")
            print(f"Model Loaded: {metrics_data.get('model_loaded', False)}")
            return metrics_data
        else:
            print(f"❌ Metrics failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Metrics error: {e}")
        return None

def test_prediction_with_floorplan():
    """Test the prediction endpoint with the test floor plan"""
    print("\n" + "="*60)
    print("🏗️  TESTING FLOOR PLAN PREDICTION")
    print("="*60)
    
    # Check if test image exists
    test_image_path = Path("test/testfloorplan.png")
    if not test_image_path.exists():
        print(f"❌ Test image not found at: {test_image_path}")
        return None
    
    print(f"📁 Using test image: {test_image_path}")
    print(f"📏 Image size: {test_image_path.stat().st_size / 1024:.2f} KB")
    
    try:
        # Make prediction request
        print("🚀 Sending prediction request...")
        start_time = time.time()
        
        with open(test_image_path, 'rb') as image_file:
            files = {'image': ('testfloorplan.png', image_file, 'image/png')}
            response = requests.post(
                "http://localhost:5000/predict", 
                files=files,
                timeout=120  # 2 minute timeout for ML processing
            )
        
        processing_time = time.time() - start_time
        
        print(f"⏱️  Processing time: {processing_time:.2f} seconds")
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            prediction_data = response.json()
            print("✅ PREDICTION SUCCESSFUL!")
            print("\n🎯 RESULTS:")
            print(f"   Success: {prediction_data.get('success', False)}")
            print(f"   Image Width: {prediction_data.get('width', 0)} pixels")
            print(f"   Image Height: {prediction_data.get('height', 0)} pixels")
            print(f"   Number of Detections: {prediction_data.get('num_detections', 0)}")
            print(f"   Average Door Size: {prediction_data.get('average_door', 0):.2f}")
            
            # Show detected classes
            classes = prediction_data.get('classes', [])
            if classes:
                print(f"\n🏷️  DETECTED OBJECTS:")
                class_counts = {}
                for cls in classes:
                    class_name = cls.get('name', 'unknown')
                    class_counts[class_name] = class_counts.get(class_name, 0) + 1
                
                for class_name, count in class_counts.items():
                    print(f"   {class_name.capitalize()}: {count}")
            
            # Show bounding boxes (first few)
            points = prediction_data.get('points', [])
            if points:
                print(f"\n📦 BOUNDING BOXES (first 3):")
                for i, point in enumerate(points[:3]):
                    print(f"   Box {i+1}: x1={point.get('x1')}, y1={point.get('y1')}, x2={point.get('x2')}, y2={point.get('y2')}")
                
                if len(points) > 3:
                    print(f"   ... and {len(points) - 3} more boxes")
            
            # Processing info
            proc_info = prediction_data.get('processing_info', {})
            if proc_info:
                print(f"\n📊 PROCESSING INFO:")
                print(f"   Request ID: {proc_info.get('request_id', 'N/A')}")
                print(f"   Timestamp: {proc_info.get('timestamp', 'N/A')}")
            
            return prediction_data
            
        else:
            print(f"❌ Prediction failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"Raw response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out (processing took too long)")
        return None
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return None

def main():
    print("🚀 FloorPlanTo3D API Testing Suite")
    print("="*60)
    
    # Check if server is running
    if not wait_for_server():
        print("❌ Server is not running. Please start the production server first:")
        print("   python production_server.py")
        return
    
    # Run tests
    health_data = test_health_endpoint()
    metrics_data = test_metrics_endpoint()
    prediction_data = test_prediction_with_floorplan()
    
    # Summary
    print("\n" + "="*60)
    print("📋 TEST SUMMARY")
    print("="*60)
    print(f"Health Check: {'✅ PASS' if health_data else '❌ FAIL'}")
    print(f"Metrics Check: {'✅ PASS' if metrics_data else '❌ FAIL'}")
    print(f"Prediction Test: {'✅ PASS' if prediction_data else '❌ FAIL'}")
    
    if prediction_data:
        print(f"\n🎉 SUCCESS! API is working correctly!")
        print(f"   Detected {prediction_data.get('num_detections', 0)} objects in the floor plan")
    else:
        print(f"\n⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main() 
#!/usr/bin/env node

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testPythonConnection() {
  console.log('🧪 Testing Express → Python Server Connection');
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing Python server health...');
    const healthResponse = await fetch('http://localhost:5000/health');
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Python server is healthy');
      console.log(`   Model loaded: ${healthData.model_loaded}`);
      console.log(`   Memory: ${healthData.memory_stats.current_mb.toFixed(1)}MB`);
    } else {
      console.log('❌ Python server health check failed');
      return;
    }
    
    // Test 2: Check if test image exists
    console.log('\n2️⃣ Checking for test image...');
    const testImagePath = './pythonserver/test/testfloorplan.png';
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Test image not found at:', testImagePath);
      console.log('Please ensure the test image exists before running this test');
      return;
    }
    
    console.log('✅ Test image found');
    
    // Test 3: Test FormData upload
    console.log('\n3️⃣ Testing FormData upload to Python server...');
    
    const formData = new FormData();
    const fileStream = fs.createReadStream(testImagePath);
    formData.append('image', fileStream, {
      filename: 'testfloorplan.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload successful!');
      console.log(`   Detections: ${result.num_detections}`);
      console.log(`   Image size: ${result.width}x${result.height}`);
      
      if (result.classes && result.classes.length > 0) {
        const objectCounts = {};
        result.classes.forEach(cls => {
          const name = cls.name;
          objectCounts[name] = (objectCounts[name] || 0) + 1;
        });
        
        console.log('   Objects detected:');
        Object.entries(objectCounts).forEach(([obj, count]) => {
          console.log(`     ${obj}: ${count}`);
        });
      }
    } else {
      console.log('❌ Upload failed:', uploadResponse.status);
      const errorText = await uploadResponse.text();
      console.log('   Error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testPythonConnection(); 
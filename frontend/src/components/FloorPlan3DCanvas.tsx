import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, Layers, BarChart3, AlertTriangle } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface FloorPlan3DCanvasProps {
  view3DData: any;
  view3DMode: 'top' | 'perspective' | 'side';
  showAnalytics: boolean;
  showLightLabels?: boolean;
  enableAutoRotation?: boolean;
}

// Modular 3D Scene Classes
class Scene3DManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  private animationId: number | null = null;
  private autoRotate: boolean = false;
  private rotationSpeed: number = 0.005; // Slow, smooth rotation

  constructor(container: HTMLElement) {
    console.log('🎯 Scene3DManager: Creating scene...');
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 50, 200);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(30, 40, 30);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Add renderer to container
    container.appendChild(this.renderer.domElement);

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.maxPolarAngle = Math.PI / 2;

    // Setup lighting
    this.setupLighting();
    
    // Start render loop IMMEDIATELY
    this.startRenderLoop();
    
    console.log('✅ Scene3DManager: Scene created successfully');
  }

  private setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-30, 20, -30);
    this.scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff4444, 0.2);
    rimLight.position.set(0, 10, -50);
    this.scene.add(rimLight);
  }

  private startRenderLoop() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      // Update controls
      this.controls.update();
      
      // Render the scene
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
    console.log('🔄 Render loop started');
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setCameraMode(mode: 'top' | 'perspective' | 'side') {
    switch (mode) {
      case 'top':
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      case 'side':
        this.camera.position.set(100, 20, 0);
        this.camera.lookAt(0, 0, 0);
        break;
      default: // perspective
        this.camera.position.set(30, 40, 30);
        this.camera.lookAt(0, 0, 0);
    }
  }

  public setAutoRotation(enabled: boolean) {
    this.autoRotate = enabled;
    this.controls.autoRotate = enabled;
    this.controls.autoRotateSpeed = enabled ? 1.0 : 0; // 1 rotation per 60 seconds
    console.log(`🔄 Auto-rotation ${enabled ? 'enabled' : 'disabled'}`);
  }

  public dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.controls.dispose();
    this.renderer.dispose();
  }
  
  public debugScene() {
    console.log('🔍 Scene Debug Info:');
    console.log(`Total objects in scene: ${this.scene.children.length}`);
    this.scene.children.forEach((child, index) => {
      console.log(`  ${index}: ${child.type} at (${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`);
      if (child.type === 'Group') {
        console.log(`    Group has ${child.children.length} children`);
      }
    });
  }
}

class ArchitectureBuilder {
  private scene: THREE.Scene;
  private materials: { [key: string]: THREE.Material };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Create materials
    this.materials = {
      wall: new THREE.MeshLambertMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 }),
      door: new THREE.MeshLambertMaterial({ color: 0x00ff88, transparent: true, opacity: 0.7 }),
      window: new THREE.MeshLambertMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 }),
      floor: new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.9 })
    };
  }

  public createDefaultScene() {
    console.log('🏗️ Creating default 3D scene...');
    
    // Create floor
    this.createFloor();
    
    // Create some sample walls
    this.createWall(-20, -20, 40, 2);  // Bottom wall
    this.createWall(-20, 18, 40, 2);   // Top wall
    this.createWall(-20, -20, 2, 40);  // Left wall
    this.createWall(18, -20, 2, 40);   // Right wall
    
    // Create a door
    this.createDoor(0, -20, 6, 2);
    
    // Create windows
    this.createWindow(-20, 0, 2, 4);
    this.createWindow(18, 5, 2, 4);
    
    console.log('✅ Default scene created');
  }

  public createFloor(width: number = 50, height: number = 50) {
    const floorGeometry = new THREE.PlaneGeometry(width, height);
    const floorMesh = new THREE.Mesh(floorGeometry, this.materials.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(width, 20, 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  public buildFromData(floorplanData: any) {
    console.log('🏗️ Building architecture from data...', floorplanData);
    
    if (!floorplanData?.analysis?.detections) {
      console.warn('⚠️ No detection data available, creating default scene');
      this.createDefaultScene();
      return;
    }

    const { analysis } = floorplanData;
    const detections = analysis.detections;
    
    // Create floor based on image dimensions
    const imageWidth = analysis.image?.width || 100;
    const imageHeight = analysis.image?.height || 100;
    const scale = 0.1; // Scale factor for converting pixels to 3D units
    
    this.createFloor(imageWidth * scale, imageHeight * scale);
    
    // Process architectural elements
    if (detections.boundingBoxes && detections.objects) {
      detections.boundingBoxes.forEach((box: any, index: number) => {
        const objectType = detections.objects[index]?.name || 'unknown';
        
        // Convert 2D coordinates to 3D
        const x = (box.x1 + box.x2) / 2 * scale - (imageWidth * scale) / 2;
        const z = (box.y1 + box.y2) / 2 * scale - (imageHeight * scale) / 2;
        const width = Math.abs(box.x2 - box.x1) * scale;
        const depth = Math.abs(box.y2 - box.y1) * scale;
        
        switch (objectType) {
          case 'wall':
            this.createWall(x, z, width, depth);
            break;
          case 'door':
            this.createDoor(x, z, width, depth);
            break;
          case 'window':
            this.createWindow(x, z, width, depth);
            break;
        }
      });
      
      console.log(`✅ Created ${detections.boundingBoxes.length} architectural elements`);
    } else {
      console.warn('⚠️ No bounding boxes found, creating default scene');
      this.createDefaultScene();
    }
  }

  private createWall(x: number, z: number, width: number, depth: number) {
    const wallHeight = 3;
    const geometry = new THREE.BoxGeometry(width, wallHeight, depth);
    const mesh = new THREE.Mesh(geometry, this.materials.wall);
    mesh.position.set(x, wallHeight / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private createDoor(x: number, z: number, width: number, depth: number) {
    const doorHeight = 2.5;
    const geometry = new THREE.BoxGeometry(width, doorHeight, depth);
    const mesh = new THREE.Mesh(geometry, this.materials.door);
    mesh.position.set(x, doorHeight / 2, z);
    mesh.castShadow = true;
    
    // Add door frame
    const frameGeometry = new THREE.BoxGeometry(width + 0.2, doorHeight + 0.2, depth + 0.2);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513, transparent: true, opacity: 0.8 });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.set(x, doorHeight / 2, z);
    this.scene.add(frameMesh);
    this.scene.add(mesh);
  }

  private createWindow(x: number, z: number, width: number, depth: number) {
    const windowHeight = 1.5;
    const windowY = 1.2; // Height from floor
    const geometry = new THREE.BoxGeometry(width, windowHeight, depth);
    const mesh = new THREE.Mesh(geometry, this.materials.window);
    mesh.position.set(x, windowY + windowHeight / 2, z);
    
    // Add window frame
    const frameGeometry = new THREE.BoxGeometry(width + 0.1, windowHeight + 0.1, depth + 0.1);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x654321, transparent: true, opacity: 0.9 });
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    frameMesh.position.set(x, windowY + windowHeight / 2, z);
    this.scene.add(frameMesh);
    this.scene.add(mesh);
  }
}

class LightingSystem {
  private scene: THREE.Scene;
  private lightMeshes: THREE.Group;
  private textLabels: THREE.Group;
  private showLabels: boolean = false;
  
  // Shared materials to reduce texture usage
  private sharedMaterials: { [key: string]: THREE.Material } = {};
  private sharedLabelTextures: { [key: string]: THREE.Texture } = {};
  
  // Limit the number of actual THREE.js lights to prevent WebGL issues
  private activeLights: THREE.Light[] = [];
  private maxLights: number = 8; // Conservative limit

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lightMeshes = new THREE.Group();
    this.textLabels = new THREE.Group();
    this.scene.add(this.lightMeshes);
    this.scene.add(this.textLabels);
    
    // Pre-create shared materials
    this.initializeSharedMaterials();
  }

  private initializeSharedMaterials() {
    // Basic colors for different light types
    const colors = {
      warm: 0xffaa00,
      cool: 0x4488ff,
      white: 0xffffff,
      red: 0xff4444,
      green: 0x44ff44,
      blue: 0x4444ff,
      purple: 0xff44ff,
      yellow: 0xffff44
    };

    // Create shared materials for different intensities and colors
    Object.entries(colors).forEach(([name, color]) => {
      // Housing materials (non-emissive)
      this.sharedMaterials[`housing_${name}`] = new THREE.MeshLambertMaterial({ 
        color: 0x333333,
        transparent: false
      });
      
      // Glow materials (emissive but limited)
      this.sharedMaterials[`glow_${name}_low`] = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3
      });
      
      this.sharedMaterials[`glow_${name}_med`] = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6
      });
      
      this.sharedMaterials[`glow_${name}_high`] = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.9
      });
    });

    // Create shared label textures for common light types
    const lightTypes = ['SPOTLIGHT', 'LINEAR LIGHT', 'WALL WASHER', 'SPECIALTY', 'DECORATIVE', 'LASER BLADE', 'MAGNETIC TRACK', 'TRACK LIGHT'];
    lightTypes.forEach(type => {
      this.sharedLabelTextures[type] = this.createLabelTexture(type);
    });
  }

  private createLabelTexture(text: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Style the text
    context.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = 'bold 20px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add text with outline for better visibility
    context.strokeStyle = 'black';
    context.lineWidth = 3;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private getColorKey(color: THREE.Color): string {
    // Map colors to predefined keys to reuse materials
    const hue = color.getHSL({ h: 0, s: 0, l: 0 }).h;
    
    if (hue < 0.08 || hue > 0.92) return 'red';
    if (hue < 0.17) return 'yellow';
    if (hue < 0.33) return 'green';
    if (hue < 0.67) return 'blue';
    if (hue < 0.83) return 'purple';
    
    // Default based on lightness
    const lightness = color.getHSL({ h: 0, s: 0, l: 0 }).l;
    if (lightness > 0.7) return 'white';
    if (lightness > 0.5) return 'warm';
    return 'cool';
  }

  public setShowLabels(show: boolean) {
    this.showLabels = show;
    this.textLabels.visible = show;
  }

  public createFromData(placedLights: any[], imageData: any) {
    console.log('💡 Creating optimized lights from data...', placedLights);
    console.log('📊 Image data:', imageData);
    
    // Clear existing lights and labels
    this.clearExistingLights();
    
    if (!placedLights || placedLights.length === 0) {
      console.log('💡 No lights to create');
      return;
    }

    const imageWidth = imageData?.width || 100;
    const imageHeight = imageData?.height || 100;
    const scale = 0.1; // Scale factor for converting pixels to 3D units
    
    console.log(`📐 Image dimensions: ${imageWidth}x${imageHeight}, scale: ${scale}`);
    console.log(`🚦 Limiting to ${this.maxLights} actual THREE.js lights to prevent WebGL issues`);

    // Sort lights by intensity to prioritize the brightest ones for actual THREE.js lights
    const sortedLights = [...placedLights].sort((a, b) => (b.intensity || 80) - (a.intensity || 80));

    sortedLights.forEach((light, index) => {
      console.log(`🔄 Processing light ${index + 1}/${placedLights.length}:`, light);
      const shouldCreateActualLight = index < this.maxLights; // Only create actual lights for the first N brightest
      this.createOptimizedLightFixture(light, scale, imageWidth, imageHeight, shouldCreateActualLight);
    });

    // Add the light group to the scene if not already added
    if (!this.scene.children.includes(this.lightMeshes)) {
      this.scene.add(this.lightMeshes);
      console.log('➕ Added light group to scene');
    }
    
    // Add the text labels group to the scene if not already added
    if (!this.scene.children.includes(this.textLabels)) {
      this.scene.add(this.textLabels);
      console.log('➕ Added text labels group to scene');
    }
    
    console.log(`✅ Created ${placedLights.length} light fixtures (${this.activeLights.length} actual THREE.js lights)`);
    console.log('🔍 Light meshes in group:', this.lightMeshes.children.length);
    console.log('🔍 Text labels in group:', this.textLabels.children.length);
    console.log('🔍 Total scene objects:', this.scene.children.length);
  }

  private clearExistingLights() {
    // Remove existing lights from scene
    this.activeLights.forEach(light => {
      this.scene.remove(light);
      if ((light as any).target) {
        this.scene.remove((light as any).target);
      }
    });
    this.activeLights = [];
    
    // Clear mesh groups
    this.lightMeshes.clear();
    this.textLabels.clear();
  }

  private createOptimizedLightFixture(light: any, scale: number, imageWidth: number, imageHeight: number, createActualLight: boolean) {
    // Convert 2D position to 3D - EXACT same positioning as 2D view
    const x = light.x * scale - (imageWidth * scale) / 2;
    const z = light.y * scale - (imageHeight * scale) / 2;
    const y = 2.8; // Mount lights near ceiling

    // Get light properties
    const lightColor = new THREE.Color(light.color || '#ffff00');
    const intensity = (light.intensity || 80) / 100;
    const beamAngle = (light.beamAngle || 45) * Math.PI / 180; // Convert to radians
    const size = Math.max(0.5, (light.size || 30) * scale * 0.1); // Ensure minimum size
    const colorKey = this.getColorKey(lightColor);

    console.log(`💡 Creating optimized ${light.category} light at (${x.toFixed(2)}, ${y}, ${z.toFixed(2)}) with size ${size.toFixed(2)}`);

    // Create optimized text label for this light (using shared textures)
    this.createOptimizedLightLabel(x, y + size * 2, z, light);

    // Create visual representation (always create visual, but limit actual lights)
    this.createOptimizedVisualRepresentation(x, y, z, lightColor, intensity, beamAngle, size, light, scale, colorKey, createActualLight);
    
    console.log(`✅ Optimized light fixture created, total meshes: ${this.lightMeshes.children.length}`);
  }

  private createOptimizedLightLabel(x: number, y: number, z: number, light: any) {
    // Get light type name and use shared texture
    const lightTypeName = this.getLightTypeName(light);
    const sharedTexture = this.sharedLabelTextures[lightTypeName] || this.sharedLabelTextures['SPOTLIGHT'];
    
    // Create sprite material using shared texture
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: sharedTexture,
      transparent: true,
      alphaTest: 0.1
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.set(2, 0.5, 1); // Adjust scale as needed
    
    this.textLabels.add(sprite);
  }

  private getLightTypeName(light: any): string {
    const typeNames: { [key: string]: string } = {
      'spotLights': 'SPOTLIGHT',
      'wallWashers': 'WALL WASHER',
      'linearLights': 'LINEAR LIGHT',
      'specialtyLights': 'SPECIALTY',
      'laserBlades': 'LASER BLADE',
      'decorativeLights': 'DECORATIVE',
      'magneticTrack': light.isMagneticTrack ? 'MAGNETIC TRACK' : 'TRACK LIGHT'
    };
    
    return typeNames[light.category] || 'BASIC LIGHT';
  }

  private createOptimizedVisualRepresentation(x: number, y: number, z: number, color: THREE.Color, intensity: number, beamAngle: number, size: number, light: any, scale: number, colorKey: string, createActualLight: boolean) {
    // Create housing using shared material
    const housingMaterial = this.sharedMaterials[`housing_${colorKey}`];
    
    if (light.category === 'linearLights' || light.category === 'laserBlades') {
      this.createOptimizedLinearLight(x, y, z, color, intensity, size, light, scale, colorKey, createActualLight);
    } else if (light.category === 'magneticTrack') {
      if (light.isMagneticTrack) {
        this.createOptimizedMagneticTrack(x, y, z, color, size, light, scale, colorKey);
      } else {
        // Track-mounted light
        this.createOptimizedBasicLight(x, y, z, color, intensity, size * 0.5, colorKey, createActualLight);
      }
    } else {
      // All other light types use optimized basic light
      this.createOptimizedBasicLight(x, y, z, color, intensity, size, colorKey, createActualLight);
    }
  }

  private createOptimizedLinearLight(x: number, y: number, z: number, color: THREE.Color, intensity: number, size: number, light: any, scale: number, colorKey: string, createActualLight: boolean) {
    const length = (light.length || 100) * scale;
    const rotation = (light.rotation || 0) * Math.PI / 180;

    // Calculate start and end points for linear light
    const startX = x - (length / 2) * Math.cos(rotation);
    const startZ = z - (length / 2) * Math.sin(rotation);
    const endX = x + (length / 2) * Math.cos(rotation);
    const endZ = z + (length / 2) * Math.sin(rotation);

    // Create linear fixture housing (long rectangular tube) using shared material
    const housingGeometry = new THREE.BoxGeometry(length, size * 0.15, size * 0.3);
    const housingMaterial = this.sharedMaterials[`housing_${colorKey}`];
    const housingMesh = new THREE.Mesh(housingGeometry, housingMaterial);
    housingMesh.position.set(x, y, z);
    housingMesh.rotation.y = rotation;
    this.lightMeshes.add(housingMesh);

    // Create limited number of actual THREE.js lights only for brightest lights
    if (createActualLight && this.activeLights.length < this.maxLights) {
      // Create fewer point lights along the length for performance
      const numLights = Math.min(3, Math.max(2, Math.floor(length / 10))); // Reduced from 5+ to max 3
      for (let i = 0; i < numLights; i++) {
        const t = i / (numLights - 1);
        const lightX = startX + (endX - startX) * t;
        const lightZ = startZ + (endZ - startZ) * t;
        
        const pointLight = new THREE.PointLight(color, intensity * 2, 15); // Reduced intensity and distance
        pointLight.position.set(lightX, y, lightZ);
        this.scene.add(pointLight);
        this.activeLights.push(pointLight);
      }
    }

    // Create visual glow effect using shared materials
    const glowMaterial = this.sharedMaterials[`glow_${colorKey}_med`];
    const coreGeometry = new THREE.BoxGeometry(length * 0.95, size * 0.2, size * 0.4);
    const coreMesh = new THREE.Mesh(coreGeometry, glowMaterial);
    coreMesh.position.set(x, y - size * 0.05, z);
    coreMesh.rotation.y = rotation;
    this.lightMeshes.add(coreMesh);
    
    console.log(`✅ Optimized linear light created`);
  }

  private createOptimizedSpecialtyLight(x: number, y: number, z: number, color: THREE.Color, intensity: number, beamAngle: number, size: number, light: any, colorKey: string, createActualLight: boolean) {
    // Create a more complex fixture housing for specialty lights
    const housingGeometry = new THREE.BoxGeometry(size * 0.5, size * 0.3, size * 0.5);
    const housingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x222222,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const housingMesh = new THREE.Mesh(housingGeometry, housingMaterial);
    housingMesh.position.set(x, y + size * 0.15, z); // Mount on ceiling
    this.lightMeshes.add(housingMesh);

    // Create a more complex light source for specialty lights
    const spotlight = new THREE.SpotLight(color, intensity * 2, 50, (beamAngle * Math.PI) / 180, 0.5);
    spotlight.position.set(x, y, z);
    spotlight.target.position.set(x, y - 10, z); // Point downward
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    this.scene.add(spotlight);
    this.scene.add(spotlight.target);

    // Create inverted light cone visualization (light beam going DOWN from fixture)
    const coneAngle = (beamAngle * Math.PI) / 180;
    const coneHeight = 8; // Height of light cone
    const coneRadius = Math.tan(coneAngle / 2) * coneHeight;
    
    // Inverted cone geometry (wide at bottom, narrow at top)
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 16, 1, true);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity * 0.003, // Very subtle
      side: THREE.DoubleSide
    });
    
    const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
    coneMesh.position.set(x, y - coneHeight/2, z); // Position below the fixture
    coneMesh.rotation.x = Math.PI; // Flip to point downward
    this.lightMeshes.add(coneMesh);

    // Create ground light circle where the spotlight hits
    const groundRadius = coneRadius * 0.8;
    const groundGeometry = new THREE.CircleGeometry(groundRadius, 32);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity * 0.008,
      side: THREE.DoubleSide
    });
    
    const groundCircle = new THREE.Mesh(groundGeometry, groundMaterial);
    groundCircle.position.set(x, y - coneHeight + 0.1, z); // On the ground
    groundCircle.rotation.x = -Math.PI / 2; // Lay flat
    this.lightMeshes.add(groundCircle);

    // Add small glow at the fixture
    const glowGeometry = new THREE.SphereGeometry(size * 0.3, 8, 6);
    const glowMaterial = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.6,
      emissive: color,
      emissiveIntensity: 0.8
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, y, z);
    this.lightMeshes.add(glowMesh);
  }

  private createOptimizedLaserBlade(x: number, y: number, z: number, color: THREE.Color, intensity: number, size: number, light: any, scale: number) {
    console.log(`💥 Creating laser blade`);
    
    const length = (light.length || 100) * scale;
    const rotation = (light.rotation || 0) * Math.PI / 180;

    // Create a long, thin cylinder for the blade
    const bladeGeometry = new THREE.CylinderGeometry(size * 0.05, size * 0.05, length, 16);
    const bladeMaterial = new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 });
    const bladeMesh = new THREE.Mesh(bladeGeometry, bladeMaterial);
    bladeMesh.position.set(x, y + size * 0.025, z); // Center on the mount
    bladeMesh.rotation.y = rotation;
    bladeMesh.castShadow = true;
    this.lightMeshes.add(bladeMesh);

    // Create a point light at the end of the blade for illumination
    const pointLight = new THREE.PointLight(color, intensity * 2, 20);
    pointLight.position.set(x + length * Math.cos(rotation), y + size * 0.025, z + length * Math.sin(rotation));
    this.scene.add(pointLight);

    // Create a bright glow sphere at the base
    const glowGeometry = new THREE.SphereGeometry(size * 1.5, 8, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, y, z);
    this.lightMeshes.add(glowMesh);
  }

  private createOptimizedDecorativeLight(x: number, y: number, z: number, color: THREE.Color, intensity: number, beamAngle: number, size: number, light: any, colorKey: string, createActualLight: boolean) {
    // Create a more complex fixture housing for decorative lights
    const housingGeometry = new THREE.BoxGeometry(size * 0.4, size * 0.3, size * 0.4);
    const housingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x111111,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const housingMesh = new THREE.Mesh(housingGeometry, housingMaterial);
    housingMesh.position.set(x, y + size * 0.15, z); // Mount on ceiling
    this.lightMeshes.add(housingMesh);

    // Create a more complex light source for decorative lights
    const spotlight = new THREE.SpotLight(color, intensity * 2, 50, (beamAngle * Math.PI) / 180, 0.5);
    spotlight.position.set(x, y, z);
    spotlight.target.position.set(x, y - 10, z); // Point downward
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    this.scene.add(spotlight);
    this.scene.add(spotlight.target);

    // Create inverted light cone visualization (light beam going DOWN from fixture)
    const coneAngle = (beamAngle * Math.PI) / 180;
    const coneHeight = 8; // Height of light cone
    const coneRadius = Math.tan(coneAngle / 2) * coneHeight;
    
    // Inverted cone geometry (wide at bottom, narrow at top)
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneHeight, 16, 1, true);
    const coneMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity * 0.003, // Very subtle
      side: THREE.DoubleSide
    });
    
    const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
    coneMesh.position.set(x, y - coneHeight/2, z); // Position below the fixture
    coneMesh.rotation.x = Math.PI; // Flip to point downward
    this.lightMeshes.add(coneMesh);

    // Create ground light circle where the spotlight hits
    const groundRadius = coneRadius * 0.8;
    const groundGeometry = new THREE.CircleGeometry(groundRadius, 32);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity * 0.008,
      side: THREE.DoubleSide
    });
    
    const groundCircle = new THREE.Mesh(groundGeometry, groundMaterial);
    groundCircle.position.set(x, y - coneHeight + 0.1, z); // On the ground
    groundCircle.rotation.x = -Math.PI / 2; // Lay flat
    this.lightMeshes.add(groundCircle);

    // Add small glow at the fixture
    const glowGeometry = new THREE.SphereGeometry(size * 0.3, 8, 6);
    const glowMaterial = new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.6,
      emissive: color,
      emissiveIntensity: 0.8
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, y, z);
    this.lightMeshes.add(glowMesh);
  }

  private createOptimizedMagneticTrack(x: number, y: number, z: number, color: THREE.Color, size: number, light: any, scale: number, colorKey: string) {
    console.log(`🛤️ Creating optimized magnetic track`);
    
    const length = (light.length || 100) * scale;
    
    // Create track rail using shared material
    const trackGeometry = new THREE.BoxGeometry(length, size * 0.2, size * 0.8);
    const trackMaterial = this.sharedMaterials[`housing_${colorKey}`];
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.position.set(x, y, z);
    if (light.rotation) {
      trackMesh.rotation.y = (light.rotation * Math.PI) / 180;
    }
    trackMesh.castShadow = true;
    this.lightMeshes.add(trackMesh);

    // Add fewer mounting points for performance
    const numMounts = Math.min(3, Math.max(2, Math.floor(length / (8 * scale)))); // Reduced mounting points
    for (let i = 0; i < numMounts; i++) {
      const t = i / (numMounts - 1);
      const mountX = x + (t - 0.5) * length * Math.cos((light.rotation || 0) * Math.PI / 180);
      const mountZ = z + (t - 0.5) * length * Math.sin((light.rotation || 0) * Math.PI / 180);
      
      const mountGeometry = new THREE.CylinderGeometry(size * 0.3, size * 0.3, size * 0.1);
      const mountMesh = new THREE.Mesh(mountGeometry, trackMaterial);
      mountMesh.position.set(mountX, y - size * 0.15, mountZ);
      this.lightMeshes.add(mountMesh);
    }
  }

  private createOptimizedBasicLight(x: number, y: number, z: number, color: THREE.Color, intensity: number, size: number, colorKey: string, createActualLight: boolean) {
    console.log(`💡 Creating optimized basic light at (${x}, ${y}, ${z}) with size ${size}`);
    
    // Create simplified fixture using shared materials
    const lightGeometry = new THREE.SphereGeometry(Math.max(size * 0.6, 0.3), 8, 6); // Reduced geometry complexity
    const lightMaterial = this.sharedMaterials[`glow_${colorKey}_high`];
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
    lightMesh.position.set(x, y, z);
    lightMesh.castShadow = true;
    this.lightMeshes.add(lightMesh);

    // Create actual THREE.js light only for brightest lights
    if (createActualLight && this.activeLights.length < this.maxLights) {
      const pointLight = new THREE.PointLight(color, intensity * 3, 20); // Reasonable intensity and distance
      pointLight.position.set(x, y, z);
      pointLight.castShadow = true;
      this.scene.add(pointLight);
      this.activeLights.push(pointLight);
    }
    
    // Add single glow layer using shared material
    const glowGeometry = new THREE.SphereGeometry(Math.max(size * 1.2, 0.6), 6, 4); // Reduced complexity
    const glowMaterial = this.sharedMaterials[`glow_${colorKey}_low`];
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.set(x, y, z);
    this.lightMeshes.add(glowMesh);
    
    console.log(`✅ Optimized basic light created with ${this.lightMeshes.children.length} meshes total`);
  }
}

const FloorPlan3DCanvas: React.FC<FloorPlan3DCanvasProps> = ({
  view3DData,
  view3DMode,
  showAnalytics,
  showLightLabels = false,
  enableAutoRotation = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const sceneManagerRef = useRef<Scene3DManager | null>(null);
  const architectureBuilderRef = useRef<ArchitectureBuilder | null>(null);
  const lightingSystemRef = useRef<LightingSystem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState('Initializing 3D View...');
  const [labelsVisible, setLabelsVisible] = useState(showLightLabels);
  const [autoRotationEnabled, setAutoRotationEnabled] = useState(enableAutoRotation);
  
  // Initialize scene when mount ref is ready
  const initializeScene = useCallback(() => {
    console.log('🚀 initializeScene called');
    console.log('🚀 Mount ref current:', !!mountRef.current);
    console.log('🚀 Already initialized:', isInitializedRef.current);
    
    if (!mountRef.current) {
      console.log('🚀 No mount ref - waiting...');
      setDebugInfo('Waiting for container...');
      return;
    }
    
    if (isInitializedRef.current) {
      console.log('🚀 Already initialized - skipping');
      return;
    }

    try {
      console.log('🚀 Starting scene initialization...');
      setDebugInfo('Creating 3D scene...');
      setIsLoading(true);
      
      // Create scene manager
      sceneManagerRef.current = new Scene3DManager(mountRef.current);
      setDebugInfo('Scene manager created...');
      
      // Create builders
      architectureBuilderRef.current = new ArchitectureBuilder(sceneManagerRef.current.scene);
      lightingSystemRef.current = new LightingSystem(sceneManagerRef.current.scene);
      setDebugInfo('Builders created...');
      
      // Build content
      if (view3DData?.floorplanData) {
        console.log('🏗️ Building from floorplan data...');
        setDebugInfo('Building architecture...');
        architectureBuilderRef.current.buildFromData(view3DData.floorplanData);
        
        if (view3DData.placedLights?.length > 0) {
          console.log('💡 Adding lights...');
          setDebugInfo('Adding lights...');
          lightingSystemRef.current.createFromData(
            view3DData.placedLights,
            view3DData.floorplanData.analysis?.image
          );
          
          // Debug scene after adding lights
          sceneManagerRef.current.debugScene();
        }
      } else {
        console.log('🏗️ No data - creating default scene...');
        setDebugInfo('Creating default scene...');
        architectureBuilderRef.current.createDefaultScene();
      }
      
      // Set camera mode
      sceneManagerRef.current.setCameraMode(view3DMode);
      
      isInitializedRef.current = true;
      setIsLoading(false);
      setError(null);
      setDebugInfo('3D scene ready!');
      
      console.log('✅ Scene initialization complete!');
      
    } catch (err) {
      console.error('❌ Scene initialization failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
      setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [view3DData, view3DMode]);

  // Effect for initial mount
  useEffect(() => {
    console.log('🔄 Mount effect: Component mounted');
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mountRef.current && !isInitializedRef.current) {
        initializeScene();
      }
    }, 100);
    
    return () => {
      clearTimeout(timer);
      console.log('🧹 Cleanup: Disposing scene');
      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
        sceneManagerRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // Only run on mount/unmount

  // Effect for data changes
  useEffect(() => {
    console.log('🔄 Data effect: view3DData changed', !!view3DData);
    if (isInitializedRef.current && view3DData && architectureBuilderRef.current && lightingSystemRef.current) {
      try {
        setDebugInfo('Updating scene data...');
        
        // Clear existing scene objects (but keep the scene itself)
        const scene = sceneManagerRef.current?.scene;
        if (scene) {
          // Remove old architecture and lights
          const objectsToRemove = scene.children.filter(child => 
            child.type === 'Mesh' || child.type === 'Group'
          );
          objectsToRemove.forEach(obj => scene.remove(obj));
        }
        
        // Rebuild
        architectureBuilderRef.current.buildFromData(view3DData.floorplanData);
        if (view3DData.placedLights?.length > 0) {
          lightingSystemRef.current.createFromData(
            view3DData.placedLights,
            view3DData.floorplanData.analysis?.image
          );
        }
        
        setDebugInfo('Scene updated!');
      } catch (err) {
        console.error('❌ Failed to update scene:', err);
        setError(err instanceof Error ? err.message : 'Update failed');
      }
    }
  }, [view3DData]);

  // Effect for view mode changes
  useEffect(() => {
    console.log('🔄 View mode effect: view3DMode changed to', view3DMode);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraMode(view3DMode);
    }
  }, [view3DMode]);

  // Effect for light labels visibility
  useEffect(() => {
    console.log('🔄 Light labels effect: showLightLabels changed to', showLightLabels);
    if (lightingSystemRef.current) {
      lightingSystemRef.current.setShowLabels(showLightLabels);
    }
  }, [showLightLabels]);

  // Effect for auto-rotation
  useEffect(() => {
    console.log('🔄 Auto-rotation effect: enableAutoRotation changed to', enableAutoRotation);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAutoRotation(enableAutoRotation);
    }
  }, [enableAutoRotation]);

  // Toggle functions for controls
  const toggleLightLabels = () => {
    const newValue = !labelsVisible;
    setLabelsVisible(newValue);
    if (lightingSystemRef.current) {
      lightingSystemRef.current.setShowLabels(newValue);
    }
    console.log(`🏷️ Light labels ${newValue ? 'enabled' : 'disabled'}`);
  };

  const toggleAutoRotation = () => {
    const newValue = !autoRotationEnabled;
    setAutoRotationEnabled(newValue);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setAutoRotation(newValue);
    }
    console.log(`🔄 Auto-rotation ${newValue ? 'enabled' : 'disabled'}`);
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (sceneManagerRef.current && mountRef.current) {
        const { clientWidth, clientHeight } = mountRef.current;
        sceneManagerRef.current.resize(clientWidth, clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/90 border border-red-500/50 rounded-lg">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-300 mb-2">3D Rendering Error</h3>
          <p className="text-red-200/70 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              isInitializedRef.current = false;
              initializeScene();
            }}
            className="px-4 py-2 bg-red-600/50 hover:bg-red-500/60 border border-red-400/50 rounded-lg text-red-200 transition-colors"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* 3D Canvas Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* Light Labels Toggle */}
        <button
          onClick={toggleLightLabels}
          className={`px-3 py-2 rounded-lg border transition-all duration-300 flex items-center space-x-2 ${
            labelsVisible
              ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200'
              : 'bg-gray-900/30 border-gray-500/30 text-gray-300 hover:border-yellow-400/40 hover:text-yellow-200'
          }`}
          title={`${labelsVisible ? 'Hide' : 'Show'} Light Labels`}
        >
          <span className="text-sm">🏷️</span>
          <span className="text-xs font-medium">
            {labelsVisible ? 'LABELS ON' : 'LABELS OFF'}
          </span>
        </button>

        {/* Auto-Rotation Toggle */}
        <button
          onClick={toggleAutoRotation}
          className={`px-3 py-2 rounded-lg border transition-all duration-300 flex items-center space-x-2 ${
            autoRotationEnabled
              ? 'bg-blue-900/30 border-blue-500/50 text-blue-200'
              : 'bg-gray-900/30 border-gray-500/30 text-gray-300 hover:border-blue-400/40 hover:text-blue-200'
          }`}
          title={`${autoRotationEnabled ? 'Disable' : 'Enable'} Auto-Rotation`}
        >
          <span className="text-sm">🔄</span>
          <span className="text-xs font-medium">
            {autoRotationEnabled ? 'ROTATING' : 'STATIC'}
          </span>
        </button>

        {/* View Mode Indicator */}
        <div className="px-3 py-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <span className="text-red-300 text-xs font-medium">
            📹 {view3DMode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Debug Info */}
      {showAnalytics && (
        <div className="absolute top-4 left-4 z-10 bg-black/80 border border-green-500/30 rounded-lg p-3">
          <div className="text-green-300 text-sm font-mono">
            <div>Status: {debugInfo}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            <div>Labels: {labelsVisible ? 'Visible' : 'Hidden'}</div>
            <div>Rotation: {autoRotationEnabled ? 'Active' : 'Disabled'}</div>
            {error && <div className="text-red-400">Error: {error}</div>}
          </div>
        </div>
      )}

      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-red-300 font-medium">{debugInfo}</p>
            <p className="text-red-200/70 text-sm mt-2">Building 3D scene...</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-300 font-medium mb-2">3D Rendering Error</p>
            <p className="text-red-200/70 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-800/60 text-red-200 rounded-lg border border-red-500/30 transition-all duration-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlan3DCanvas; 
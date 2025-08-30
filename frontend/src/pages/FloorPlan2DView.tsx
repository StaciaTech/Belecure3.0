import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Layers, Grid, Move, ZoomIn, ZoomOut, RotateCcw, Settings, Download, Share2, Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';

interface FloorPlan2DViewProps {}

interface LightFixture {
  type: string;
  label: string;
  description: string;
  svg: {
    viewBox: string;
    elements: any[];
  };
}

interface LightCategory {
  name: string;
  description: string;
  color: string;
  fixtures: LightFixture[];
}

interface PlacedLight {
  id: string;
  fixture: LightFixture;
  x: number;
  y: number;
  category: string;
  // Enhanced spotlight properties
  beamAngle?: number; // Beam angle in degrees (10-120) / Glow radius for circular lights
  color?: string; // Custom color for the light
  intensity?: number; // Light intensity (0-100)
  rotation?: number; // Rotation angle in degrees (0-360)
  size?: number; // Light fixture size
  // Linear light specific properties
  length?: number; // Length of linear light (20-500px)
  startX?: number; // Start point X for linear lights
  startY?: number; // Start point Y for linear lights
  endX?: number; // End point X for linear lights
  endY?: number; // End point Y for linear lights
  // Magnetic track specific properties
  isMagneticTrack?: boolean; // True if this is a base magnetic track
  attachedToTrack?: string; // ID of the track this light is attached to
  trackPosition?: number; // Position along the track (0-1)
  // Enhanced categories properties
  specialtyMode?: 'panel' | 'ceiling' | 'signage'; // Specialty light mode
  decorativePattern?: 'ambient' | 'accent' | 'dramatic'; // Decorative light pattern
  laserBladeWidth?: number; // Laser blade width (1-5px)
}

const FloorPlan2DView: React.FC<FloorPlan2DViewProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedTool, setSelectedTool] = useState<'pan' | 'select' | 'measure' | 'light'>('pan');
  const [showGrid, setShowGrid] = useState(true);
  const [floorplanData, setFloorplanData] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('Floorplan');
  const [projectType, setProjectType] = useState('Residential');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [lightFixtures, setLightFixtures] = useState<Record<string, LightCategory>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedFixture, setSelectedFixture] = useState<LightFixture | null>(null);
  const [placedLights, setPlacedLights] = useState<PlacedLight[]>([]);
  const [showLightPanel, setShowLightPanel] = useState(false);
  
  // Enhanced spotlight controls with hover state
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [hoveredLightId, setHoveredLightId] = useState<string | null>(null);
  const [showSpotlightControls, setShowSpotlightControls] = useState(false);
  const [spotlightBeamAngle, setSpotlightBeamAngle] = useState(45);
  const [spotlightColor, setSpotlightColor] = useState('#ffff00');
  const [spotlightIntensity, setSpotlightIntensity] = useState(80);
  const [spotlightRotation, setSpotlightRotation] = useState(0);
  const [spotlightSize, setSpotlightSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [mouseDownTime, setMouseDownTime] = useState(0);
  
  // Linear light specific states
  const [linearLength, setLinearLength] = useState(100);
  const [isResizingLinear, setIsResizingLinear] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'start' | 'end' | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<'start' | 'end' | 'rotate' | null>(null);
  const [isRotatingLinear, setIsRotatingLinear] = useState(false);
  const [showDirectionPrompt, setShowDirectionPrompt] = useState(false);
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 });
  const [nearbyLinearLights, setNearbyLinearLights] = useState<PlacedLight[]>([]);
  const [linkedLights, setLinkedLights] = useState<Set<string>>(new Set());
  const [showLinkingIndicators, setShowLinkingIndicators] = useState(false);
  const [rotationFeedback, setRotationFeedback] = useState<{ show: boolean; angle: number }>({ show: false, angle: 0 });

  // Magnetic track specific states
  const [magneticTracks, setMagneticTracks] = useState<PlacedLight[]>([]);
  const [selectedTrackForPlacement, setSelectedTrackForPlacement] = useState<string | null>(null);
  const [trackPositionIndicator, setTrackPositionIndicator] = useState<{ x: number; y: number; trackId: string } | null>(null);

  // Enhanced lighting states for new categories
  const [specialtyLightMode, setSpecialtyLightMode] = useState<'panel' | 'ceiling' | 'signage'>('panel');
  const [decorativePattern, setDecorativePattern] = useState<'ambient' | 'accent' | 'dramatic'>('ambient');
  const [laserBladeIntensity, setLaserBladeIntensity] = useState(90);
  const [laserBladeWidth, setLaserBladeWidth] = useState(2);

  // Undo system states
  const [undoHistory, setUndoHistory] = useState<PlacedLight[][]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  // Maximum undo history steps
  const MAX_UNDO_STEPS = 50;

  // Predefined spotlight colors
  const spotlightColors = [
    '#ffff00', // Warm Yellow
    '#ffffff', // Pure White
    '#ffd700', // Gold
    '#ff6b35', // Warm Orange
    '#4a90e2', // Cool Blue
    '#50c878', // Emerald Green
    '#ff69b4', // Hot Pink
    '#9370db', // Medium Purple
    '#ff4500', // Red Orange
    '#00ced1', // Dark Turquoise
  ];

  // Color mapping for cyberpunk blueprint style
  const objectColors: Record<string, string> = {
    wall: '#ff4444',     // Red for walls (cyberpunk theme)
    door: '#00ff88',     // Bright Green for doors
    window: '#4488ff',   // Bright Blue for windows
    room: '#ff4444',     // Red for room labels (if any)
    stairs: '#ff4444',   // Red for stairs
    furniture: '#888888' // Gray for furniture (if any)
  };

  // Load light fixtures from JSON
  useEffect(() => {
    const loadLightFixtures = async () => {
      try {
        const response = await fetch('/data/lightFixtures.json');
        const data = await response.json();
        setLightFixtures(data.lightFixtures.categories);
        console.log('🔌 Light fixtures loaded:', data.lightFixtures.categories);
      } catch (error) {
        console.error('❌ Error loading light fixtures:', error);
      }
    };

    loadLightFixtures();
  }, []);

  // Get canvas coordinates from mouse event
  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  // Find light at coordinates with generous tolerance
  const findLightAtPosition = (x: number, y: number) => {
    return placedLights.find(light => {
      if (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
        // For linear lights, laser blades and magnetic tracks, check if point is near the line
        const startX = light.startX || light.x - (light.length || 100) / 2;
        const startY = light.startY || light.y;
        const endX = light.endX || light.x + (light.length || 100) / 2;
        const endY = light.endY || light.y;
        
        const distanceToLine = distanceFromPointToLine(x, y, startX, startY, endX, endY);
        return distanceToLine <= 15; // Generous tolerance for line selection
      } else {
        // For circular lights (including track-mounted lights)
        const distance = Math.sqrt((light.x - x) ** 2 + (light.y - y) ** 2);
        const lightSize = light.size || (light.category === 'magneticTrack' && !light.isMagneticTrack ? 16 : 30);
        return distance <= lightSize/2 + 15; // Generous tolerance for circular selection
      }
    });
  };

  // Calculate distance from point to line segment
  const distanceFromPointToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    if (lineLength === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    
    const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength * lineLength)));
    const projection = { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    
    return Math.sqrt((px - projection.x) ** 2 + (py - projection.y) ** 2);
  };

  // Find linear light resize handle at position
  const findLinearHandle = (x: number, y: number, light: PlacedLight) => {
    if (light.category !== 'linearLights' && light.category !== 'laserBlades' && !(light.category === 'magneticTrack' && light.isMagneticTrack)) return null;
    
    const startX = light.startX || light.x - (light.length || 100) / 2;
    const startY = light.startY || light.y;
    const endX = light.endX || light.x + (light.length || 100) / 2;
    const endY = light.endY || light.y;
    
    const handleSize = 12;
    
    // Check start handle
    const distanceToStart = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
    if (distanceToStart <= handleSize) return 'start';
    
    // Check end handle
    const distanceToEnd = Math.sqrt((x - endX) ** 2 + (y - endY) ** 2);
    if (distanceToEnd <= handleSize) return 'end';
    
    return null;
  };

  // Calculate linear light endpoints based on center, rotation, and length
  const calculateLinearEndpoints = (centerX: number, centerY: number, rotation: number, length: number) => {
    const angle = (rotation * Math.PI) / 180;
    const halfLength = length / 2;
    
    return {
      startX: centerX - Math.cos(angle) * halfLength,
      startY: centerY - Math.sin(angle) * halfLength,
      endX: centerX + Math.cos(angle) * halfLength,
      endY: centerY + Math.sin(angle) * halfLength
    };
  };

  // Find nearby linear lights for linking
  const findNearbyLinearLights = (light: PlacedLight, threshold = 30) => {
    if (light.category !== 'linearLights') return [];
    
    const nearby: PlacedLight[] = [];
    const startX = light.startX || light.x - (light.length || 100) / 2;
    const startY = light.startY || light.y;
    const endX = light.endX || light.x + (light.length || 100) / 2;
    const endY = light.endY || light.y;
    
    placedLights.forEach(otherLight => {
      if (otherLight.id === light.id || otherLight.category !== 'linearLights') return;
      
      const otherStartX = otherLight.startX || otherLight.x - (otherLight.length || 100) / 2;
      const otherStartY = otherLight.startY || otherLight.y;
      const otherEndX = otherLight.endX || otherLight.x + (otherLight.length || 100) / 2;
      const otherEndY = otherLight.endY || otherLight.y;
      
      // Check if endpoints are close enough to link
      const distances = [
        Math.sqrt((startX - otherStartX) ** 2 + (startY - otherStartY) ** 2),
        Math.sqrt((startX - otherEndX) ** 2 + (startY - otherEndY) ** 2),
        Math.sqrt((endX - otherStartX) ** 2 + (endY - otherStartY) ** 2),
        Math.sqrt((endX - otherEndX) ** 2 + (endY - otherEndY) ** 2)
      ];
      
      if (Math.min(...distances) <= threshold) {
        nearby.push(otherLight);
      }
    });
    
    return nearby;
  };

  // Create curved connection between two linear lights with smart curve direction
  const createCurvedConnection = (light1: PlacedLight, light2: PlacedLight, connectionPoint: { x: number, y: number }) => {
    const light1StartX = light1.startX || light1.x - (light1.length || 100) / 2;
    const light1StartY = light1.startY || light1.y;
    const light1EndX = light1.endX || light1.x + (light1.length || 100) / 2;
    const light1EndY = light1.endY || light1.y;
    
    const light2StartX = light2.startX || light2.x - (light2.length || 100) / 2;
    const light2StartY = light2.startY || light2.y;
    const light2EndX = light2.endX || light2.x + (light2.length || 100) / 2;
    const light2EndY = light2.endY || light2.y;
    
    // Calculate the angle between the two lights
    const angle1 = Math.atan2(light1EndY - light1StartY, light1EndX - light1StartX);
    const angle2 = Math.atan2(light2EndY - light2StartY, light2EndX - light2StartX);
    let angleDiff = angle2 - angle1;
    
    // Normalize angle difference to -π to π
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Determine curve radius based on angle difference
    const curveRadius = Math.min(30, Math.max(10, Math.abs(angleDiff) / Math.PI * 40));
    
    // Smart curve direction determination
    let curveDirection = 1; // 1 for counter-clockwise, -1 for clockwise
    
    // Special handling for rectangular/square formations
    const isHorizontal1 = Math.abs(Math.cos(angle1)) > Math.abs(Math.sin(angle1));
    const isHorizontal2 = Math.abs(Math.cos(angle2)) > Math.abs(Math.sin(angle2));
    const isVertical1 = !isHorizontal1;
    const isVertical2 = !isHorizontal2;
    
    // Check if this is a corner connection (horizontal meets vertical)
    if ((isHorizontal1 && isVertical2) || (isVertical1 && isHorizontal2)) {
      // This is a corner - determine the proper curve direction for square/rectangle formation
      const light1CenterX = light1.x;
      const light1CenterY = light1.y;
      const light2CenterX = light2.x;
      const light2CenterY = light2.y;
      
      // Determine quadrant relationship
      const deltaX = light2CenterX - light1CenterX;
      const deltaY = light2CenterY - light1CenterY;
      
      if (isHorizontal1 && isVertical2) {
        // Light1 is horizontal, Light2 is vertical
        if (Math.cos(angle1) > 0) { // Light1 pointing right
          curveDirection = deltaY > 0 ? 1 : -1; // Curve up if light2 is below, down if above
        } else { // Light1 pointing left
          curveDirection = deltaY > 0 ? -1 : 1; // Curve down if light2 is below, up if above
        }
      } else if (isVertical1 && isHorizontal2) {
        // Light1 is vertical, Light2 is horizontal
        if (Math.sin(angle1) > 0) { // Light1 pointing down
          curveDirection = deltaX > 0 ? -1 : 1; // Curve left if light2 is to the right, right if left
        } else { // Light1 pointing up
          curveDirection = deltaX > 0 ? 1 : -1; // Curve right if light2 is to the right, left if left
        }
      }
    } else {
      // For perpendicular connections (90-degree angles), determine direction based on spatial relationship
      if (Math.abs(Math.abs(angleDiff) - Math.PI/2) < 0.1) { // Close to 90 degrees
        // Calculate vector from light1 center to light2 center
        const centerVector = {
          x: light2.x - light1.x,
          y: light2.y - light1.y
        };
        
        // Calculate light1's direction vector
        const light1Direction = {
          x: Math.cos(angle1),
          y: Math.sin(angle1)
        };
        
        // Use cross product to determine which side light2 is on relative to light1's direction
        const crossProduct = light1Direction.x * centerVector.y - light1Direction.y * centerVector.x;
        
        // If cross product is positive, light2 is on the left side of light1's direction
        // For a proper corner, we want the curve to bend "inward" toward the enclosed area
        if (angleDiff > 0) {
          // Counter-clockwise turn
          curveDirection = crossProduct > 0 ? -1 : 1;
        } else {
          // Clockwise turn  
          curveDirection = crossProduct > 0 ? 1 : -1;
        }
      } else {
        // For non-perpendicular angles, use the angle difference sign
        curveDirection = angleDiff > 0 ? -1 : 1;
      }
    }
    
    return {
      radius: curveRadius,
      center: connectionPoint,
      startAngle: angle1,
      endAngle: angle2,
      direction: curveDirection,
      angleDiff: angleDiff
    };
  };

  // Check if a point is near a rotation handle
  const findRotationHandle = (x: number, y: number, light: PlacedLight) => {
    if (light.category !== 'linearLights' && light.category !== 'laserBlades' && !(light.category === 'magneticTrack' && light.isMagneticTrack)) return null;
    
    const centerX = light.x;
    const centerY = light.y;
    const handleDistance = 25; // Distance from center for rotation handle
    
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return distance <= 12 && distance >= handleDistance - 12 ? 'rotate' : null;
  };

  // Show directional extension prompt
  const showExtensionPrompt = (x: number, y: number, light: PlacedLight) => {
    setPromptPosition({ x, y });
    setShowDirectionPrompt(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowDirectionPrompt(false);
    }, 3000);
  };

  // Extend linear light in specific direction
  const extendLinearLight = (lightId: string, direction: 'up' | 'down' | 'left' | 'right', distance = 50) => {
    setPlacedLights(prev => prev.map(light => {
      if (light.id === lightId && light.category === 'linearLights') {
        let newRotation = light.rotation || 0;
        let newLength = (light.length || 100) + distance;
        
        // Set rotation based on direction
        switch (direction) {
          case 'up':
            newRotation = -90;
            break;
          case 'down':
            newRotation = 90;
            break;
          case 'left':
            newRotation = 180;
            break;
          case 'right':
            newRotation = 0;
            break;
        }
        
        const endpoints = calculateLinearEndpoints(light.x, light.y, newRotation, newLength);
        
        return {
          ...light,
          rotation: newRotation,
          length: newLength,
          ...endpoints
        };
      }
      return light;
    }));
    
    setShowDirectionPrompt(false);
    setTimeout(() => drawFloorPlan(), 1);
  };

  // Handle mouse down - start drag or prepare for click
  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const { x, y } = getCanvasCoordinates(event);
    const clickedLight = findLightAtPosition(x, y);
    
    setMouseDownTime(Date.now());
    setDragStartPos({ x, y });

    // Handle group selection mode (Ctrl+Click or drag selection)
    if (selectedTool === 'select') {
      // Check if we're starting a group drag
      if (selectedLightIds.size > 0 && clickedLight && selectedLightIds.has(clickedLight.id)) {
        // Starting group drag
        setIsGroupDragging(true);
        setGroupDragOffset({ x: 0, y: 0 });
        return;
      }
      
      // Handle Ctrl+Click for multi-selection
      if (event.ctrlKey && clickedLight) {
        const newSelectedIds = new Set(selectedLightIds);
        if (newSelectedIds.has(clickedLight.id)) {
          newSelectedIds.delete(clickedLight.id);
        } else {
          newSelectedIds.add(clickedLight.id);
        }
        setSelectedLightIds(newSelectedIds);
        setGroupBounds(calculateGroupBounds(newSelectedIds));
        setShowGroupControls(newSelectedIds.size > 1);
        
        // Clear individual light selection when in group mode
        if (newSelectedIds.size > 1) {
          setSelectedLightId(null);
          setShowSpotlightControls(false);
        } else if (newSelectedIds.size === 1) {
          const singleLightId = Array.from(newSelectedIds)[0];
          setSelectedLightId(singleLightId);
          const singleLight = placedLights.find(light => light.id === singleLightId);
          if (singleLight && (singleLight.category === 'spotLights' || singleLight.category === 'wallWashers' || singleLight.category === 'linearLights' || singleLight.category === 'magneticTrack' || singleLight.category === 'specialtyLights' || singleLight.category === 'decorativeLights' || singleLight.category === 'laserBlades')) {
            setShowSpotlightControls(true);
            // Set control values...
            setSpotlightBeamAngle(singleLight.beamAngle || 45);
            setSpotlightColor(singleLight.color || '#ffff00');
            setSpotlightIntensity(singleLight.intensity || 80);
            setSpotlightRotation(singleLight.rotation || 0);
            setSpotlightSize(singleLight.size || 30);
          }
        }
        
        setTimeout(() => drawFloorPlan(), 1);
        return;
      }
      
      // Start drag selection if no light clicked and not Ctrl+Click
      if (!clickedLight && !event.ctrlKey) {
        setIsGroupSelecting(true);
        setGroupSelectionStart({ x, y });
        setGroupSelectionEnd({ x, y });
        // Clear existing selections
        setSelectedLightIds(new Set());
        setGroupBounds(null);
        setShowGroupControls(false);
        setSelectedLightId(null);
        setShowSpotlightControls(false);
        return;
      }
    }

    // Original single light selection logic (when not in group mode)
    if (selectedTool === 'select' && clickedLight && selectedLightIds.size <= 1) {
      // PRIORITY 1: Check for linear light or magnetic track resize/rotate handles FIRST
      if (clickedLight.category === 'linearLights' || clickedLight.category === 'laserBlades' || (clickedLight.category === 'magneticTrack' && clickedLight.isMagneticTrack)) {
        const handle = findLinearHandle(x, y, clickedLight);
        const rotateHandle = findRotationHandle(x, y, clickedLight);
        
        if (handle) {
          // RESIZE MODE - takes absolute priority
          setIsResizingLinear(true);
          setResizeHandle(handle);
          setSelectedLightId(clickedLight.id);
          setIsDragging(false); // Ensure dragging is disabled
          console.log(`🔧 Started resizing ${clickedLight.category} handle: ${handle}`);
          return;
        } else if (rotateHandle) {
          // ROTATE MODE - takes absolute priority
          setIsRotatingLinear(true);
          setSelectedLightId(clickedLight.id);
          setIsDragging(false); // Ensure dragging is disabled
          console.log(`🔄 Started rotating ${clickedLight.category}`);
          return;
        }
        // If no handles detected, continue to selection/drag logic below
      }
      
      // PRIORITY 2: Normal light selection and setup for potential dragging
      // Select the light and prepare for potential drag
      setSelectedLightId(clickedLight.id);
      setSelectedLightIds(new Set([clickedLight.id])); // Keep group selection in sync
      setDragOffset({
        x: x - clickedLight.x,
        y: y - clickedLight.y
      });
      
      // Show enhanced controls for enhanced lights
      if (clickedLight.category === 'spotLights' || clickedLight.category === 'wallWashers' || clickedLight.category === 'linearLights' || clickedLight.category === 'magneticTrack' || clickedLight.category === 'specialtyLights' || clickedLight.category === 'decorativeLights' || clickedLight.category === 'laserBlades') {
        setShowSpotlightControls(true);
        setSpotlightBeamAngle(clickedLight.beamAngle || 45);
        setSpotlightColor(clickedLight.color || '#ffff00');
        setSpotlightIntensity(clickedLight.intensity || 80);
        setSpotlightRotation(clickedLight.rotation || 0);
        setSpotlightSize(clickedLight.size || (clickedLight.category === 'magneticTrack' && !clickedLight.isMagneticTrack ? 16 : 30));
        
        // Set linear-specific properties or magnetic track properties
        if (clickedLight.category === 'linearLights' || clickedLight.category === 'laserBlades' || (clickedLight.category === 'magneticTrack' && clickedLight.isMagneticTrack)) {
          setLinearLength(clickedLight.length || 100);
        }
        
        // Set specialty light mode
        if (clickedLight.category === 'specialtyLights') {
          setSpecialtyLightMode((clickedLight as any).specialtyMode || 'panel');
        }
        
        // Set decorative pattern
        if (clickedLight.category === 'decorativeLights') {
          setDecorativePattern((clickedLight as any).decorativePattern || 'ambient');
        }
        
        // Set laser blade intensity
        if (clickedLight.category === 'laserBlades') {
          setLaserBladeIntensity(clickedLight.intensity || 90);
          setLaserBladeWidth((clickedLight as any).laserBladeWidth || 2);
        }
      } else {
        setShowSpotlightControls(false);
      }
      
      // Find and highlight nearby lights for linking (only for linear lights, not when resizing/rotating)
      if (clickedLight.category === 'linearLights') {
        const nearby = findNearbyLinearLights(clickedLight);
        setNearbyLinearLights(nearby);
        setShowLinkingIndicators(nearby.length > 0);
      }
      
      setTimeout(() => drawFloorPlan(), 1);
    } else if (selectedTool === 'select' && !clickedLight) {
      // Clicked on empty space - clear all selections
      setSelectedLightId(null);
      setSelectedLightIds(new Set());
      setGroupBounds(null);
      setShowGroupControls(false);
      setShowSpotlightControls(false);
      setIsResizingLinear(false);
      setIsRotatingLinear(false);
      setResizeHandle(null);
      setShowDirectionPrompt(false);
      setShowLinkingIndicators(false);
      setNearbyLinearLights([]);
      setTimeout(() => drawFloorPlan(), 1);
    }
  };

  // Handle mouse move - drag if we're dragging, otherwise show hover
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);
    
    // Handle group selection rectangle
    if (isGroupSelecting && groupSelectionStart) {
      setGroupSelectionEnd({ x, y });
      
      // Update selected lights based on current selection rectangle
      const lightsInRect = placedLights.filter(light => 
        isLightInSelectionRect(light, groupSelectionStart, { x, y })
      );
      const newSelectedIds = new Set(lightsInRect.map(light => light.id));
      setSelectedLightIds(newSelectedIds);
      
      setTimeout(() => drawFloorPlan(), 1);
      return;
    }
    
    // Handle group dragging
    if (isGroupDragging && selectedLightIds.size > 0) {
      const deltaX = x - dragStartPos.x;
      const deltaY = y - dragStartPos.y;
      
      setPlacedLights(prev => prev.map(light => {
        if (selectedLightIds.has(light.id)) {
          const newX = light.x + deltaX - groupDragOffset.x;
          const newY = light.y + deltaY - groupDragOffset.y;
          
          // For linear lights and magnetic tracks, update endpoints based on new center
          if (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
            const endpoints = calculateLinearEndpoints(newX, newY, light.rotation || 0, light.length || 100);
            const updatedLight = { 
              ...light, 
              x: newX, 
              y: newY,
              startX: endpoints.startX,
              startY: endpoints.startY,
              endX: endpoints.endX,
              endY: endpoints.endY
            };
            
            // If this is a magnetic track being moved, update attached lights
            if (light.category === 'magneticTrack' && light.isMagneticTrack) {
              setTimeout(() => {
                updateTrackMountedLights(light.id, updatedLight);
              }, 10);
            }
            
            return updatedLight;
          } else {
            return { ...light, x: newX, y: newY };
          }
        }
        return light;
      }));
      
      setGroupDragOffset({ x: deltaX, y: deltaY });
      setGroupBounds(calculateGroupBounds(selectedLightIds));
      setTimeout(() => drawFloorPlan(), 1);
      return;
    }
    
    // Handle track position indicator for magnetic track lights
    if (selectedTool === 'light' && selectedFixture && canPlaceOnMagneticTrack(selectedFixture) && selectedFixture.type !== 'magnetic-track') {
      const trackInfo = findMagneticTrackAtPosition(x, y);
      if (trackInfo) {
        setTrackPositionIndicator({
          x: trackInfo.x,
          y: trackInfo.y,
          trackId: trackInfo.track.id
        });
      } else {
        setTrackPositionIndicator(null);
      }
    } else {
      setTrackPositionIndicator(null);
    }
    
    // Handle linear light rotation
    if (isRotatingLinear && selectedLightId) {
      const selectedLight = placedLights.find(light => light.id === selectedLightId);
      if (selectedLight) {
        const angle = Math.atan2(y - selectedLight.y, x - selectedLight.x) * 180 / Math.PI;
        
        setPlacedLights(prev => prev.map(light => {
          if (light.id === selectedLightId && (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack))) {
            const endpoints = calculateLinearEndpoints(light.x, light.y, angle, light.length || 100);
            const updatedLight = {
              ...light,
              rotation: angle,
              ...endpoints
            };
            
            // If this is a magnetic track being rotated, update attached lights
            if (light.category === 'magneticTrack' && light.isMagneticTrack) {
              setTimeout(() => {
                updateTrackMountedLights(light.id, updatedLight);
              }, 10);
            }
            
            return updatedLight;
          }
          return light;
        }));
        
        setSpotlightRotation(angle);
        setTimeout(() => drawFloorPlan(), 1);
      }
      return;
    }
    
    // Handle linear light resizing
    if (isResizingLinear && selectedLightId && resizeHandle) {
      setPlacedLights(prev => prev.map(light => {
        if (light.id === selectedLightId && (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack))) {
          if (resizeHandle === 'start') {
            const newStartX = x;
            const newStartY = y;
            const endX = light.endX || light.x + (light.length || 100) / 2;
            const endY = light.endY || light.y;
            
            // Calculate new center and length
            const newCenterX = (newStartX + endX) / 2;
            const newCenterY = (newStartY + endY) / 2;
            const newLength = Math.sqrt((endX - newStartX) ** 2 + (endY - newStartY) ** 2);
            const newRotation = Math.atan2(endY - newStartY, endX - newStartX) * 180 / Math.PI;
            
            // Check for nearby lights for linking
            const updatedLight = {
              ...light,
              x: newCenterX,
              y: newCenterY,
              startX: newStartX,
              startY: newStartY,
              endX: endX,
              endY: endY,
              length: Math.max(20, newLength),
              rotation: newRotation
            };
            
            // If this is a magnetic track being resized, update attached lights
            if (light.category === 'magneticTrack' && light.isMagneticTrack) {
              setTimeout(() => {
                updateTrackMountedLights(light.id, updatedLight);
              }, 10);
            }
            
            // Check for nearby lights for linking (only for linear lights)
            if (light.category === 'linearLights') {
            const nearby = findNearbyLinearLights(updatedLight);
            setNearbyLinearLights(nearby);
            setShowLinkingIndicators(nearby.length > 0);
            }
            
            return updatedLight;
          } else if (resizeHandle === 'end') {
            const startX = light.startX || light.x - (light.length || 100) / 2;
            const startY = light.startY || light.y;
            const newEndX = x;
            const newEndY = y;
            
            // Calculate new center and length
            const newCenterX = (startX + newEndX) / 2;
            const newCenterY = (startY + newEndY) / 2;
            const newLength = Math.sqrt((newEndX - startX) ** 2 + (newEndY - startY) ** 2);
            const newRotation = Math.atan2(newEndY - startY, newEndX - startX) * 180 / Math.PI;
            
            // Check for nearby lights for linking
            const updatedLight = {
              ...light,
              x: newCenterX,
              y: newCenterY,
              startX: startX,
              startY: startY,
              endX: newEndX,
              endY: newEndY,
              length: Math.max(20, newLength),
              rotation: newRotation
            };
            
            // If this is a magnetic track being resized, update attached lights
            if (light.category === 'magneticTrack' && light.isMagneticTrack) {
              setTimeout(() => {
                updateTrackMountedLights(light.id, updatedLight);
              }, 10);
            }
            
            // Check for nearby lights for linking (only for linear lights)
            if (light.category === 'linearLights') {
            const nearby = findNearbyLinearLights(updatedLight);
            setNearbyLinearLights(nearby);
            setShowLinkingIndicators(nearby.length > 0);
            }
            
            return updatedLight;
          }
        }
        return light;
      }));
      
      // Update linear length state
      const selectedLight = placedLights.find(light => light.id === selectedLightId);
      if (selectedLight) {
        setLinearLength(selectedLight.length || 100);
        setSpotlightRotation(selectedLight.rotation || 0);
      }
      
      setTimeout(() => drawFloorPlan(), 1);
      return;
    }
    
    // Handle dragging for selected lights in select mode (single light only)
    if (selectedLightId && selectedTool === 'select' && mouseDownTime > 0 && !isResizingLinear && !isRotatingLinear && !isGroupDragging && selectedLightIds.size <= 1) {
      const moveDistance = Math.sqrt(
        (x - dragStartPos.x) ** 2 + (y - dragStartPos.y) ** 2
      );

      // Start dragging if mouse moved more than 8 pixels AND we're not in any resize/rotate mode
      if (moveDistance > 8 && !isDragging && !isResizingLinear && !isRotatingLinear) {
        setIsDragging(true);
        console.log(`🚀 Started dragging light ${selectedLightId}`);
      }

      // If we're dragging, update light position
      if (isDragging && !isResizingLinear && !isRotatingLinear) {
        setPlacedLights(prev => prev.map(light => {
          if (light.id === selectedLightId) {
            const newX = x - dragOffset.x;
            const newY = y - dragOffset.y;
            
            // For linear lights and magnetic tracks, update endpoints based on new center
            if (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
              const endpoints = calculateLinearEndpoints(newX, newY, light.rotation || 0, light.length || 100);
              const updatedLight = { 
                ...light, 
                x: newX, 
                y: newY,
                startX: endpoints.startX,
                startY: endpoints.startY,
                endX: endpoints.endX,
                endY: endpoints.endY
              };
              
              // If this is a magnetic track being moved, update attached lights
              if (light.category === 'magneticTrack' && light.isMagneticTrack) {
                // Delay the update to avoid state conflicts
                setTimeout(() => {
                  updateTrackMountedLights(light.id, updatedLight);
                }, 10);
              }
              
              // Check for nearby lights for linking during drag (only for linear lights)
              if (light.category === 'linearLights') {
              const nearby = findNearbyLinearLights(updatedLight);
              setNearbyLinearLights(nearby);
              setShowLinkingIndicators(nearby.length > 0);
              }
              
              return updatedLight;
            } else {
              return { ...light, x: newX, y: newY };
            }
          }
          return light;
        }));
        setTimeout(() => drawFloorPlan(), 1);
      }
    } else if (!isDragging && !isResizingLinear && !isRotatingLinear && !isGroupDragging && !isGroupSelecting) {
      // Handle hover effects when not dragging, resizing, rotating, or group selecting
      const hoveredLight = findLightAtPosition(x, y);
      const newHoveredId = hoveredLight?.id || null;
      
      // Check for linear light handle hover (including magnetic tracks)
      let newHoveredHandle: 'start' | 'end' | 'rotate' | null = null;
      if (hoveredLight && (hoveredLight.category === 'linearLights' || hoveredLight.category === 'laserBlades' || (hoveredLight.category === 'magneticTrack' && hoveredLight.isMagneticTrack))) {
        newHoveredHandle = findLinearHandle(x, y, hoveredLight);
        
        // Also check for rotation handle
        if (!newHoveredHandle && findRotationHandle(x, y, hoveredLight)) {
          newHoveredHandle = 'rotate';
        }
      }
      
      if (newHoveredId !== hoveredLightId || newHoveredHandle !== hoveredHandle) {
        setHoveredLightId(newHoveredId);
        setHoveredHandle(newHoveredHandle);
        setTimeout(() => drawFloorPlan(), 1);
      }
    }
  };

  // Handle mouse up - finish drag or handle click
  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);
    const clickDuration = Date.now() - mouseDownTime;
    const moveDistance = Math.sqrt(
      (x - dragStartPos.x) ** 2 + (y - dragStartPos.y) ** 2
    );

    // Complete group selection
    if (isGroupSelecting) {
      setIsGroupSelecting(false);
      if (groupSelectionStart && groupSelectionEnd) {
        const lightsInRect = placedLights.filter(light => 
          isLightInSelectionRect(light, groupSelectionStart, groupSelectionEnd)
        );
        const newSelectedIds = new Set(lightsInRect.map(light => light.id));
        setSelectedLightIds(newSelectedIds);
        setGroupBounds(calculateGroupBounds(newSelectedIds));
        setShowGroupControls(newSelectedIds.size > 1);
        
        console.log(`📦 Group selected ${newSelectedIds.size} lights`);
      }
      setGroupSelectionStart(null);
      setGroupSelectionEnd(null);
      setTimeout(() => drawFloorPlan(), 1);
      return;
    }
    
    // Complete group dragging
    if (isGroupDragging) {
      setIsGroupDragging(false);
      setGroupDragOffset({ x: 0, y: 0 });
      console.log(`📦 Group moved ${selectedLightIds.size} lights`);
      setTimeout(() => drawFloorPlan(), 1);
      return;
    }

    // If it was a quick click with minimal movement, handle as click
    if (clickDuration < 300 && moveDistance < 8) {
      if (selectedTool === 'light' && selectedFixture) {
        // Place new light
        handleLightPlacement(x, y);
      }
      // Selection is already handled in mouseDown for better responsiveness
    }

    // Always reset drag and resize states
    if (isDragging) {
      setIsDragging(false);
    }
    if (isResizingLinear) {
      setIsResizingLinear(false);
      setResizeHandle(null);
    }
    if (isRotatingLinear) {
      setIsRotatingLinear(false);
    }
    setDragOffset({ x: 0, y: 0 });
    setDragStartPos({ x: 0, y: 0 });
    setMouseDownTime(0);
    
    // Auto-link nearby lights if close enough
    if (selectedLightId && nearbyLinearLights.length > 0) {
      const selectedLight = placedLights.find(light => light.id === selectedLightId);
      if (selectedLight) {
        nearbyLinearLights.forEach(nearbyLight => {
          const newLinkedSet = new Set(linkedLights);
          newLinkedSet.add(selectedLight.id);
          newLinkedSet.add(nearbyLight.id);
          setLinkedLights(newLinkedSet);
        });
      }
    }
  };

  // Handle mouse leave - clear hover and drag states
  const handleCanvasMouseLeave = () => {
    setHoveredLightId(null);
    setHoveredHandle(null);
    if (isDragging) {
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setDragStartPos({ x: 0, y: 0 });
      setMouseDownTime(0);
    }
    if (isResizingLinear) {
      setIsResizingLinear(false);
      setResizeHandle(null);
    }
    if (isRotatingLinear) {
      setIsRotatingLinear(false);
    }
    setShowDirectionPrompt(false);
    setShowLinkingIndicators(false);
    setTimeout(() => drawFloorPlan(), 1);
  };

  // Handle light placement
  const handleLightPlacement = (x: number, y: number) => {
    if (!selectedFixture) return;

    const isSpotlight = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'spotLights';
    
    const isWallWasher = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'wallWashers';
    
    const isLinearLight = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'linearLights';

    const isMagneticTrack = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'magneticTrack';
    
    // Enhanced categories - NEW
    const isSpecialtyLight = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'specialtyLights';
    
    const isDecorativeLight = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'decorativeLights';
    
    const isLaserBlade = Object.keys(lightFixtures).find(cat => 
      lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
    ) === 'laserBlades';
    
    const isEnhancedLight = isSpotlight || isWallWasher || isLinearLight || isSpecialtyLight || isDecorativeLight || isLaserBlade;

    // Handle magnetic track placement
    if (isMagneticTrack) {
      if (selectedFixture.type === 'magnetic-track') {
        // Base magnetic track - can be placed anywhere
        const newLight: PlacedLight = {
          id: `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fixture: selectedFixture,
          x,
          y,
          category: 'magneticTrack',
          isMagneticTrack: true,
          size: spotlightSize,
          length: linearLength,
          ...calculateLinearEndpoints(x, y, spotlightRotation, linearLength)
        };

        setPlacedLights(prev => [...prev, newLight]);
        console.log('🛤️ Placed magnetic track:', newLight);
        
        // Auto-select new track for editing
        setSelectedLightId(newLight.id);
        setShowSpotlightControls(true);
        setSelectedTool('select');
        
        // Update tracks list
        setTimeout(() => {
          updateMagneticTracks();
          drawFloorPlan();
        }, 10);
        
        return;
      } else {
        // Track-mounted light - must be placed on a track
        const trackInfo = findMagneticTrackAtPosition(x, y);
        
        if (!trackInfo) {
          console.warn('⚠️ Cannot place track light - no magnetic track found at position');
          return;
        }

        const newLight: PlacedLight = {
          id: `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fixture: selectedFixture,
          x: trackInfo.x,
          y: trackInfo.y,
          category: 'magneticTrack',
          isMagneticTrack: false,
          attachedToTrack: trackInfo.track.id,
          trackPosition: trackInfo.position,
          beamAngle: spotlightBeamAngle,
          color: spotlightColor,
          intensity: spotlightIntensity,
          rotation: spotlightRotation,
          size: 16 // Much smaller default size for track lights (was spotlightSize which is 30)
        };

        setPlacedLights(prev => [...prev, newLight]);
        console.log('💡 Placed track light:', newLight);
        
        // Auto-select new light for editing
        setSelectedLightId(newLight.id);
        setShowSpotlightControls(true);
        setSelectedTool('select');
        
        setTimeout(() => drawFloorPlan(), 1);
        return;
      }
    }

      const newLight: PlacedLight = {
        id: `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fixture: selectedFixture,
        x,
        y,
        category: Object.keys(lightFixtures).find(cat => 
          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
      ) || 'unknown',
      ...(isEnhancedLight && {
        beamAngle: spotlightBeamAngle,
        color: spotlightColor,
        intensity: spotlightIntensity,
        rotation: spotlightRotation,
        size: spotlightSize
      }),
      ...(isLinearLight && {
        length: linearLength,
        ...calculateLinearEndpoints(x, y, spotlightRotation, linearLength)
      }),
      // Enhanced properties for new categories
      ...(isLaserBlade && {
        length: linearLength,
        ...calculateLinearEndpoints(x, y, spotlightRotation, linearLength)
      }),
      ...(isSpecialtyLight && {
        specialtyMode: specialtyLightMode
      }),
      ...(isDecorativeLight && {
        decorativePattern: decorativePattern
      })
      };

      setPlacedLights(prev => [...prev, newLight]);
      console.log('💡 Placed light:', newLight);
      
    // Auto-select new enhanced light for immediate editing
    if (isEnhancedLight) {
      setSelectedLightId(newLight.id);
      setShowSpotlightControls(true);
      setSelectedTool('select'); // Switch to select tool for easier editing
    }
    
    setTimeout(() => drawFloorPlan(), 1);
  };

  // Simplified click handler (kept for compatibility)
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // This is now handled by mouseUp, but kept for compatibility
  };

  // Render SVG element on canvas with accurate mapping
  const renderSVGElement = (ctx: CanvasRenderingContext2D, element: any, x: number, y: number, size: number, color: string) => {
    ctx.save();
    
    // Calculate scale factor from SVG viewBox (24x24) to actual size
    const scale = size / 24;
    
    switch (element.type) {
      case 'circle':
        const cx = x + (parseFloat(element.attributes.cx) * scale);
        const cy = y + (parseFloat(element.attributes.cy) * scale);
        const r = parseFloat(element.attributes.r) * scale;
        
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        
        // Handle fill
        if (element.attributes.fill && element.attributes.fill !== 'none') {
          let fillColor = element.attributes.fill;
          
          // Handle color replacement
          if (fillColor === '#FF00FF') {
            fillColor = color;
          } 
          // Handle pattern/url fills with fallback
          else if (fillColor.startsWith('url(')) {
            // For now, use a fallback color for pattern fills
            fillColor = color + '80'; // Semi-transparent version of the color
          }
          
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        
        // Handle stroke
        if (element.attributes.stroke && element.attributes.stroke !== 'none') {
          const strokeColor = element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = parseFloat(element.attributes.strokeWidth || '1') * scale;
          ctx.stroke();
        }
        break;
        
      case 'rect':
        const rx = x + (parseFloat(element.attributes.x) * scale);
        const ry = y + (parseFloat(element.attributes.y) * scale);
        const width = parseFloat(element.attributes.width) * scale;
        const height = parseFloat(element.attributes.height) * scale;
        
        // Handle fill
        if (element.attributes.fill && element.attributes.fill !== 'none') {
          let fillColor = element.attributes.fill;
          
          // Handle color replacement
          if (fillColor === '#FF00FF') {
            fillColor = color;
          } 
          // Handle pattern/url fills with fallback
          else if (fillColor.startsWith('url(')) {
            // For now, use a fallback color for pattern fills
            fillColor = color + '80'; // Semi-transparent version of the color
          }
          
          ctx.fillStyle = fillColor;
          ctx.fillRect(rx, ry, width, height);
        }
        
        // Handle stroke
        if (element.attributes.stroke && element.attributes.stroke !== 'none') {
          const strokeColor = element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = parseFloat(element.attributes.strokeWidth || '1') * scale;
          ctx.strokeRect(rx, ry, width, height);
        }
        break;
        
      case 'line':
        const x1 = x + (parseFloat(element.attributes.x1) * scale);
        const y1 = y + (parseFloat(element.attributes.y1) * scale);
        const x2 = x + (parseFloat(element.attributes.x2) * scale);
        const y2 = y + (parseFloat(element.attributes.y2) * scale);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        
        const strokeColor = element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = parseFloat(element.attributes.strokeWidth || '1') * scale;
        
        // Handle stroke dash array if present
        if (element.attributes.strokeDasharray) {
          const dashArray = element.attributes.strokeDasharray.split(' ').map((d: string) => parseFloat(d) * scale);
          ctx.setLineDash(dashArray);
        }
        
        ctx.stroke();
        
        // Reset dash array
        if (element.attributes.strokeDasharray) {
          ctx.setLineDash([]);
        }
        break;

      case 'path':
        if (element.attributes.d) {
          try {
            // Transform the path data to account for our positioning and scaling
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            
            const path = new Path2D(element.attributes.d);
            
            // Handle fill
            if (element.attributes.fill && element.attributes.fill !== 'none') {
              let fillColor = element.attributes.fill;
              
              // Handle color replacement
              if (fillColor === '#FF00FF') {
                fillColor = color;
              } 
              // Handle pattern/url fills with fallback
              else if (fillColor.startsWith('url(')) {
                // For now, use a fallback color for pattern fills
                fillColor = color + '80'; // Semi-transparent version of the color
              }
              
              ctx.fillStyle = fillColor;
              ctx.fill(path);
            }
            
            // Handle stroke
            if (element.attributes.stroke && element.attributes.stroke !== 'none') {
              const strokeColor = element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke;
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = parseFloat(element.attributes.strokeWidth || '1');
              ctx.stroke(path);
            }
          } catch (e) {
            console.log('Complex path rendering skipped:', element.attributes.d);
          }
        }
        break;

      case 'g':
        // Handle group elements with proper attribute inheritance
        if (element.elements) {
          // Apply group-level transformations or styles if needed
          element.elements.forEach((child: any) => {
            renderSVGElement(ctx, child, x, y, size, color);
          });
        }
        break;

      case 'defs':
        // Skip defs - these are definitions used by other elements
        break;

      case 'clipPath':
        // Skip clipPath for now - would need more complex implementation
        break;

      default:
        // Handle unknown elements by trying to render their children
        if (element.elements) {
          element.elements.forEach((child: any) => {
            renderSVGElement(ctx, child, x, y, size, color);
          });
        }
        break;
    }
    
    ctx.restore();
  };

  // Draw placed lights on canvas with enhanced spotlight effects
  const drawPlacedLights = (ctx: CanvasRenderingContext2D) => {
    placedLights.forEach(light => {
      const category = lightFixtures[light.category];
      const isSpotlight = light.category === 'spotLights';
      const isWallWasher = light.category === 'wallWashers';
      const isLinearLight = light.category === 'linearLights';
      const isMagneticTrack = light.category === 'magneticTrack';
      const isBaseMagneticTrack = isMagneticTrack && light.isMagneticTrack; // Base track
      const isTrackMountedLight = isMagneticTrack && !light.isMagneticTrack; // Track lights but not the base track
      // Enhanced categories - NEW
      const isSpecialtyLight = light.category === 'specialtyLights';
      const isDecorativeLight = light.category === 'decorativeLights';
      const isLaserBlade = light.category === 'laserBlades';
      const isEnhancedLight = isSpotlight || isWallWasher || isLinearLight || isSpecialtyLight || isDecorativeLight || isLaserBlade;
      const baseColor = category?.color === '#FF00FF' ? '#ffff00' : category?.color || '#ffff00';
      const lightColor = light.color || baseColor;
      const intensity = (light.intensity || 80) / 100;
      const size = light.size || spotlightSize || 30;

      if (isBaseMagneticTrack) {
        // Render magnetic track base (non-glowing)
        ctx.save();
        
        const startX = light.startX || light.x - (light.length || 100) / 2;
        const startY = light.startY || light.y;
        const endX = light.endX || light.x + (light.length || 100) / 2;
        const endY = light.endY || light.y;
        const lineLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        
        // Draw track housing (dark metallic)
        const trackWidth = Math.max(8, size / 4);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = trackWidth;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw track border
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Draw track mounting points
        const numMountPoints = Math.max(2, Math.floor(lineLength / 40));
        for (let i = 0; i < numMountPoints; i++) {
          const t = i / (numMountPoints - 1);
          const mountX = startX + (endX - startX) * t;
          const mountY = startY + (endY - startY) * t;
          
          ctx.fillStyle = '#666666';
          ctx.beginPath();
          ctx.arc(mountX, mountY, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
        
        // Draw resize handles if selected
        if (light.id === selectedLightId) {
          const handleSize = 8;
          
          // Start handle
          ctx.fillStyle = hoveredHandle === 'start' ? '#4a90e2' : '#00ff88';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(startX, startY, handleSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // End handle
          ctx.fillStyle = hoveredHandle === 'end' ? '#4a90e2' : '#00ff88';
          ctx.beginPath();
          ctx.arc(endX, endY, handleSize, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Rotation handle (circular handle around center)
          const rotationRadius = 25;
          ctx.strokeStyle = hoveredHandle === 'rotate' ? '#4a90e2' : '#ffaa00';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(light.x, light.y, rotationRadius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Rotation handle grip
          ctx.fillStyle = hoveredHandle === 'rotate' ? '#4a90e2' : '#ffaa00';
          ctx.beginPath();
          ctx.arc(light.x + rotationRadius, light.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
        
        // Selection and hover indicators
        if (light.id === selectedLightId) {
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 15;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          ctx.setLineDash([]);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        } else if (light.id === hoveredLightId) {
          ctx.strokeStyle = '#4a90e2';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#4a90e2';
          ctx.shadowBlur = 10;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        
        ctx.restore();
      } else if (isEnhancedLight) {
        // Enhanced rendering for spotlights, wall washers, and linear lights
        ctx.save();
        
        if (isLinearLight || isLaserBlade) {
          // Linear light and laser blade specific rendering
          const startX = light.startX || light.x - (light.length || 100) / 2;
          const startY = light.startY || light.y;
          const endX = light.endX || light.x + (light.length || 100) / 2;
          const endY = light.endY || light.y;
          const lineLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
          
          // Enhanced glow for laser blades - more intense and focused
          const glowWidth = isLaserBlade 
            ? size * (0.2 + intensity * 0.5) // Tighter, more focused glow for laser blades
            : size * (0.3 + intensity * 0.7); // Standard linear light glow
          
          const glowLayers = isLaserBlade ? [
            { width: glowWidth * 0.3, alpha: intensity * 1.0, blur: 2 },  // Sharp core
            { width: glowWidth * 0.6, alpha: intensity * 0.6, blur: 5 },  // Tight falloff
            { width: glowWidth * 0.9, alpha: intensity * 0.3, blur: 10 }, // Medium spread
            { width: glowWidth * 1.2, alpha: intensity * 0.1, blur: 15 }  // Outer glow
          ] : [
            { width: glowWidth * 0.4, alpha: intensity * 0.8, blur: 3 },
            { width: glowWidth * 0.7, alpha: intensity * 0.4, blur: 8 },
            { width: glowWidth * 1.0, alpha: intensity * 0.2, blur: 15 },
            { width: glowWidth * 1.3, alpha: intensity * 0.1, blur: 20 }
          ];
          
          // Draw glow layers for linear light
          glowLayers.reverse().forEach(layer => {
            ctx.save();
            
            // Create linear glow path
            const angle = Math.atan2(endY - startY, endX - startX);
            const perpX = Math.cos(angle + Math.PI / 2) * layer.width / 2;
            const perpY = Math.sin(angle + Math.PI / 2) * layer.width / 2;
            
            ctx.beginPath();
            ctx.moveTo(startX + perpX, startY + perpY);
            ctx.lineTo(endX + perpX, endY + perpY);
            ctx.lineTo(endX - perpX, endY - perpY);
            ctx.lineTo(startX - perpX, startY - perpY);
            ctx.closePath();
            
            // Apply wall clipping for linear glow
            const clipPath = createWallRespectingGlow(ctx, light.x, light.y, Math.max(layer.width, lineLength / 2));
            ctx.clip(clipPath);
            
            ctx.shadowColor = lightColor;
            ctx.shadowBlur = layer.blur;
            ctx.fillStyle = `${lightColor}${Math.floor(layer.alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.fill();
            
            ctx.restore();
          });
          
          // Draw the linear fixture housing
          const housingWidth = Math.max(4, size / 8);
          ctx.strokeStyle = 'rgba(60, 60, 60, 0.95)';
          ctx.lineWidth = housingWidth;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          // Draw glowing border
          ctx.strokeStyle = lightColor;
          ctx.lineWidth = 2;
          ctx.shadowColor = lightColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          // Render SVG icons at regular intervals along the line
          const iconSpacing = Math.min(40, lineLength / 3); // Space icons evenly, max 3 icons
          const numIcons = Math.max(1, Math.floor(lineLength / iconSpacing));
          
          for (let i = 0; i < numIcons; i++) {
            const t = numIcons === 1 ? 0.5 : i / (numIcons - 1);
            const iconX = startX + (endX - startX) * t;
            const iconY = startY + (endY - startY) * t;
            const iconSize = Math.min(size, 24);
            
            light.fixture.svg.elements.forEach(element => {
              renderSVGElement(ctx, element, iconX - iconSize/2, iconY - iconSize/2, iconSize, lightColor);
            });
          }
          
          // Draw resize handles if selected
          if (light.id === selectedLightId) {
            const handleSize = 8;
            
            // Start handle
            ctx.fillStyle = hoveredHandle === 'start' ? '#4a90e2' : '#00ff88';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(startX, startY, handleSize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // End handle
            ctx.fillStyle = hoveredHandle === 'end' ? '#4a90e2' : '#00ff88';
            ctx.beginPath();
            ctx.arc(endX, endY, handleSize, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Rotation handle (circular handle around center)
            const rotationRadius = 25;
            ctx.strokeStyle = hoveredHandle === 'rotate' ? '#4a90e2' : '#ffaa00';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(light.x, light.y, rotationRadius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Rotation handle grip
            ctx.fillStyle = hoveredHandle === 'rotate' ? '#4a90e2' : '#ffaa00';
            ctx.beginPath();
            ctx.arc(light.x + rotationRadius, light.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          
          // Draw linking indicators for nearby lights
          if (showLinkingIndicators && nearbyLinearLights.some(nearby => nearby.id === light.id)) {
            ctx.strokeStyle = '#ff6b35';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.shadowColor = '#ff6b35';
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.setLineDash([]);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Link connection points
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.arc(startX, startY, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(endX, endY, 4, 0, 2 * Math.PI);
            ctx.fill();
          }
          
        } else {
          // Circular light rendering (spotlights, wall washers, specialty lights, decorative lights, and track-mounted lights)
          // Calculate glow radius based on intensity and glow radius setting
          const glowRadiusMultiplier = (light.beamAngle || 45) / 100; // Use beam angle as glow radius percentage
          
          // Enhanced glow patterns for different light types
          let glowRadius;
          if (isSpecialtyLight) {
            // Specialty lights have wider, softer glow patterns
            glowRadius = size * (0.8 + intensity * 2.0) * glowRadiusMultiplier;
          } else if (isDecorativeLight) {
            // Decorative lights have warm, ambient glow
            glowRadius = size * (0.6 + intensity * 1.8) * glowRadiusMultiplier;
          } else {
            // Standard spotlight/wall washer glow
            glowRadius = size * (0.5 + intensity * 1.5) * glowRadiusMultiplier;
          }
          
          // Create multiple glow layers for warm, realistic circular effect that respects walls
          let glowLayers;
          if (isSpecialtyLight) {
            // Specialty lights - broader, more diffuse glow
            glowLayers = [
              { radius: glowRadius * 0.2, alpha: intensity * 0.9, blur: 3 },
              { radius: glowRadius * 0.5, alpha: intensity * 0.6, blur: 12 },
              { radius: glowRadius * 0.8, alpha: intensity * 0.3, blur: 20 },
              { radius: glowRadius * 1.2, alpha: intensity * 0.15, blur: 30 },
              { radius: glowRadius * 1.6, alpha: intensity * 0.08, blur: 40 }
            ];
          } else if (isDecorativeLight) {
            // Decorative lights - warm, cozy glow
            glowLayers = [
              { radius: glowRadius * 0.3, alpha: intensity * 0.85, blur: 4 },
              { radius: glowRadius * 0.6, alpha: intensity * 0.5, blur: 10 },
              { radius: glowRadius * 1.0, alpha: intensity * 0.25, blur: 18 },
              { radius: glowRadius * 1.4, alpha: intensity * 0.12, blur: 28 }
            ];
          } else {
            // Standard glow layers
            glowLayers = [
            { radius: glowRadius * 0.3, alpha: intensity * 0.8, blur: 5 },
            { radius: glowRadius * 0.6, alpha: intensity * 0.4, blur: 15 },
            { radius: glowRadius * 1.0, alpha: intensity * 0.2, blur: 25 },
            { radius: glowRadius * 1.4, alpha: intensity * 0.1, blur: 35 }
          ];
          }
          
          // Draw glow layers from outside to inside, clipped by walls
          glowLayers.reverse().forEach(layer => {
            ctx.save();
            
            // Create clipping path that respects walls
            const clipPath = createWallRespectingGlow(ctx, light.x, light.y, layer.radius);
            ctx.clip(clipPath);
            
            // Draw the glow layer
            ctx.shadowColor = lightColor;
            ctx.shadowBlur = layer.blur;
            ctx.fillStyle = `${lightColor}${Math.floor(layer.alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(light.x, light.y, layer.radius, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.restore();
          });
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          // Draw fixture housing with metallic effect
          const housingRadius = size/2 + 4;
          ctx.fillStyle = isTrackMountedLight ? 'rgba(40, 40, 40, 0.95)' : 'rgba(60, 60, 60, 0.95)';
          ctx.beginPath();
          ctx.arc(light.x, light.y, housingRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Glowing border around fixture
          ctx.strokeStyle = lightColor;
          ctx.lineWidth = isTrackMountedLight ? 1.5 : 2;
          ctx.shadowColor = lightColor;
          ctx.shadowBlur = isTrackMountedLight ? 6 : 8;
          ctx.beginPath();
          ctx.arc(light.x, light.y, housingRadius, 0, 2 * Math.PI);
          ctx.stroke();
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          
          // Render the specific SVG icon for this light type
          const iconX = light.x - size/2;
          const iconY = light.y - size/2;
          
          light.fixture.svg.elements.forEach(element => {
            renderSVGElement(ctx, element, iconX, iconY, size, lightColor);
          });
          
          // Bright center highlight (subtle for wall washers and track lights)
          const highlightIntensity = isWallWasher || isTrackMountedLight ? 0.3 : 0.5;
          const highlightGradient = ctx.createRadialGradient(
            light.x - size/6, light.y - size/6, 0,
            light.x, light.y, size/4
          );
          highlightGradient.addColorStop(0, `${lightColor}${Math.floor(highlightIntensity * 255).toString(16).padStart(2, '0')}`);
          highlightGradient.addColorStop(0.7, `${lightColor}${Math.floor(highlightIntensity * 0.5 * 255).toString(16).padStart(2, '0')}`);
          highlightGradient.addColorStop(1, `${lightColor}00`);
          
          ctx.fillStyle = highlightGradient;
          ctx.beginPath();
          ctx.arc(light.x, light.y, size/4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Special indicator for track-mounted lights
          if (isTrackMountedLight) {
            // Draw small connection indicator to show it's attached to track
            ctx.save();
            ctx.strokeStyle = '#4a90e2';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(light.x, light.y, size/2 + 8, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
        
        // Selection and hover indicators for all enhanced lights
        if (light.id === selectedLightId) {
          // Selection indicator - bright green glow
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 4]);
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 15;
          
          if (isLinearLight || isLaserBlade) {
            // Linear selection outline
            const startX = light.startX || light.x - (light.length || 100) / 2;
            const startY = light.startY || light.y;
            const endX = light.endX || light.x + (light.length || 100) / 2;
            const endY = light.endY || light.y;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          } else {
            // Circular selection outline
            ctx.beginPath();
            ctx.arc(light.x, light.y, size/2 + 15, 0, 2 * Math.PI);
            ctx.stroke();
          }
          
          ctx.setLineDash([]);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        } else if (light.id === hoveredLightId) {
          // Hover indicator - subtle blue glow
          ctx.strokeStyle = '#4a90e2';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#4a90e2';
          ctx.shadowBlur = 10;
          
          if (isLinearLight || isLaserBlade) {
            // Linear hover outline
            const startX = light.startX || light.x - (light.length || 100) / 2;
            const startY = light.startY || light.y;
            const endX = light.endX || light.x + (light.length || 100) / 2;
            const endY = light.endY || light.y;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          } else {
            // Circular hover outline
            ctx.beginPath();
            ctx.arc(light.x, light.y, size/2 + 12, 0, 2 * Math.PI);
            ctx.stroke();
          }
          
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        
        ctx.restore();
      } else {
        // Standard rendering for other light types
        const color = category?.color === '#FF00FF' ? '#ffff00' : category?.color || '#ffff00';

      // Draw light fixture background circle
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(light.x, light.y, size/2 + 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();

      // Render each SVG element
      light.fixture.svg.elements.forEach(element => {
        renderSVGElement(ctx, element, light.x - size/2, light.y - size/2, size, color);
      });

        // Add simple glow effect
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color + '40';
      ctx.beginPath();
      ctx.arc(light.x, light.y, size/2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
      }
    });
    
    // Draw curved connections between linked lights
    const processedConnections = new Set<string>();
    
    placedLights.forEach(light1 => {
      if (light1.category !== 'linearLights' || !linkedLights.has(light1.id)) return;
      
      placedLights.forEach(light2 => {
        if (light2.category !== 'linearLights' || !linkedLights.has(light2.id)) return;
        if (light1.id === light2.id) return;
        
        // Avoid drawing the same connection twice
        const connectionKey = [light1.id, light2.id].sort().join('-');
        if (processedConnections.has(connectionKey)) return;
        processedConnections.add(connectionKey);
        
        // Find closest endpoints between the two lights
        const light1StartX = light1.startX || light1.x - (light1.length || 100) / 2;
        const light1StartY = light1.startY || light1.y;
        const light1EndX = light1.endX || light1.x + (light1.length || 100) / 2;
        const light1EndY = light1.endY || light1.y;
        
        const light2StartX = light2.startX || light2.x - (light2.length || 100) / 2;
        const light2StartY = light2.startY || light2.y;
        const light2EndX = light2.endX || light2.x + (light2.length || 100) / 2;
        const light2EndY = light2.endY || light2.y;
        
        // Find the closest connection points
        const connections = [
          { p1: { x: light1StartX, y: light1StartY }, p2: { x: light2StartX, y: light2StartY } },
          { p1: { x: light1StartX, y: light1StartY }, p2: { x: light2EndX, y: light2EndY } },
          { p1: { x: light1EndX, y: light1EndY }, p2: { x: light2StartX, y: light2StartY } },
          { p1: { x: light1EndX, y: light1EndY }, p2: { x: light2EndX, y: light2EndY } }
        ];
        
        let closestConnection = connections[0];
        let minDistance = Math.sqrt(
          (closestConnection.p1.x - closestConnection.p2.x) ** 2 + 
          (closestConnection.p1.y - closestConnection.p2.y) ** 2
        );
        
        connections.forEach(conn => {
          const distance = Math.sqrt(
            (conn.p1.x - conn.p2.x) ** 2 + (conn.p1.y - conn.p2.y) ** 2
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestConnection = conn;
          }
        });
        
        // Only draw connection if points are close enough (within linking threshold)
        if (minDistance <= 30) {
          ctx.save();
          
          // Draw strong ball/node connection
          const lightColor1 = light1.color || '#ffff00';
          const lightColor2 = light2.color || '#ffff00';
          const connectionColor = lightColor1; // Use first light's color
          
          // Calculate connection point (midpoint between closest endpoints)
          const connectionX = (closestConnection.p1.x + closestConnection.p2.x) / 2;
          const connectionY = (closestConnection.p1.y + closestConnection.p2.y) / 2;
          
          // Draw small connecting ball with multiple layers for depth
          const ballRadius = 4; // Much smaller radius
          
          // Draw straight connection lines to the ball first
          ctx.shadowColor = connectionColor;
          ctx.shadowBlur = 3;
          ctx.strokeStyle = connectionColor;
          ctx.lineWidth = 3;
          
          // Line from light1 endpoint to ball
          ctx.beginPath();
          ctx.moveTo(closestConnection.p1.x, closestConnection.p1.y);
          ctx.lineTo(connectionX, connectionY);
          ctx.stroke();
          
          // Line from light2 endpoint to ball
          ctx.beginPath();
          ctx.moveTo(closestConnection.p2.x, closestConnection.p2.y);
          ctx.lineTo(connectionX, connectionY);
          ctx.stroke();
          
          // Now draw small ball over the connection point
          // Outer glow layer (very subtle)
          ctx.shadowColor = connectionColor;
          ctx.shadowBlur = 6;
          ctx.fillStyle = `${connectionColor}40`;
          ctx.beginPath();
          ctx.arc(connectionX, connectionY, ballRadius + 2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Main ball body (same color as lines)
          ctx.shadowBlur = 3;
          ctx.fillStyle = connectionColor;
          ctx.beginPath();
          ctx.arc(connectionX, connectionY, ballRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Small inner highlight for 3D effect
          ctx.shadowBlur = 0;
          ctx.fillStyle = `${connectionColor}cc`;
          ctx.beginPath();
          ctx.arc(connectionX - 1, connectionY - 1, ballRadius / 2, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.restore();
        }
      });
    });
    
    // Draw group selection rectangle
    if (isGroupSelecting && groupSelectionStart && groupSelectionEnd) {
      ctx.save();
      
      const minX = Math.min(groupSelectionStart.x, groupSelectionEnd.x);
      const minY = Math.min(groupSelectionStart.y, groupSelectionEnd.y);
      const width = Math.abs(groupSelectionEnd.x - groupSelectionStart.x);
      const height = Math.abs(groupSelectionEnd.y - groupSelectionStart.y);
      
      // Selection rectangle background
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Blue with low opacity
      ctx.fillRect(minX, minY, width, height);
      
      // Selection rectangle border
      ctx.strokeStyle = '#3b82f6'; // Blue
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(minX, minY, width, height);
      ctx.setLineDash([]);
      
      ctx.restore();
    }
    
    // Draw group selection bounds
    if (selectedLightIds.size > 1 && groupBounds) {
      ctx.save();
      
      const padding = 20;
      const boundsWidth = groupBounds.maxX - groupBounds.minX + padding * 2;
      const boundsHeight = groupBounds.maxY - groupBounds.minY + padding * 2;
      const boundsX = groupBounds.minX - padding;
      const boundsY = groupBounds.minY - padding;
      
      // Group bounds background
      ctx.fillStyle = 'rgba(34, 197, 94, 0.05)'; // Green with very low opacity
      ctx.fillRect(boundsX, boundsY, boundsWidth, boundsHeight);
      
      // Group bounds border
      ctx.strokeStyle = '#22c55e'; // Green
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]);
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.strokeRect(boundsX, boundsY, boundsWidth, boundsHeight);
      ctx.setLineDash([]);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Group selection indicator
      ctx.fillStyle = '#22c55e';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `GROUP (${selectedLightIds.size})`, 
        boundsX + boundsWidth / 2, 
        boundsY - 8
      );
      
      // Corner handles for group
      const handleSize = 8;
      const corners = [
        { x: boundsX, y: boundsY }, // Top-left
        { x: boundsX + boundsWidth, y: boundsY }, // Top-right
        { x: boundsX, y: boundsY + boundsHeight }, // Bottom-left
        { x: boundsX + boundsWidth, y: boundsY + boundsHeight } // Bottom-right
      ];
      
      corners.forEach(corner => {
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
        ctx.strokeRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
      });
      
      ctx.restore();
    }
    
    // Highlight selected lights in group
    placedLights.forEach(light => {
      if (selectedLightIds.has(light.id) && selectedLightIds.size > 1) {
        ctx.save();
        
        // Group selection highlight
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        
        if (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
          // Linear light group highlight
          const startX = light.startX || light.x - (light.length || 100) / 2;
          const startY = light.startY || light.y;
          const endX = light.endX || light.x + (light.length || 100) / 2;
          const endY = light.endY || light.y;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        } else {
          // Circular light group highlight
          const size = light.size || 30;
          ctx.beginPath();
          ctx.arc(light.x, light.y, size/2 + 10, 0, 2 * Math.PI);
          ctx.stroke();
        }
        
        ctx.restore();
      }
    });
  };

  // Draw the floorplan as cyberpunk blueprint
  const drawFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas || !floorplanData?.analysis || !uploadedFile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { analysis } = floorplanData;
    
    console.log('🎨 Starting cyberpunk blueprint drawing with analysis:', analysis);
    console.log('📐 Image dimensions:', analysis.image.width, 'x', analysis.image.height);
    console.log('🔍 Detections count:', analysis.detections.total);
    
    // Set canvas size with proper scaling
    const maxWidth = 900;
    const maxHeight = 700;
    const scale = Math.min(maxWidth / analysis.image.width, maxHeight / analysis.image.height, 1);
    
    canvas.width = analysis.image.width * scale;
    canvas.height = analysis.image.height * scale;
    
    console.log('📏 Canvas size set to:', canvas.width, 'x', canvas.height);
    
    // Create image from uploaded file for background
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Black background (cyberpunk theme)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the original image as very low opacity background
        ctx.globalAlpha = 0.15; // Very low opacity (15%)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1; // Reset alpha
        
        // Add cyberpunk grid pattern
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        
        const gridSize = 20;
        for (let x = 0; x <= canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1; // Reset alpha
        
        console.log('🖼️ Cyberpunk background and grid drawn');
        
        // Draw only architectural elements (walls, doors, windows)
        if (analysis.detections.boundingBoxes && analysis.detections.boundingBoxes.length > 0) {
          console.log('🎯 Drawing', analysis.detections.boundingBoxes.length, 'architectural elements...');
          
          // First pass: Draw walls (thick red lines)
          analysis.detections.boundingBoxes.forEach((box: any, index: number) => {
            const objectType = analysis.detections.objects[index]?.name || 'unknown';
            
            if (objectType === 'wall') {
              const scaledBox = {
                x1: box.x1 * scale,
                y1: box.y1 * scale,
                x2: box.x2 * scale,
                y2: box.y2 * scale
              };
              
              // Draw wall as thick red line
              ctx.strokeStyle = '#ff4444'; // Cyberpunk red
              ctx.lineWidth = 6;
              ctx.beginPath();
              
              // Draw wall as rectangle outline for better visibility
              const boxWidth = scaledBox.x2 - scaledBox.x1;
              const boxHeight = scaledBox.y2 - scaledBox.y1;
              
              // Determine if it's more horizontal or vertical wall
              if (boxWidth > boxHeight) {
                // Horizontal wall
                const centerY = scaledBox.y1 + boxHeight / 2;
                ctx.moveTo(scaledBox.x1, centerY);
                ctx.lineTo(scaledBox.x2, centerY);
              } else {
                // Vertical wall
                const centerX = scaledBox.x1 + boxWidth / 2;
                ctx.moveTo(centerX, scaledBox.y1);
                ctx.lineTo(centerX, scaledBox.y2);
              }
              
              ctx.stroke();
              
              // Add glow effect for cyberpunk look
              ctx.shadowColor = '#ff4444';
              ctx.shadowBlur = 3;
              ctx.stroke();
              ctx.shadowBlur = 0; // Reset shadow
            }
          });
          
          // Second pass: Draw doors (bright green)
          analysis.detections.boundingBoxes.forEach((box: any, index: number) => {
            const objectType = analysis.detections.objects[index]?.name || 'unknown';
            
            if (objectType === 'door') {
              const scaledBox = {
                x1: box.x1 * scale,
                y1: box.y1 * scale,
                x2: box.x2 * scale,
                y2: box.y2 * scale
              };
              
              const boxWidth = scaledBox.x2 - scaledBox.x1;
              const boxHeight = scaledBox.y2 - scaledBox.y1;
              const centerX = scaledBox.x1 + boxWidth / 2;
              const centerY = scaledBox.y1 + boxHeight / 2;
              
              // Draw door as arc (swing) in bright green
              ctx.strokeStyle = '#00ff88';
              ctx.lineWidth = 3;
              ctx.beginPath();
              
              // Door opening line
              if (boxWidth > boxHeight) {
                ctx.moveTo(scaledBox.x1, centerY);
                ctx.lineTo(scaledBox.x2, centerY);
              } else {
                ctx.moveTo(centerX, scaledBox.y1);
                ctx.lineTo(centerX, scaledBox.y2);
              }
              ctx.stroke();
              
              // Door swing arc with glow
              ctx.beginPath();
              const radius = Math.min(boxWidth, boxHeight) / 2;
              ctx.arc(centerX, centerY, radius, 0, Math.PI / 2);
              ctx.shadowColor = '#00ff88';
              ctx.shadowBlur = 2;
              ctx.stroke();
              ctx.shadowBlur = 0; // Reset shadow
            }
          });
          
          // Third pass: Draw windows (bright blue)
          analysis.detections.boundingBoxes.forEach((box: any, index: number) => {
            const objectType = analysis.detections.objects[index]?.name || 'unknown';
            
            if (objectType === 'window') {
              const scaledBox = {
                x1: box.x1 * scale,
                y1: box.y1 * scale,
                x2: box.x2 * scale,
                y2: box.y2 * scale
              };
              
              const boxWidth = scaledBox.x2 - scaledBox.x1;
              const boxHeight = scaledBox.y2 - scaledBox.y1;
              
              // Draw window as double lines in bright blue
              ctx.strokeStyle = '#4488ff';
              ctx.lineWidth = 3;
              ctx.beginPath();
              
              if (boxWidth > boxHeight) {
                // Horizontal window
                const y1 = scaledBox.y1 + 2;
                const y2 = scaledBox.y2 - 2;
                ctx.moveTo(scaledBox.x1, y1);
                ctx.lineTo(scaledBox.x2, y1);
                ctx.moveTo(scaledBox.x1, y2);
                ctx.lineTo(scaledBox.x2, y2);
              } else {
                // Vertical window
                const x1 = scaledBox.x1 + 2;
                const x2 = scaledBox.x2 - 2;
                ctx.moveTo(x1, scaledBox.y1);
                ctx.lineTo(x1, scaledBox.y2);
                ctx.moveTo(x2, scaledBox.y1);
                ctx.lineTo(x2, scaledBox.y2);
              }
              
              // Add glow effect
              ctx.shadowColor = '#4488ff';
              ctx.shadowBlur = 2;
              ctx.stroke();
              ctx.shadowBlur = 0; // Reset shadow
              
              if (index < 10) { // Log first 10 for debugging
                console.log(`🔍 Drew ${objectType} at (${scaledBox.x1}, ${scaledBox.y1})`);
              }
            }
          });
          
        } else {
          console.log('❌ No bounding boxes found in analysis');
        }
        
        // Draw placed lights on top
        drawPlacedLights(ctx);
        
        // Draw track position indicator when placing magnetic track lights
        if (trackPositionIndicator) {
          ctx.save();
          
          // Draw pulsing indicator at track position
          const indicatorSize = 12;
          const pulsePhase = (Date.now() % 1000) / 1000; // 1 second pulse cycle
          const pulseScale = 0.8 + 0.4 * Math.sin(pulsePhase * Math.PI * 2);
          
          // Outer glow
          ctx.shadowColor = '#ffff00';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#ffff0060';
          ctx.beginPath();
          ctx.arc(trackPositionIndicator.x, trackPositionIndicator.y, indicatorSize * pulseScale, 0, 2 * Math.PI);
          ctx.fill();
          
          // Inner bright core
          ctx.shadowBlur = 5;
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(trackPositionIndicator.x, trackPositionIndicator.y, indicatorSize * 0.5 * pulseScale, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.restore();
        }
        
        setImageLoaded(true);
        console.log('✅ Cyberpunk blueprint drawing completed successfully');
      };
      
      img.onerror = (error) => {
        console.error('❌ Image load error:', error);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error);
    };
    
    reader.readAsDataURL(uploadedFile);
  };

  // Get floorplan data from navigation state
  useEffect(() => {
    console.log('🔍 Location state:', location.state);
    
    // First try to get from navigation state
    if (location.state?.analysisResult) {
      console.log('📊 Analysis result from navigation:', location.state.analysisResult);
      setFloorplanData(location.state.analysisResult);
    }
    if (location.state?.uploadedFile) {
      console.log('📁 Uploaded file from navigation:', location.state.uploadedFile);
      setUploadedFile(location.state.uploadedFile);
    }
    if (location.state?.projectName) {
      setProjectName(location.state.projectName);
    }
    if (location.state?.projectType) {
      setProjectType(location.state.projectType);
    }

    // Fallback to localStorage if navigation state is empty
    if (!location.state?.analysisResult || !location.state?.uploadedFile) {
      console.log('🔄 Trying localStorage fallback...');
      
      const storedData = localStorage.getItem('belecure_2d_data');
      const storedFile = localStorage.getItem('belecure_2d_file');
      
      if (storedData && storedFile) {
        try {
          const parsedData = JSON.parse(storedData);
          const parsedFile = JSON.parse(storedFile);
          
          console.log('💾 Restored from localStorage:', parsedData);
          
          setFloorplanData(parsedData.analysisResult);
          setProjectName(parsedData.projectName || 'Restored Project');
          setProjectType(parsedData.projectType || 'Residential');
          
          // Recreate File object from stored data
          fetch(parsedFile.data)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], parsedFile.name, { type: parsedFile.type });
              setUploadedFile(file);
              console.log('📁 Restored file from localStorage:', file);
            })
            .catch(err => console.error('❌ Error restoring file:', err));
            
        } catch (error) {
          console.error('❌ Error parsing localStorage data:', error);
        }
      } else {
        console.log('❌ No localStorage data found');
      }
    }
  }, [location.state]);

  // Debug data structure
  useEffect(() => {
    if (floorplanData) {
      console.log('🎯 Floorplan data structure:', {
        hasAnalysis: !!floorplanData.analysis,
        hasDetections: !!floorplanData.analysis?.detections,
        hasObjects: !!floorplanData.analysis?.detections?.objects,
        hasBoundingBoxes: !!floorplanData.analysis?.detections?.boundingBoxes,
        objectCount: floorplanData.analysis?.detections?.total,
        fullData: floorplanData
      });
    }
  }, [floorplanData]);

  // Draw when data is ready
  useEffect(() => {
    if (floorplanData && uploadedFile) {
      console.log('🖼️ Drawing floorplan...');
      drawFloorPlan();
    } else if (canvasRef.current) {
      // Draw a test pattern to verify canvas is working
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 400;
        canvas.height = 300;
        
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Test pattern
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(50, 50, 100, 100);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(150, 50, 100, 100);
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(250, 50, 100, 100);
        
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText('Canvas Test Pattern', 120, 200);
        
        console.log('🧪 Test pattern drawn on canvas');
      }
    }
  }, [floorplanData, uploadedFile, placedLights]); // Add placedLights as dependency

  // Update selected spotlight properties
  const updateSelectedSpotlight = (updates: Partial<PlacedLight>) => {
    if (!selectedLightId) return;
    
    setPlacedLights(prev => prev.map(light => 
      light.id === selectedLightId 
        ? { ...light, ...updates }
        : light
    ));
    
    setTimeout(() => drawFloorPlan(), 10);
  };

  // Handle spotlight property changes
  const handleSpotlightBeamChange = (value: number) => {
    setSpotlightBeamAngle(value);
    updateSelectedSpotlight({ beamAngle: value });
  };

  const handleSpotlightColorChange = (color: string) => {
    setSpotlightColor(color);
    updateSelectedSpotlight({ color });
  };

  const handleSpotlightIntensityChange = (value: number) => {
    setSpotlightIntensity(value);
    updateSelectedSpotlight({ intensity: value });
  };

  const handleSpotlightRotationChange = (value: number) => {
    // Normalize angle to 0-360 degrees
    let normalizedAngle = value % 360;
    if (normalizedAngle < 0) normalizedAngle += 360;
    
    setSpotlightRotation(normalizedAngle);
    updateSelectedSpotlight({ rotation: normalizedAngle });
  };

  const handleSpotlightSizeChange = (value: number) => {
    setSpotlightSize(value);
    updateSelectedSpotlight({ size: value });
  };

  // Get selected spotlight for display
  const selectedSpotlight = selectedLightId 
    ? placedLights.find(light => light.id === selectedLightId)
    : null;

  const handleBack = () => {
    navigate('/');
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 500));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  };

  const handleResetView = () => {
    setZoomLevel(100);
  };

  const tools = [
    { id: 'pan', icon: Move, label: 'Pan' },
    { id: 'select', icon: Layers, label: 'Select & Edit Lights' },
    { id: 'measure', icon: Grid, label: 'Measure' },
    { id: 'light', icon: Lightbulb, label: 'Place Lights' }
  ];

  // Check if we have valid data
  const hasValidData = floorplanData && 
                      floorplanData.analysis && 
                      floorplanData.analysis.detections && 
                      uploadedFile;

  // Check if a point is inside any wall (for circular glow clipping)
  const isPointInsideWall = (x: number, y: number) => {
    if (!floorplanData?.analysis?.detections?.boundingBoxes) return false;
    
    const canvas = canvasRef.current;
    if (!canvas) return false;
    
    const { analysis } = floorplanData;
    const maxWidth = 900;
    const maxHeight = 700;
    const scale = Math.min(maxWidth / analysis.image.width, maxHeight / analysis.image.height, 1);
    
    // Check if point is inside any wall
    for (let i = 0; i < analysis.detections.boundingBoxes.length; i++) {
      const box = analysis.detections.boundingBoxes[i];
      const objectType = analysis.detections.objects[i]?.name || 'unknown';
      
      if (objectType === 'wall') {
        const scaledBox = {
          x1: box.x1 * scale,
          y1: box.y1 * scale,
          x2: box.x2 * scale,
          y2: box.y2 * scale
        };
        
        // Check if point is inside wall rectangle
        if (x >= scaledBox.x1 && x <= scaledBox.x2 && y >= scaledBox.y1 && y <= scaledBox.y2) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Calculate distance from point to nearest wall
  const getDistanceToNearestWall = (x: number, y: number) => {
    if (!floorplanData?.analysis?.detections?.boundingBoxes) return Infinity;
    
    const canvas = canvasRef.current;
    if (!canvas) return Infinity;
    
    const { analysis } = floorplanData;
    const maxWidth = 900;
    const maxHeight = 700;
    const scale = Math.min(maxWidth / analysis.image.width, maxHeight / analysis.image.height, 1);
    
    let minDistance = Infinity;
    
    // Check distance to each wall
    for (let i = 0; i < analysis.detections.boundingBoxes.length; i++) {
      const box = analysis.detections.boundingBoxes[i];
      const objectType = analysis.detections.objects[i]?.name || 'unknown';
      
      if (objectType === 'wall') {
        const scaledBox = {
          x1: box.x1 * scale,
          y1: box.y1 * scale,
          x2: box.x2 * scale,
          y2: box.y2 * scale
        };
        
        // Calculate distance to wall edges
        const distances = [
          Math.abs(y - scaledBox.y1), // Distance to top edge
          Math.abs(y - scaledBox.y2), // Distance to bottom edge
          Math.abs(x - scaledBox.x1), // Distance to left edge
          Math.abs(x - scaledBox.x2)  // Distance to right edge
        ];
        
        const wallDistance = Math.min(...distances);
        minDistance = Math.min(minDistance, wallDistance);
      }
    }
    
    return minDistance;
  };

  // Create a clipping mask for circular glow that respects walls
  const createWallRespectingGlow = (ctx: CanvasRenderingContext2D, lightX: number, lightY: number, maxRadius: number) => {
    // Create a path that represents the allowed glow area (not blocked by walls)
    const glowPath = new Path2D();
    const numPoints = 64; // Number of points around the circle for smooth clipping
    
    let firstPoint = true;
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      let radius = maxRadius;
      
      // Check how far we can go in this direction before hitting a wall
      for (let r = 5; r <= maxRadius; r += 5) {
        const testX = lightX + Math.cos(angle) * r;
        const testY = lightY + Math.sin(angle) * r;
        
        if (isPointInsideWall(testX, testY)) {
          radius = Math.max(0, r - 5); // Stop before the wall
          break;
        }
      }
      
      const x = lightX + Math.cos(angle) * radius;
      const y = lightY + Math.sin(angle) * radius;
      
      if (firstPoint) {
        glowPath.moveTo(x, y);
        firstPoint = false;
      } else {
        glowPath.lineTo(x, y);
      }
    }
    
    glowPath.closePath();
    return glowPath;
  };

  // Refs for latest state access in event handlers
  const selectedLightIdRef = useRef(selectedLightId);
  const selectedToolRef = useRef(selectedTool);
  const placedLightsRef = useRef(placedLights);

  // Update refs when state changes
  useEffect(() => {
    selectedLightIdRef.current = selectedLightId;
  }, [selectedLightId]);

  useEffect(() => {
    selectedToolRef.current = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    placedLightsRef.current = placedLights;
  }, [placedLights]);

  // Undo function
  const performUndo = useCallback(() => {
    if (currentHistoryIndex <= 0) {
      console.log('�� No more undo steps available');
      return;
    }
    
    setIsUndoRedo(true);
    const prevStateIndex = currentHistoryIndex - 1;
    const prevState = undoHistory[prevStateIndex];
    
    if (prevState) {
      console.log(`↩️ Undoing to step ${prevStateIndex + 1}/${undoHistory.length}`);
      setPlacedLights(JSON.parse(JSON.stringify(prevState))); // Deep copy
      setCurrentHistoryIndex(prevStateIndex);
      
      // Clear any selections after undo
      setSelectedLightId(null);
      setShowSpotlightControls(false);
      setHoveredLightId(null);
      
      // Redraw canvas
      setTimeout(() => {
        drawFloorPlan();
        setIsUndoRedo(false);
      }, 10);
    }
  }, [currentHistoryIndex, undoHistory, drawFloorPlan]);

  // Redo function
  const performRedo = useCallback(() => {
    if (currentHistoryIndex >= undoHistory.length - 1) {
      console.log('🚫 No more redo steps available');
      return;
    }
    
    setIsUndoRedo(true);
    const nextStateIndex = currentHistoryIndex + 1;
    const nextState = undoHistory[nextStateIndex];
    
    if (nextState) {
      console.log(`↪️ Redoing to step ${nextStateIndex + 1}/${undoHistory.length}`);
      setPlacedLights(JSON.parse(JSON.stringify(nextState))); // Deep copy
      setCurrentHistoryIndex(nextStateIndex);
      
      // Clear any selections after redo
      setSelectedLightId(null);
      setShowSpotlightControls(false);
      setHoveredLightId(null);
      
      // Redraw canvas
      setTimeout(() => {
        drawFloorPlan();
        setIsUndoRedo(false);
      }, 10);
    }
  }, [currentHistoryIndex, undoHistory, drawFloorPlan]);

  // Handle keyboard shortcuts with useCallback for better performance
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Handle Ctrl+Z for undo
    if (event.ctrlKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      performUndo();
      return;
    }
    
    // Handle Ctrl+Y or Ctrl+Shift+Z for redo
    if (event.ctrlKey && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
      event.preventDefault();
      event.stopPropagation();
      performRedo();
      return;
    }
    
    // Handle Ctrl+D for group duplication
    if (event.ctrlKey && event.key.toLowerCase() === 'd') {
      const currentSelectedLightIds = selectedLightIds;
      if (currentSelectedLightIds.size > 0) {
        event.preventDefault();
        event.stopPropagation();
        
        // Inline duplicate logic to avoid circular dependency
        const selectedLights = placedLights.filter(light => currentSelectedLightIds.has(light.id));
        const bounds = calculateGroupBounds(currentSelectedLightIds);
        
        if (bounds) {
          const offsetX = 50;
          const offsetY = 50;
          
          const duplicatedLights: PlacedLight[] = selectedLights.map(light => ({
            ...light,
            id: `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            x: light.x + offsetX,
            y: light.y + offsetY,
            // Update linear light endpoints if applicable
            ...(light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) && {
              startX: (light.startX || 0) + offsetX,
              startY: (light.startY || 0) + offsetY,
              endX: (light.endX || 0) + offsetX,
              endY: (light.endY || 0) + offsetY
            },
            // Clear track attachment for duplicated track-mounted lights
            ...(light.category === 'magneticTrack' && !light.isMagneticTrack) && {
              attachedToTrack: undefined,
              trackPosition: undefined
            }
          }));
          
          setPlacedLights(prev => [...prev, ...duplicatedLights]);
          const newSelectedIds = new Set(duplicatedLights.map(light => light.id));
          setSelectedLightIds(newSelectedIds);
          setGroupBounds(calculateGroupBounds(newSelectedIds));
          
          console.log(`🔄 Duplicated ${duplicatedLights.length} lights`);
          setTimeout(() => drawFloorPlan(), 10);
        }
        return;
      }
    }
    
    // Handle Ctrl+A for select all lights
    if (event.ctrlKey && event.key.toLowerCase() === 'a' && placedLights.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      const allLightIds = new Set(placedLights.map(light => light.id));
      setSelectedLightIds(allLightIds);
      setGroupBounds(calculateGroupBounds(allLightIds));
      setShowGroupControls(allLightIds.size > 1);
      setSelectedLightId(null);
      setShowSpotlightControls(false);
      console.log(`📦 Selected all ${allLightIds.size} lights`);
      setTimeout(() => drawFloorPlan(), 10);
      return;
    }
    
    // Handle Delete/Backspace keys for deleting selected lights (individual or group)
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      
      // Handle group deletion
      if (selectedLightIds.size > 1) {
        console.log(`🗑️ Deleting group of ${selectedLightIds.size} lights`);
        
        // Inline delete logic to avoid circular dependency
        const lightsToDelete = new Set(selectedLightIds);
        placedLights.forEach(light => {
          if (light.attachedToTrack && selectedLightIds.has(light.attachedToTrack)) {
            lightsToDelete.add(light.id);
          }
        });
        
        setPlacedLights(prev => prev.filter(light => !lightsToDelete.has(light.id)));
        setSelectedLightIds(new Set());
        setGroupBounds(null);
        setShowGroupControls(false);
        
        setTimeout(() => drawFloorPlan(), 10);
        return;
      }
      
      // Handle individual light deletion (existing logic)
    const currentSelectedLightId = selectedLightIdRef.current;
    const currentPlacedLights = placedLightsRef.current;
    
      if (!currentSelectedLightId) return;
    
    const selectedLight = currentPlacedLights.find(light => light.id === currentSelectedLightId);
    if (!selectedLight) return;
      
      console.log(`🗑️ Deleting light: ${selectedLight.fixture.label} (ID: ${currentSelectedLightId})`);
      
      // Special handling for track-mounted lights
      if (selectedLight.category === 'magneticTrack' && !selectedLight.isMagneticTrack) {
        console.log(`🔗 Removing track-mounted light from track: ${selectedLight.attachedToTrack}`);
      }
      // Special handling for magnetic track base deletion
      else if (selectedLight.category === 'magneticTrack' && selectedLight.isMagneticTrack) {
        const attachedLights = currentPlacedLights.filter(light => light.attachedToTrack === currentSelectedLightId);
        console.log(`🛤️ Deleting magnetic track base and ${attachedLights.length} attached lights`);
        
        // Remove the track and all attached lights
        setPlacedLights(prev => prev.filter(light => 
          light.id !== currentSelectedLightId && light.attachedToTrack !== currentSelectedLightId
        ));
        
        // Clear selection and hide controls
        setSelectedLightId(null);
        setSelectedLightIds(new Set());
        setShowSpotlightControls(false);
        setHoveredLightId(null);
        
        // Trigger immediate redraw
        requestAnimationFrame(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx && floorplanData?.analysis && uploadedFile) {
              drawFloorPlan();
            }
          }
        });
        
        return; // Exit early after track deletion
      }
      
      // Remove the selected light from the array (for regular lights and track-mounted lights)
      setPlacedLights(prev => prev.filter(light => light.id !== currentSelectedLightId));
      
      // Clear selection and hide controls
      setSelectedLightId(null);
      setSelectedLightIds(new Set());
      setShowSpotlightControls(false);
      setHoveredLightId(null);
      
      // Trigger immediate redraw
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx && floorplanData?.analysis && uploadedFile) {
            drawFloorPlan();
          }
        }
      });
      
      return; // Exit early after deletion
    }
    
    // Use refs to get latest state
    const currentSelectedLightId = selectedLightIdRef.current;
    const currentSelectedTool = selectedToolRef.current;
    const currentPlacedLights = placedLightsRef.current;
    
    // Only handle keyboard shortcuts if we have a selected light
    if (!currentSelectedLightId || currentSelectedTool !== 'select') return;
    
    const selectedLight = currentPlacedLights.find(light => light.id === currentSelectedLightId);
    if (!selectedLight) return;
    
    // Handle R key for rotation (only for linear lights and magnetic tracks)
    if (event.key.toLowerCase() === 'r' && (selectedLight.category === 'linearLights' || selectedLight.category === 'laserBlades' || (selectedLight.category === 'magneticTrack' && selectedLight.isMagneticTrack))) {
      event.preventDefault(); // Prevent any default browser behavior
      event.stopPropagation(); // Stop event bubbling
      
      // Calculate new rotation immediately
      const currentRotation = selectedLight.rotation || 0;
      const newRotation = (currentRotation + 15) % 360;
      
      console.log(`🔄 Rotating from ${currentRotation}° to ${newRotation}°`);
      
      // Show immediate visual feedback
      setRotationFeedback({ show: true, angle: newRotation });
      
      // Update states immediately and synchronously
      setSpotlightRotation(newRotation);
      
      // Update the light's rotation with immediate effect
      setPlacedLights(prev => {
        const updatedLights = prev.map(light => {
          if (light.id === currentSelectedLightId && (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack))) {
            const endpoints = calculateLinearEndpoints(light.x, light.y, newRotation, light.length || 100);
            const updatedLight = {
              ...light,
              rotation: newRotation,
              ...endpoints
            };
            
            // If this is a magnetic track being rotated, update attached lights
            if (light.category === 'magneticTrack' && light.isMagneticTrack) {
              setTimeout(() => {
                updateTrackMountedLights(light.id, updatedLight);
              }, 10);
            }
            
            return updatedLight;
          }
          return light;
        });
        
        // Trigger immediate redraw using requestAnimationFrame for smoothest performance
        requestAnimationFrame(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx && floorplanData?.analysis && uploadedFile) {
              drawFloorPlan();
            }
          }
        });
        
        return updatedLights;
      });
      
      // Hide feedback after short delay
      setTimeout(() => {
        setRotationFeedback({ show: false, angle: 0 });
      }, 500);
    }
  }, [performUndo, performRedo]); // Fixed dependencies to avoid referencing variables before declaration

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]); // Dependencies to ensure latest state

  // Find magnetic track at position for light placement
  const findMagneticTrackAtPosition = (x: number, y: number, tolerance = 15) => {
    const tracks = placedLights.filter(light => light.isMagneticTrack && light.category === 'magneticTrack');
    
    for (const track of tracks) {
      const startX = track.startX || track.x - (track.length || 100) / 2;
      const startY = track.startY || track.y;
      const endX = track.endX || track.x + (track.length || 100) / 2;
      const endY = track.endY || track.y;
      
      const distanceToTrack = distanceFromPointToLine(x, y, startX, startY, endX, endY);
      
      if (distanceToTrack <= tolerance) {
        // Calculate position along track (0-1)
        const trackLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const projectionLength = ((x - startX) * (endX - startX) + (y - startY) * (endY - startY)) / (trackLength * trackLength);
        const clampedPosition = Math.max(0, Math.min(1, projectionLength));
        
        // Calculate exact position on track
        const trackX = startX + (endX - startX) * clampedPosition;
        const trackY = startY + (endY - startY) * clampedPosition;
        
        return {
          track,
          position: clampedPosition,
          x: trackX,
          y: trackY,
          distanceToTrack
        };
      }
    }
    
    return null;
  };

  // Check if a fixture can be placed on magnetic tracks
  const canPlaceOnMagneticTrack = (fixture: LightFixture) => {
    if (!fixture) return false;
    
    // Base magnetic track can be placed anywhere
    if (fixture.type === 'magnetic-track') return true;
    
    // All other magnetic fixtures need to be on a track
    const magneticFixtureTypes = [
      'track-spot', 'track-spot-2', 'magnetic-laser-blade', 'magnetic-laser-blade-large',
      'magnetic-profile', 'magnetic-profile-large', 'magnetic-profile-adjustable', 
      'magnetic-profile-adjustable-large'
    ];
    
    return magneticFixtureTypes.includes(fixture.type);
  };

  // Update magnetic tracks list when lights change
  const updateMagneticTracks = () => {
    const tracks = placedLights.filter(light => light.isMagneticTrack && light.category === 'magneticTrack');
    setMagneticTracks(tracks);
  };

  // Update magnetic tracks when lights change
  useEffect(() => {
    updateMagneticTracks();
  }, [placedLights]);

  // Update track-mounted lights when their base track moves
  const updateTrackMountedLights = (trackId: string, newTrack: PlacedLight) => {
    setPlacedLights(prev => prev.map(light => {
      if (light.attachedToTrack === trackId && !light.isMagneticTrack) {
        // Recalculate position on the updated track
        const trackStartX = newTrack.startX || newTrack.x - (newTrack.length || 100) / 2;
        const trackStartY = newTrack.startY || newTrack.y;
        const trackEndX = newTrack.endX || newTrack.x + (newTrack.length || 100) / 2;
        const trackEndY = newTrack.endY || newTrack.y;
        
        // Calculate new position using the stored track position
        const position = light.trackPosition || 0.5;
        const newX = trackStartX + (trackEndX - trackStartX) * position;
        const newY = trackStartY + (trackEndY - trackStartY) * position;
        
        return {
          ...light,
          x: newX,
          y: newY
        };
      }
      return light;
    }));
  };

  // Save current state to undo history
  const saveToUndoHistory = useCallback((newLights: PlacedLight[]) => {
    if (isUndoRedo) return; // Don't save during undo/redo operations
    
    setUndoHistory(prev => {
      // Create a deep copy of the current lights state
      const stateCopy = JSON.parse(JSON.stringify(newLights));
      
      // Remove any history after current index (when we make new changes after undoing)
      const newHistory = prev.slice(0, currentHistoryIndex + 1);
      
      // Add new state
      newHistory.push(stateCopy);
      
      // Limit history size
      if (newHistory.length > MAX_UNDO_STEPS) {
        newHistory.shift();
        setCurrentHistoryIndex(MAX_UNDO_STEPS - 1);
      } else {
        setCurrentHistoryIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentHistoryIndex, isUndoRedo]);

  // Save to undo history whenever placedLights changes (except during undo/redo)
  useEffect(() => {
    if (!isUndoRedo) {
      saveToUndoHistory(placedLights);
    }
  }, [placedLights, isUndoRedo]); // Removed saveToUndoHistory from dependencies

  // Initialize undo history with empty state
  useEffect(() => {
    if (undoHistory.length === 0 && !isUndoRedo) {
      console.log('🎯 Initializing undo history with empty state');
      setUndoHistory([[]]);
      setCurrentHistoryIndex(0);
    }
  }, []); // Run only once on mount

  // Group selection states - NEW FEATURE
  const [isGroupSelecting, setIsGroupSelecting] = useState(false);
  const [groupSelectionStart, setGroupSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [groupSelectionEnd, setGroupSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [selectedLightIds, setSelectedLightIds] = useState<Set<string>>(new Set());
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const [groupDragOffset, setGroupDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGroupControls, setShowGroupControls] = useState(false);
  const [groupBounds, setGroupBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // Group Selection Utility Functions - NEW FEATURE
  const calculateGroupBounds = (lightIds: Set<string>) => {
    if (lightIds.size === 0) return null;
    
    const selectedLights = placedLights.filter(light => lightIds.has(light.id));
    if (selectedLights.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedLights.forEach(light => {
      if (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
        // For linear lights, consider both endpoints
        const startX = light.startX || light.x - (light.length || 100) / 2;
        const startY = light.startY || light.y;
        const endX = light.endX || light.x + (light.length || 100) / 2;
        const endY = light.endY || light.y;
        
        minX = Math.min(minX, startX, endX);
        minY = Math.min(minY, startY, endY);
        maxX = Math.max(maxX, startX, endX);
        maxY = Math.max(maxY, startY, endY);
      } else {
        // For circular lights
        const radius = (light.size || 30) / 2;
        minX = Math.min(minX, light.x - radius);
        minY = Math.min(minY, light.y - radius);
        maxX = Math.max(maxX, light.x + radius);
        maxY = Math.max(maxY, light.y + radius);
      }
    });
    
    return { minX, minY, maxX, maxY };
  };

  const isLightInSelectionRect = (light: PlacedLight, startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    const minX = Math.min(startPos.x, endPos.x);
    const minY = Math.min(startPos.y, endPos.y);
    const maxX = Math.max(startPos.x, endPos.x);
    const maxY = Math.max(startPos.y, endPos.y);
    
    if (light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
      // For linear lights, check if any part intersects with selection rectangle
      const startX = light.startX || light.x - (light.length || 100) / 2;
      const startY = light.startY || light.y;
      const endX = light.endX || light.x + (light.length || 100) / 2;
      const endY = light.endY || light.y;
      
      // Check if line intersects with rectangle (simplified check - if any endpoint or center is inside)
      return (
        (startX >= minX && startX <= maxX && startY >= minY && startY <= maxY) ||
        (endX >= minX && endX <= maxX && endY >= minY && endY <= maxY) ||
        (light.x >= minX && light.x <= maxX && light.y >= minY && light.y <= maxY)
      );
    } else {
      // For circular lights, check if center is in rectangle
      return light.x >= minX && light.x <= maxX && light.y >= minY && light.y <= maxY;
    }
  };

  const duplicateSelectedLights = () => {
    if (selectedLightIds.size === 0) return;
    
    const selectedLights = placedLights.filter(light => selectedLightIds.has(light.id));
    const bounds = calculateGroupBounds(selectedLightIds);
    
    if (!bounds) return;
    
    // Calculate offset for duplicates (move them slightly to the right and down)
    const offsetX = 50;
    const offsetY = 50;
    
    const duplicatedLights: PlacedLight[] = selectedLights.map(light => ({
      ...light,
      id: `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: light.x + offsetX,
      y: light.y + offsetY,
      // Update linear light endpoints if applicable
      ...(light.category === 'linearLights' || light.category === 'laserBlades' || (light.category === 'magneticTrack' && light.isMagneticTrack)) && {
        startX: (light.startX || 0) + offsetX,
        startY: (light.startY || 0) + offsetY,
        endX: (light.endX || 0) + offsetX,
        endY: (light.endY || 0) + offsetY
      },
      // Clear track attachment for duplicated track-mounted lights
      ...(light.category === 'magneticTrack' && !light.isMagneticTrack) && {
        attachedToTrack: undefined,
        trackPosition: undefined
      }
    }));
    
    // Add duplicated lights to the scene
    setPlacedLights(prev => [...prev, ...duplicatedLights]);
    
    // Select the new duplicated lights
    const newSelectedIds = new Set(duplicatedLights.map(light => light.id));
    setSelectedLightIds(newSelectedIds);
    setGroupBounds(calculateGroupBounds(newSelectedIds));
    
    console.log(`🔄 Duplicated ${duplicatedLights.length} lights`);
    setTimeout(() => drawFloorPlan(), 10);
  };

  const deleteSelectedLights = () => {
    if (selectedLightIds.size === 0) return;
    
    console.log(`🗑️ Deleting ${selectedLightIds.size} selected lights`);
    
    // Also remove any track-mounted lights attached to deleted tracks
    const lightsToDelete = new Set(selectedLightIds);
    placedLights.forEach(light => {
      if (light.attachedToTrack && selectedLightIds.has(light.attachedToTrack)) {
        lightsToDelete.add(light.id);
      }
    });
    
    setPlacedLights(prev => prev.filter(light => !lightsToDelete.has(light.id)));
    setSelectedLightIds(new Set());
    setGroupBounds(null);
    setShowGroupControls(false);
    
    setTimeout(() => drawFloorPlan(), 10);
  };

  return (
    <div className="min-h-screen bg-black cyber-grid" style={{ backgroundColor: '#000000' }}>
      <Header />
      
      {/* Toolbar */}
      <div className="cyber-card-light border-b border-red-900/20 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Back Button & Title */}
          <div className="flex items-center space-x-6">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 px-4 py-2 cyber-card rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-300 group"
            >
              <ArrowLeft className="w-4 h-4 text-red-300 group-hover:text-red-200" />
              <span className="text-red-300 group-hover:text-red-200 font-medium">BACK</span>
            </button>
            
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-red-100 to-red-200 bg-clip-text text-transparent">
                2D FLOORPLAN VIEW
              </h1>
              <p className="text-sm text-red-200/70">
                {projectName} • {projectType} • Interactive analysis and visualization
              </p>
            </div>
          </div>

          {/* Center - Tools */}
          <div className="flex items-center space-x-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id as any)}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  selectedTool === tool.id
                    ? 'bg-red-900/30 border-red-500/50 text-red-200'
                    : 'cyber-card border-red-500/20 text-red-300 hover:border-red-400/40 hover:text-red-200'
                }`}
                title={tool.label}
              >
                <tool.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Right - Controls */}
          <div className="flex items-center space-x-4">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 cyber-card px-4 py-2 border border-red-500/20 rounded-lg">
              <button
                onClick={handleZoomOut}
                className="text-red-300 hover:text-red-200 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-red-200 font-mono text-sm min-w-[50px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                className="text-red-300 hover:text-red-200 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg border transition-all duration-300 ${
                showGrid
                  ? 'bg-red-900/30 border-red-500/50 text-red-200'
                  : 'cyber-card border-red-500/20 text-red-300 hover:border-red-400/40'
              }`}
              title="Toggle Grid"
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Reset View */}
            <button
              onClick={handleResetView}
              className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Undo/Redo Buttons */}
            <button
              onClick={performUndo}
              disabled={currentHistoryIndex <= 0}
              className={`p-2 rounded-lg border transition-all duration-300 ${
                currentHistoryIndex <= 0
                  ? 'cyber-card border-gray-500/20 text-gray-500 cursor-not-allowed'
                  : 'cyber-card border-blue-500/20 text-blue-300 hover:text-blue-200 hover:border-blue-400/40'
              }`}
              title={`Undo (Ctrl+Z) - ${undoHistory.length > 0 ? `${currentHistoryIndex + 1}/${undoHistory.length}` : 'No history'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            
            <button
              onClick={performRedo}
              disabled={currentHistoryIndex >= undoHistory.length - 1}
              className={`p-2 rounded-lg border transition-all duration-300 ${
                currentHistoryIndex >= undoHistory.length - 1
                  ? 'cyber-card border-gray-500/20 text-gray-500 cursor-not-allowed'
                  : 'cyber-card border-blue-500/20 text-blue-300 hover:text-blue-200 hover:border-blue-400/40'
              }`}
              title={`Redo (Ctrl+Y) - ${undoHistory.length > 0 ? `${currentHistoryIndex + 1}/${undoHistory.length}` : 'No history'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowLightPanel(!showLightPanel)}
                className={`p-2 rounded-lg border transition-all duration-300 ${
                  showLightPanel 
                    ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200' 
                    : 'cyber-card border-red-500/20 text-red-300 hover:text-red-200 hover:border-red-400/40'
                }`}
                title="Light Fixtures"
              >
                <Lightbulb className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  // Navigate to 3D view with all current data
                  const view3DData = {
                    floorplanData,
                    uploadedFile,
                    projectName,
                    projectType,
                    placedLights,
                    lightFixtures,
                    imageLoaded,
                    zoomLevel,
                    showGrid
                  };
                  
                  // Store in localStorage as backup
                  localStorage.setItem('belecure_3d_data', JSON.stringify(view3DData));
                  
                  // Navigate with state
                  navigate('/floorplan-3d', { 
                    state: view3DData
                  });
                }}
                className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300 group"
                title="View in 3D"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </button>
              <button className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300">
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 cyber-card border border-red-500/20 rounded-lg text-red-300 hover:text-red-200 hover:border-red-400/40 transition-all duration-300">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative min-h-[80vh] flex">
        {/* Light Fixtures Panel */}
        {showLightPanel && (
          <div className="w-80 cyber-card-light border-r border-red-900/20 p-4 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-red-300 mb-2">💡 LIGHT FIXTURES</h3>
              <p className="text-xs text-red-200/70 mb-4">
                Select a fixture and click on the blueprint to place it
              </p>
              {selectedTool === 'light' && selectedFixture && (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 text-sm font-medium">
                    🎯 Selected: {selectedFixture.label}
                  </p>
                  <p className="text-yellow-200/70 text-xs">{selectedFixture.description}</p>
                  {/* Enhanced light notice */}
                  {(Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'spotLights' || Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'wallWashers' || Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'linearLights' || Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'specialtyLights' || Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'decorativeLights' || Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'laserBlades') && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-yellow-800/30 to-orange-800/30 rounded border border-yellow-500/20">
                      <p className="text-yellow-200 text-xs font-medium">
                        ✨ Enhanced {Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'spotLights' ? 'Spotlight' : 
                        Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'wallWashers' ? 'Wall Washer' : 
                        Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'linearLights' ? 'Linear Light' :
                        Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'specialtyLights' ? 'Specialty Light' :
                        Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'decorativeLights' ? 'Decorative Light' :
                        Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'laserBlades' ? 'Laser Blade' : 'Light'}!
                      </p>
                      <p className="text-yellow-200/60 text-xs">
                        Place this light and use "Select & Edit" tool to adjust {Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'linearLights' || Object.keys(lightFixtures).find(cat => 
                          lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                        ) === 'laserBlades' ? 'length, glow' : 'glow'}, color & intensity!
                      </p>
                    </div>
                  )}
                  {/* Magnetic Track System notice */}
                  {Object.keys(lightFixtures).find(cat => 
                    lightFixtures[cat].fixtures.some(f => f.type === selectedFixture.type)
                  ) === 'magneticTrack' && (
                    <div className="mt-2 p-2 bg-gradient-to-r from-red-800/30 to-red-700/30 rounded border border-red-500/20">
                      <p className="text-red-200 text-xs font-medium">
                        🛤️ {selectedFixture.type === 'magnetic-track' ? 'Magnetic Track Base' : 'Track-Mounted Light'}!
                      </p>
                      <p className="text-red-200/60 text-xs">
                        {selectedFixture.type === 'magnetic-track' 
                          ? 'Place track anywhere and resize like linear lights. Track will not glow.'
                          : magneticTracks.length > 0 
                            ? 'Must be placed ON a magnetic track. Look for the yellow positioning indicator.'
                            : '⚠️ No magnetic tracks available! Place a magnetic track base first.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {Object.entries(lightFixtures).map(([categoryKey, category]) => (
                <div key={categoryKey} className="cyber-card border border-red-500/20 rounded-lg">
                  <button
                    onClick={() => setExpandedCategories(prev => ({
                      ...prev,
                      [categoryKey]: !prev[categoryKey]
                    }))}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-red-900/20 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color === '#FF00FF' ? '#ffff00' : category.color }}
                      />
                      <div>
                        <h4 className="text-red-200 font-medium text-sm">{category.name}</h4>
                        <p className="text-red-200/60 text-xs">{category.fixtures.length} fixtures</p>
                      </div>
                    </div>
                    {expandedCategories[categoryKey] ? (
                      <ChevronDown className="w-4 h-4 text-red-300" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-red-300" />
                    )}
                  </button>

                  {/* Fixtures List */}
                  {expandedCategories[categoryKey] && (
                    <div className="border-t border-red-500/10 p-2 space-y-1">
                      {category.fixtures.map((fixture) => (
                        <button
                          key={fixture.type}
                          onClick={() => {
                            setSelectedFixture(fixture);
                            setSelectedTool('light');
                          }}
                          className={`w-full flex items-center space-x-3 p-2 rounded-lg text-left transition-all duration-200 ${
                            selectedFixture?.type === fixture.type
                              ? 'bg-yellow-900/30 border border-yellow-500/40'
                              : 'hover:bg-red-900/10 border border-transparent'
                          }`}
                        >
                          {/* SVG Icon */}
                          <div className="w-8 h-8 flex-shrink-0">
                            <svg 
                              viewBox={fixture.svg.viewBox} 
                              className="w-full h-full"
                              style={{ filter: selectedFixture?.type === fixture.type ? 'drop-shadow(0 0 4px #ffff00)' : 'none' }}
                            >
                              {fixture.svg.elements.map((element, index) => {
                                const color = category.color === '#FF00FF' ? '#ffff00' : category.color;
                                switch (element.type) {
                                  case 'circle':
                                    return (
                                      <circle
                                        key={index}
                                        {...element.attributes}
                                        fill={element.attributes.fill === '#FF00FF' ? color : element.attributes.fill}
                                        stroke={element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke}
                                      />
                                    );
                                  case 'rect':
                                    return (
                                      <rect
                                        key={index}
                                        {...element.attributes}
                                        fill={element.attributes.fill === '#FF00FF' ? color : element.attributes.fill}
                                        stroke={element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke}
                                      />
                                    );
                                  case 'line':
                                    return (
                                      <line
                                        key={index}
                                        {...element.attributes}
                                        stroke={element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke}
                                      />
                                    );
                                  case 'path':
                                    return (
                                      <path
                                        key={index}
                                        {...element.attributes}
                                        fill={element.attributes.fill === '#FF00FF' ? color : element.attributes.fill}
                                        stroke={element.attributes.stroke === '#FF00FF' ? color : element.attributes.stroke}
                                      />
                                    );
                                  default:
                                    return null;
                                }
                              })}
                            </svg>
                          </div>
                          
                          {/* Fixture Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-red-200 text-sm font-medium truncate">{fixture.label}</p>
                            <p className="text-red-200/60 text-xs truncate">{fixture.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Placed Lights Summary */}
            {placedLights.length > 0 && (
              <div className="mt-6 cyber-card border border-green-500/20 rounded-lg p-3">
                <h4 className="text-green-300 font-medium text-sm mb-2">📍 PLACED LIGHTS ({placedLights.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {placedLights.map((light) => (
                    <div 
                      key={light.id} 
                      className={`flex items-center justify-between text-xs p-2 rounded transition-all duration-200 ${
                        light.id === selectedLightId 
                          ? 'bg-yellow-900/30 border border-yellow-500/40' 
                          : 'hover:bg-green-900/20'
                      }`}
                    >
                      <div 
                        className="flex items-center space-x-2 flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedLightId(light.id);
                          setSelectedTool('select');
                          if (light.category === 'spotLights' || light.category === 'wallWashers' || light.category === 'linearLights' || light.category === 'magneticTrack') {
                            setShowSpotlightControls(true);
                            setSpotlightBeamAngle(light.beamAngle || 45);
                            setSpotlightColor(light.color || '#ffff00');
                            setSpotlightIntensity(light.intensity || 80);
                            setSpotlightRotation(light.rotation || 0);
                            setSpotlightSize(light.size || (light.category === 'magneticTrack' && !light.isMagneticTrack ? 16 : 30));
                            
                            // Set linear-specific properties or magnetic track properties
                            if (light.category === 'linearLights' || (light.category === 'magneticTrack' && light.isMagneticTrack)) {
                              setLinearLength(light.length || 100);
                            }
                          } else {
                            setShowSpotlightControls(false);
                          }
                          setTimeout(() => drawFloorPlan(), 1);
                        }}
                      >
                        {/* Light type indicator */}
                        {light.category === 'spotLights' || light.category === 'wallWashers' || light.category === 'linearLights' || light.category === 'magneticTrack' || light.category === 'specialtyLights' || light.category === 'decorativeLights' || light.category === 'laserBlades' ? (
                          <div 
                            className={`w-3 h-3 rounded-full ${light.category === 'magneticTrack' && light.isMagneticTrack ? '' : 'animate-pulse'}`}
                            style={{ 
                              backgroundColor: light.category === 'magneticTrack' && light.isMagneticTrack 
                                ? '#666666' // Dark gray for track base (non-glowing)
                                : light.category === 'specialtyLights' 
                                ? '#9333ea' // Purple for specialty lights
                                : light.category === 'decorativeLights'
                                ? '#ec4899' // Pink for decorative lights
                                : light.category === 'laserBlades'
                                ? '#dc2626' // Red for laser blades
                                : light.color || '#ffff00' 
                            }}
                            title={`${
                              light.category === 'magneticTrack' && light.isMagneticTrack 
                                ? 'Magnetic Track Base (Non-glowing)' 
                                : light.category === 'magneticTrack' && !light.isMagneticTrack
                                ? 'Track-Mounted Light'
                                : light.category === 'specialtyLights'
                                ? 'Enhanced Specialty Light'
                                : light.category === 'decorativeLights'
                                ? 'Enhanced Decorative Light'
                                : light.category === 'laserBlades'
                                ? 'Enhanced Laser Blade'
                                : `Enhanced ${
                              light.category === 'spotLights' ? 'Spotlight' : 
                              light.category === 'wallWashers' ? 'Wall Washer' :
                              'Linear Light'
                                }`
                            } - Click to edit`}
                          />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-green-400" title="Standard Light" />
                        )}
                        
                        <span className={`truncate ${light.id === selectedLightId ? 'text-yellow-200' : 'text-green-200'}`}>
                          {light.fixture.label}
                          {light.category === 'magneticTrack' && light.isMagneticTrack && ' 🛤️'}
                          {light.category === 'magneticTrack' && !light.isMagneticTrack && ' 🔗'}
                          {(light.category === 'spotLights' || light.category === 'wallWashers' || light.category === 'linearLights') && ' ✨'}
                          {light.category === 'specialtyLights' && ' 🔧'}
                          {light.category === 'decorativeLights' && ' 🎨'}
                          {light.category === 'laserBlades' && ' ⚡'}
                        </span>
                        
                        {/* Enhanced light properties preview */}
                        {(light.category === 'spotLights' || light.category === 'wallWashers' || light.category === 'linearLights' || light.category === 'magneticTrack' || light.category === 'specialtyLights' || light.category === 'decorativeLights' || light.category === 'laserBlades') && (
                          <span className="text-xs text-yellow-300/60">
                            {light.category === 'magneticTrack' && light.isMagneticTrack 
                              ? `${light.length || 100}px` 
                              : light.category === 'magneticTrack' && !light.isMagneticTrack
                              ? `${light.intensity || 80}% | ${light.size || 16}px`
                              : light.category === 'linearLights' || light.category === 'laserBlades'
                              ? `${light.length || 100}px`
                              : light.category === 'specialtyLights'
                              ? `${light.intensity || 80}% | ${(light as any).specialtyMode || 'panel'}`
                              : light.category === 'decorativeLights'
                              ? `${light.intensity || 80}% | ${(light as any).decorativePattern || 'ambient'}`
                              : `${light.intensity || 80}% | ${light.size || 30}px`
                            }
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (light.id === selectedLightId) {
                            setSelectedLightId(null);
                            setShowSpotlightControls(false);
                          }
                          setPlacedLights(prev => prev.filter(l => l.id !== light.id));
                          setTimeout(() => drawFloorPlan(), 10);
                        }}
                        className="text-red-400 hover:text-red-300 ml-2 p-1"
                        title="Delete light"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Instructions */}
                <div className="mt-3 pt-2 border-t border-green-500/10">
                  <p className="text-green-200/60 text-xs">
                    💡 Click lights to select • ✨ Spotlights, Wall Washers, Linear Lights, Specialty Lights, Decorative Lights & Laser Blades have enhanced controls • 🖱️ Drag to move • 📏 Drag handles to resize linear lights & laser blades • ⌨️ Press R to rotate linear lights & laser blades • 🗑️ Press Del/Backspace to delete selected lights
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Spotlight Controls Panel */}
        {false && (
          <div>Disabled duplicate panel</div>
        )}

        {/* Magnetic Track Base Controls Panel */}
        {showSpotlightControls && selectedSpotlight && selectedSpotlight.category === 'magneticTrack' && selectedSpotlight.isMagneticTrack && (
          <div className="w-80 cyber-card-light border-r border-red-900/20 p-4 overflow-y-auto bg-gradient-to-b from-red-900/10 to-red-800/10">
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse"></div>
                <h3 className="text-lg font-bold text-red-300">
                  🛤️ MAGNETIC TRACK BASE
                </h3>
              </div>
              <p className="text-xs text-red-200/70 mb-4">
                Track base configuration for: {selectedSpotlight.fixture.label}
                <br />
                <span className="text-blue-300/80">📏 Resize like linear lights | Does not emit light</span>
                <br />
                <span className="text-red-300/80">Press [Delete] or [Backspace] to remove this track</span>
              </p>
            </div>

            {/* Track Length Control */}
            <div className="mb-6 cyber-card border border-red-500/20 rounded-lg p-4">
              <label className="block text-red-300 font-medium text-sm mb-3">
                📏 Track Length: {linearLength}px
              </label>
              <input
                type="range"
                min="20"
                max="500"
                value={linearLength}
                onChange={(e) => {
                  const newLength = Number(e.target.value);
                  setLinearLength(newLength);
                  updateSelectedSpotlight({ 
                    length: newLength,
                    ...calculateLinearEndpoints(selectedSpotlight.x, selectedSpotlight.y, selectedSpotlight.rotation || 0, newLength)
                  });
                }}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider"
                style={{
                  background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(linearLength - 20) / 480 * 100}%, #333 ${(linearLength - 20) / 480 * 100}%, #333 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-red-200/60 mt-1">
                <span>20px</span>
                <span>500px</span>
              </div>
            </div>

            {/* Track Rotation Control */}
            <div className="mb-6 cyber-card border border-red-500/20 rounded-lg p-4">
              <label className="block text-red-300 font-medium text-sm mb-3">
                🔄 Track Rotation: {Math.round(spotlightRotation)}°
              </label>
              
              <input
                type="range"
                min="0"
                max="360"
                value={spotlightRotation}
                onChange={(e) => handleSpotlightRotationChange(Number(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider mb-3"
                style={{
                  background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${spotlightRotation / 360 * 100}%, #333 ${spotlightRotation / 360 * 100}%, #333 100%)`
                }}
              />
              
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={Math.round(spotlightRotation)}
                  onChange={(e) => {
                    const newRotation = Number(e.target.value);
                    if (newRotation >= 0 && newRotation <= 360) {
                      handleSpotlightRotationChange(newRotation);
                    }
                  }}
                  className="w-16 px-2 py-1 bg-black/50 border border-red-500/30 rounded text-red-200 text-sm text-center"
                  placeholder="0"
                />
                <span className="text-red-200/70 text-xs">degrees</span>
              </div>
              
              <div className="flex justify-between text-xs text-red-200/60 mt-1">
                <span>0°</span>
                <span>180°</span>
                <span>360°</span>
              </div>
            </div>

            {/* Attached Lights Info */}
            {(() => {
              const attachedLights = placedLights.filter(light => light.attachedToTrack === selectedSpotlight?.id);
              return attachedLights.length > 0 && (
                <div className="mb-6 cyber-card border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-300 font-medium text-sm mb-3">
                    💡 Attached Lights ({attachedLights.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {attachedLights.map((light) => (
                      <div 
                        key={light.id}
                        className="flex items-center justify-between text-xs p-2 bg-blue-900/20 rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: light.color || '#ffff00' }}
                          />
                          <span className="text-blue-200">{light.fixture.label}</span>
                        </div>
                        <span className="text-blue-200/60">{Math.round((light.trackPosition || 0.5) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-blue-200/60 text-xs mt-2">
                    💡 Moving this track will automatically move all attached lights
                  </p>
                </div>
              );
            })()}

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleSpotlightRotationChange(0);
                  setLinearLength(100);
                  updateSelectedSpotlight({ 
                    length: 100,
                    rotation: 0,
                    ...calculateLinearEndpoints(selectedSpotlight.x, selectedSpotlight.y, 0, 100)
                  });
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-red-800/50 to-red-700/50 hover:from-red-700/60 hover:to-red-600/60 text-red-200 rounded-lg border border-red-500/30 transition-all duration-200"
              >
                🔄 Reset Track
              </button>
              <button
                onClick={() => {
                  if (selectedLightId) {
                    console.log(`🗑️ Deleting magnetic track: ${selectedSpotlight?.fixture.label} (ID: ${selectedLightId})`);
                    
                    // Also remove all attached lights
                    const attachedLights = placedLights.filter(light => light.attachedToTrack === selectedLightId);
                    console.log(`🗑️ Also removing ${attachedLights.length} attached lights`);
                    
                    // Remove the track and all attached lights
                    setPlacedLights(prev => prev.filter(light => 
                      light.id !== selectedLightId && light.attachedToTrack !== selectedLightId
                    ));
                    
                    // Clear selection and hide controls
                    setSelectedLightId(null);
                    setShowSpotlightControls(false);
                    setHoveredLightId(null);
                    
                    // Trigger immediate redraw
                    setTimeout(() => drawFloorPlan(), 10);
                  }
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-red-900/50 to-red-800/50 hover:from-red-800/60 hover:to-red-700/60 text-red-300 rounded-lg border border-red-600/40 transition-all duration-200 hover:border-red-500/60"
              >
                🗑️ Delete Track & Lights (Del)
              </button>
              <button
                onClick={() => {
                  setSelectedLightId(null);
                  setShowSpotlightControls(false);
                  setTimeout(() => drawFloorPlan(), 10);
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-red-800/50 to-red-700/50 hover:from-red-700/60 hover:to-red-600/60 text-red-200 rounded-lg border border-red-500/30 transition-all duration-200"
              >
                ✕ Close Controls
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Light Controls Panel */}
        {showSpotlightControls && selectedSpotlight && (selectedSpotlight.category === 'spotLights' || selectedSpotlight.category === 'wallWashers' || selectedSpotlight.category === 'linearLights' || selectedSpotlight.category === 'specialtyLights' || selectedSpotlight.category === 'decorativeLights' || selectedSpotlight.category === 'laserBlades' || (selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack)) && (
          <div className="w-80 cyber-card-light border-r border-red-900/20 p-4 overflow-y-auto bg-gradient-to-b from-yellow-900/10 to-orange-900/10">
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
                <h3 className="text-lg font-bold text-yellow-300">
                  ✨ {selectedSpotlight.category === 'spotLights' ? 'SPOTLIGHT' : 
                      selectedSpotlight.category === 'wallWashers' ? 'WALL WASHER' : 
                      selectedSpotlight.category === 'linearLights' ? 'LINEAR LIGHT' : 
                      selectedSpotlight.category === 'specialtyLights' ? 'SPECIALTY LIGHT' :
                      selectedSpotlight.category === 'decorativeLights' ? 'DECORATIVE LIGHT' :
                      selectedSpotlight.category === 'laserBlades' ? 'LASER BLADE' :
                      'TRACK LIGHT'} CONTROLS
                </h3>
              </div>
              <p className="text-xs text-yellow-200/70 mb-4">
                Adjust {selectedSpotlight.category === 'linearLights' || selectedSpotlight.category === 'laserBlades' || (selectedSpotlight.category === 'magneticTrack' && selectedSpotlight.isMagneticTrack) ? 'length, glow' : 'glow'}, color, and intensity for: {selectedSpotlight.fixture.label}
                <br />
                {selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack && (
                  <span className="text-blue-300/80">🛤️ Track-mounted light | Attached to track</span>
                )}
                {selectedSpotlight.category === 'specialtyLights' && (
                  <span className="text-purple-300/80">🔧 Specialty lighting with advanced features</span>
                )}
                {selectedSpotlight.category === 'decorativeLights' && (
                  <span className="text-pink-300/80">🎨 Decorative lighting with ambient effects</span>
                )}
                {selectedSpotlight.category === 'laserBlades' && (
                  <span className="text-red-300/80">⚡ High-precision laser blade system</span>
                )}
                <br />
                <span className="text-red-300/80">Press [Delete] or [Backspace] to remove this light</span>
              </p>
            </div>

            {/* Linear Length Control (for linear lights, laser blades, and magnetic tracks) */}
            {(selectedSpotlight.category === 'linearLights' || selectedSpotlight.category === 'laserBlades' || (selectedSpotlight.category === 'magneticTrack' && selectedSpotlight.isMagneticTrack)) && (
              <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
                <label className="block text-yellow-300 font-medium text-sm mb-3">
                  📏 Linear Length: {linearLength}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="500"
                  value={linearLength}
                  onChange={(e) => {
                    const newLength = Number(e.target.value);
                    setLinearLength(newLength);
                    updateSelectedSpotlight({ 
                      length: newLength,
                      ...calculateLinearEndpoints(selectedSpotlight.x, selectedSpotlight.y, selectedSpotlight.rotation || 0, newLength)
                    });
                  }}
                  className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider"
                  style={{
                    background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${(linearLength - 20) / 480 * 100}%, #333 ${(linearLength - 20) / 480 * 100}%, #333 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-yellow-200/60 mt-1">
                  <span>20px</span>
                  <span>500px</span>
                </div>
              </div>
            )}

            {/* Glow Radius Control */}
            <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
              <label className="block text-yellow-300 font-medium text-sm mb-3">
                🌟 Glow Radius: {spotlightBeamAngle}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={spotlightBeamAngle}
                onChange={(e) => handleSpotlightBeamChange(Number(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider"
                style={{
                  background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${(spotlightBeamAngle - 10) / 90 * 100}%, #333 ${(spotlightBeamAngle - 10) / 90 * 100}%, #333 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-yellow-200/60 mt-1">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            {/* Color Palette */}
            <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
              <label className="block text-yellow-300 font-medium text-sm mb-3">
                🎨 Light Color
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {spotlightColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleSpotlightColorChange(color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 ${
                      spotlightColor === color
                        ? 'border-yellow-400 scale-110 shadow-lg'
                        : 'border-gray-600 hover:border-yellow-500/50 hover:scale-105'
                    }`}
                    style={{ 
                      backgroundColor: color,
                      boxShadow: spotlightColor === color ? `0 0 12px ${color}` : 'none'
                    }}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={spotlightColor}
                  onChange={(e) => handleSpotlightColorChange(e.target.value)}
                  className="w-8 h-8 rounded border border-yellow-500/30 bg-black cursor-pointer"
                />
                <span className="text-xs text-yellow-200/70 font-mono">{spotlightColor}</span>
              </div>
            </div>

            {/* Intensity Control */}
            <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
              <label className="block text-yellow-300 font-medium text-sm mb-3">
                💡 Intensity: {spotlightIntensity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={spotlightIntensity}
                onChange={(e) => handleSpotlightIntensityChange(Number(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider"
                style={{
                  background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${spotlightIntensity}%, #333 ${spotlightIntensity}%, #333 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-yellow-200/60 mt-1">
                <span>Dim</span>
                <span>Bright</span>
              </div>
            </div>

            {/* Rotation Control */}
            <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
              <label className="block text-yellow-300 font-medium text-sm mb-3">
                🔄 Rotation: {Math.round(spotlightRotation)}°
              </label>
              
              {/* Rotation Slider */}
              <input
                type="range"
                min="0"
                max="360"
                value={spotlightRotation}
                onChange={(e) => handleSpotlightRotationChange(Number(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider mb-3"
                style={{
                  background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${spotlightRotation / 360 * 100}%, #333 ${spotlightRotation / 360 * 100}%, #333 100%)`
                }}
              />
              
              {/* Direct Degree Input */}
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={Math.round(spotlightRotation)}
                  onChange={(e) => {
                    const newRotation = Number(e.target.value);
                    if (newRotation >= 0 && newRotation <= 360) {
                      handleSpotlightRotationChange(newRotation);
                    }
                  }}
                  className="w-16 px-2 py-1 bg-black/50 border border-yellow-500/30 rounded text-yellow-200 text-sm text-center"
                  placeholder="0"
                />
                <span className="text-yellow-200/70 text-xs">degrees</span>
                
                {/* Quick Rotation Buttons */}
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => handleSpotlightRotationChange(0)}
                    className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200"
                    title="0° (Right)"
                  >
                    →
                  </button>
                  <button
                    onClick={() => handleSpotlightRotationChange(90)}
                    className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200"
                    title="90° (Down)"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleSpotlightRotationChange(180)}
                    className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200"
                    title="180° (Left)"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleSpotlightRotationChange(270)}
                    className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200"
                    title="270° (Up)"
                  >
                    ↑
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-yellow-200/60 mt-1">
                <span>0°</span>
                <span>180°</span>
                <span>360°</span>
              </div>
            </div>

            {/* Size Control */}
            <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
              <label className="block text-yellow-300 font-medium text-sm mb-3">
                🔭 Size: {spotlightSize}px
                {selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack && (
                  <span className="text-blue-300/80 text-xs ml-2">(Track Light)</span>
                )}
              </label>
              <input
                type="range"
                min={selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? "8" : "10"}
                max={selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? "50" : "100"}
                value={spotlightSize}
                onChange={(e) => handleSpotlightSizeChange(Number(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer spotlight-slider"
                style={{
                  background: `linear-gradient(to right, #ffd700 0%, #ffd700 ${spotlightSize / (selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? 50 : 100) * 100}%, #333 ${spotlightSize / (selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? 50 : 100) * 100}%, #333 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-yellow-200/60 mt-1">
                <span>{selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? "Tiny" : "Small"}</span>
                <span>{selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? "Medium" : "Large"}</span>
              </div>
              {selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack && (
                <p className="text-blue-200/60 text-xs mt-2">
                  💡 Track lights are typically smaller than ceiling fixtures
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleSpotlightBeamChange(45);
                  handleSpotlightIntensityChange(80);
                  handleSpotlightRotationChange(0);
                  handleSpotlightSizeChange(30);
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-yellow-800/50 to-orange-800/50 hover:from-yellow-700/60 hover:to-orange-700/60 text-yellow-200 rounded-lg border border-yellow-500/30 transition-all duration-200"
              >
                🔄 Reset to Default
              </button>
              <button
                onClick={() => {
                  if (selectedLightId) {
                    console.log(`🗑️ Deleting light via button: ${selectedSpotlight?.fixture.label} (ID: ${selectedLightId})`);
                    
                    // Remove the selected light from the array
                    setPlacedLights(prev => prev.filter(light => light.id !== selectedLightId));
                    
                    // Clear selection and hide controls
                  setSelectedLightId(null);
                  setShowSpotlightControls(false);
                    setHoveredLightId(null);
                    
                    // Trigger immediate redraw
                    setTimeout(() => drawFloorPlan(), 10);
                  }
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-red-900/50 to-red-800/50 hover:from-red-800/60 hover:to-red-700/60 text-red-300 rounded-lg border border-red-600/40 transition-all duration-200 hover:border-red-500/60"
              >
                🗑️ Delete {selectedSpotlight.category === 'magneticTrack' && !selectedSpotlight.isMagneticTrack ? 'Track Light' : 'Light'} (Del)
              </button>
              <button
                onClick={() => {
                  setSelectedLightId(null);
                  setShowSpotlightControls(false);
                  setTimeout(() => drawFloorPlan(), 10);
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-red-800/50 to-red-700/50 hover:from-red-700/60 hover:to-red-600/60 text-red-200 rounded-lg border border-red-500/30 transition-all duration-200"
              >
                ✕ Close Controls
              </button>
            </div>
          </div>
        )}

        {/* Group Controls Panel - NEW FEATURE */}
        {showGroupControls && selectedLightIds.size > 1 && (
          <div className="w-80 cyber-card-light border-r border-red-900/20 p-4 overflow-y-auto bg-gradient-to-b from-green-900/10 to-emerald-900/10">
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                <h3 className="text-lg font-bold text-green-300">
                  📦 GROUP CONTROLS ({selectedLightIds.size})
                </h3>
              </div>
              <p className="text-xs text-green-200/70 mb-4">
                Selected {selectedLightIds.size} lights for group operations
                <br />
                <span className="text-blue-300/80">🖱️ Drag group to move together | Use controls below</span>
                <br />
                <span className="text-yellow-300/80">💡 Hold Ctrl and click to add/remove lights from selection</span>
              </p>
            </div>

            {/* Group Statistics */}
            <div className="mb-6 cyber-card border border-green-500/20 rounded-lg p-4">
              <h4 className="text-green-300 font-medium text-sm mb-3">📊 Group Statistics</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {(() => {
                  const selectedLights = placedLights.filter(light => selectedLightIds.has(light.id));
                  const categories = selectedLights.reduce((acc, light) => {
                    acc[light.category] = (acc[light.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(categories).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="text-green-200/70 capitalize">
                        {category === 'spotLights' ? '🔦 Spotlights' :
                         category === 'wallWashers' ? '🌊 Wall Washers' :
                         category === 'linearLights' ? '📏 Linear' :
                         category === 'specialtyLights' ? '🔧 Specialty' :
                         category === 'decorativeLights' ? '🎨 Decorative' :
                         category === 'laserBlades' ? '⚡ Laser Blades' :
                         category === 'magneticTrack' ? '🛤️ Magnetic' : category}:
                      </span>
                      <span className="text-green-300 font-medium">{count}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Group Bounds Info */}
            {groupBounds && (
              <div className="mb-6 cyber-card border border-green-500/20 rounded-lg p-4">
                <h4 className="text-green-300 font-medium text-sm mb-3">📐 Group Dimensions</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-200/70">Width:</span>
                    <span className="text-green-300 font-medium">{Math.round(groupBounds.maxX - groupBounds.minX)}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200/70">Height:</span>
                    <span className="text-green-300 font-medium">{Math.round(groupBounds.maxY - groupBounds.minY)}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200/70">Center X:</span>
                    <span className="text-green-300 font-medium">{Math.round((groupBounds.maxX + groupBounds.minX) / 2)}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-200/70">Center Y:</span>
                    <span className="text-green-300 font-medium">{Math.round((groupBounds.maxY + groupBounds.minY) / 2)}px</span>
                  </div>
                </div>
              </div>
            )}

            {/* Group Actions */}
            <div className="space-y-3">
              <button
                onClick={duplicateSelectedLights}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-800/50 to-blue-700/50 hover:from-blue-700/60 hover:to-blue-600/60 text-blue-200 rounded-lg border border-blue-500/30 transition-all duration-200 hover:border-blue-400/50 flex items-center justify-center space-x-2"
              >
                <span>📋</span>
                <span className="font-medium">Duplicate Group (Ctrl+D)</span>
              </button>
              
              <button
                onClick={deleteSelectedLights}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-900/50 to-red-800/50 hover:from-red-800/60 hover:to-red-700/60 text-red-300 rounded-lg border border-red-600/40 transition-all duration-200 hover:border-red-500/60 flex items-center justify-center space-x-2"
              >
                <span>🗑️</span>
                <span className="font-medium">Delete Group (Del)</span>
              </button>
              
              <button
                onClick={() => {
                  setSelectedLightIds(new Set());
                  setGroupBounds(null);
                  setShowGroupControls(false);
                  setTimeout(() => drawFloorPlan(), 10);
                }}
                className="w-full py-2 px-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 hover:from-gray-700/60 hover:to-gray-600/60 text-gray-300 rounded-lg border border-gray-500/30 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>✕</span>
                <span>Clear Selection</span>
              </button>
            </div>

            {/* Group Selection Tips */}
            <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
              <h4 className="text-blue-300 font-medium text-sm mb-2">💡 Group Selection Tips</h4>
              <ul className="text-xs text-blue-200/70 space-y-1">
                <li>• <strong>Drag Select:</strong> Click and drag to select multiple lights</li>
                <li>• <strong>Ctrl+Click:</strong> Add/remove individual lights from selection</li>
                <li>• <strong>Group Drag:</strong> Click and drag any selected light to move the group</li>
                <li>• <strong>Keyboard:</strong> Ctrl+D to duplicate, Del to delete group</li>
              </ul>
            </div>
          </div>
        )}

        {/* Canvas Container */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 cyber-card-light border border-red-900/20 m-8 rounded-2xl overflow-visible">
            {/* Canvas Content */}
            <div className="relative w-full h-full bg-black/50 flex items-center justify-center p-8">
              {/* Grid Background */}
              {showGrid && (
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(220, 38, 38, 0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(220, 38, 38, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }}
                />
              )}

              {/* Simplified Canvas Container */}
              {hasValidData ? (
                <div 
                  className="relative z-20 flex flex-col items-center space-y-4"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  {/* Analysis Summary */}
                  <div className="bg-black/90 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between text-sm">
                      <h3 className="font-bold text-emerald-400">AI FLOORPLAN ANALYSIS</h3>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-red-200/70">
                          Objects: <span className="text-emerald-400 font-medium">
                            {floorplanData.analysis?.detections?.total || 0}
                          </span>
                        </span>
                        <span className="text-red-200/70">
                          Status: <span className="text-emerald-400 font-medium">
                            {imageLoaded ? 'RENDERED' : 'LOADING...'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Main Canvas - SIMPLIFIED */}
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className={`border-4 border-red-500 rounded-lg shadow-2xl ${
                        selectedTool === 'light' ? 'cursor-crosshair' :
                        selectedTool === 'select' && isResizingLinear ? 'cursor-ew-resize' :
                        selectedTool === 'select' && isRotatingLinear ? 'cursor-grab' :
                        selectedTool === 'select' && hoveredHandle === 'start' ? 'cursor-w-resize' :
                        selectedTool === 'select' && hoveredHandle === 'end' ? 'cursor-e-resize' :
                        selectedTool === 'select' && hoveredHandle === 'rotate' ? 'cursor-grab' :
                        selectedTool === 'select' && hoveredLightId ? 'cursor-pointer' :
                        selectedTool === 'select' && (isDragging || isGroupDragging) ? 'cursor-grabbing' :
                        selectedTool === 'select' ? 'cursor-grab' :
                        'cursor-default'
                      }`}
                      style={{
                        backgroundColor: '#000000',
                        display: 'block',
                        minWidth: '400px',
                        minHeight: '300px'
                      }}
                      onClick={handleCanvasClick}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseLeave}
                    />
                    
                    {/* Canvas overlay for debugging */}
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg flex items-center justify-center">
                        <span className="text-yellow-300 font-bold">CANVAS LOADING...</span>
                      </div>
                    )}
                    
                    {/* Directional Extension Prompt */}
                    {/* {showDirectionPrompt && selectedLightId && (
                      <div 
                        className="absolute z-50 bg-black/90 border-2 border-yellow-500/50 rounded-lg p-3 pointer-events-none"
                        style={{
                          left: promptPosition.x - 80,
                          top: promptPosition.y - 100,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="text-center">
                          <p className="text-yellow-300 text-xs font-medium mb-2">🔄 Extend Linear Light</p>
                          <div className="grid grid-cols-3 gap-1">
                            <div></div>
                            <button
                              onClick={() => extendLinearLight(selectedLightId!, 'up')}
                              className="w-8 h-8 bg-yellow-600/30 hover:bg-yellow-500/50 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200 pointer-events-auto"
                            >
                              ↑
                            </button>
                            <div></div>
                            <button
                              onClick={() => extendLinearLight(selectedLightId!, 'left')}
                              className="w-8 h-8 bg-yellow-600/30 hover:bg-yellow-500/50 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200 pointer-events-auto"
                            >
                              ←
                            </button>
                            <div className="w-8 h-8 flex items-center justify-center">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            </div>
                            <button
                              onClick={() => extendLinearLight(selectedLightId!, 'right')}
                              className="w-8 h-8 bg-yellow-600/30 hover:bg-yellow-500/50 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200 pointer-events-auto"
                            >
                              →
                            </button>
                            <div></div>
                            <button
                              onClick={() => extendLinearLight(selectedLightId!, 'down')}
                              className="w-8 h-8 bg-yellow-600/30 hover:bg-yellow-500/50 border border-yellow-500/30 rounded text-yellow-200 text-xs transition-all duration-200 pointer-events-auto"
                            >
                              ↓
                            </button>
                            <div></div>
                          </div>
                        </div>
                      </div>
                    )} */}
                  </div>

                  {/* Rotation Feedback Indicator */}
                  {rotationFeedback.show && (
                    <div className="absolute top-4 right-4 bg-yellow-500/90 border border-yellow-400 rounded-lg px-3 py-2 z-50 animate-pulse">
                      <div className="flex items-center space-x-2">
                        <span className="text-black font-bold text-sm">🔄</span>
                        <span className="text-black font-bold text-sm">{rotationFeedback.angle}°</span>
                      </div>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="bg-black/90 border border-red-500/50 rounded-lg p-4 backdrop-blur-sm">
                    <h4 className="text-sm font-bold text-red-300 mb-3">DETECTION LEGEND</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span className="text-white">Walls</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span className="text-white">Doors</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span className="text-white">Windows</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span className="text-white">Rooms</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span className="text-white">Stairs</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-pink-500 rounded"></div>
                        <span className="text-white">Furniture</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center z-20">
                  <div className="w-64 h-48 cyber-card border-2 border-red-500/30 border-dashed rounded-2xl flex flex-col items-center justify-center mb-6">
                    <Layers className="w-12 h-12 text-red-300/50 mb-4" />
                    <p className="text-red-300/70 font-medium">No floorplan data loaded</p>
                    <p className="text-red-200/50 text-sm mt-2">
                      {!floorplanData ? 'Missing analysis data' : 
                       !uploadedFile ? 'Missing file data' : 
                       'Invalid data structure'}
                    </p>
                  </div>
                  
                  {/* Test Canvas when no data */}
                  <div className="mb-6">
                    <canvas
                      ref={canvasRef}
                      className="border-4 border-yellow-500 rounded-lg"
                      style={{
                        backgroundColor: '#ffffff',
                        display: 'block',
                        width: '400px',
                        height: '300px'
                      }}
                    />
                    <p className="text-yellow-400 text-sm mt-2">Test canvas should show colored squares above</p>
                  </div>
                  
                  {/* Debug Information */}
                  <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-left max-w-md mx-auto">
                    <h4 className="text-red-300 font-bold mb-2">Debug Info:</h4>
                    <div className="text-xs text-red-200/70 space-y-1">
                      <div>Has floorplanData: {floorplanData ? '✅' : '❌'}</div>
                      <div>Has uploadedFile: {uploadedFile ? '✅' : '❌'}</div>
                      <div>Has analysis: {floorplanData?.analysis ? '✅' : '❌'}</div>
                      <div>Has detections: {floorplanData?.analysis?.detections ? '✅' : '❌'}</div>
                      <div>Canvas loaded: {imageLoaded ? '✅' : '❌'}</div>
                      <div>Location state keys: {location.state ? Object.keys(location.state).join(', ') : 'none'}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 bg-gradient-to-r from-red-900 via-red-800 to-red-700 hover:from-red-800 hover:via-red-700 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-300 cyber-glow"
                  >
                    GO BACK TO UPLOAD
                  </button>
                </div>
              )}
            </div>

            {/* Status Bar */}
            <div className="absolute bottom-0 left-0 right-0 cyber-card-light border-t border-red-900/20 px-6 py-3 z-30">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <span className="text-red-200/70">
                    Tool: <span className="text-red-300 font-medium capitalize">{selectedTool}</span>
                  </span>
                  <span className="text-red-200/70">
                    Zoom: <span className="text-red-300 font-medium">{zoomLevel}%</span>
                  </span>
                  {hasValidData && (
                    <span className="text-red-200/70">
                      Objects: <span className="text-red-300 font-medium">{floorplanData.analysis?.detections?.total || 0}</span>
                    </span>
                  )}
                  {placedLights.length > 0 && (
                    <span className="text-red-200/70">
                      Lights: <span className="text-red-300 font-medium">{placedLights.length}</span>
                    </span>
                  )}
                  {undoHistory.length > 0 && (
                    <span className="text-blue-200/70">
                      History: <span className="text-blue-300 font-medium">{currentHistoryIndex + 1}/{undoHistory.length}</span>
                    </span>
                  )}
                  <span className="text-red-200/70">
                    Status: <span className={hasValidData ? "text-emerald-300" : "text-red-300"}>
                      {hasValidData ? (imageLoaded ? 'RENDERED' : 'LOADING') : 'NO DATA'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full cyber-pulse ${hasValidData ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs font-medium ${hasValidData ? 'text-emerald-300' : 'text-red-300'}`}>
                    {hasValidData ? (imageLoaded ? 'READY' : 'PROCESSING') : 'ERROR'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorPlan2DView; 
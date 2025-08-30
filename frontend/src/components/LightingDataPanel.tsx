import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronRight, Zap, Palette, RotateCw, Maximize2 } from 'lucide-react';

interface LightingDataPanelProps {
  placedLights: any[];
  lightFixtures: Record<string, any>;
}

const LightingDataPanel: React.FC<LightingDataPanelProps> = ({
  placedLights,
  lightFixtures
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    spotLights: true,
    linearLights: true,
    wallWashers: true,
    magneticTrack: true,
    specialtyLights: true,
    decorativeLights: true,
    laserBlades: true
  });

  // Group placed lights by category
  const lightsByCategory = placedLights.reduce((acc, light) => {
    if (!acc[light.category]) {
      acc[light.category] = [];
    }
    acc[light.category].push(light);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate lighting statistics
  const totalLights = placedLights.length;
  const categoryCounts = Object.entries(lightsByCategory).map(([category, lights]) => ({
    category,
    count: lights.length,
    name: lightFixtures[category]?.name || category
  }));

  // Render SVG icon from light fixture data
  const renderLightIcon = (light: any, size = 24) => {
    if (!light.fixture?.svg?.elements) return null;

    const category = lightFixtures[light.category];
    const color = light.color || (category?.color === '#FF00FF' ? '#ffff00' : category?.color) || '#ffff00';

    return (
      <svg 
        width={size} 
        height={size} 
        viewBox={light.fixture.svg.viewBox}
        className="flex-shrink-0"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      >
        {light.fixture.svg.elements.map((element: any, index: number) => {
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
    );
  };

  const formatLightProperties = (light: any) => {
    const properties: string[] = [];
    
    if (light.intensity !== undefined) properties.push(`${light.intensity}% intensity`);
    if (light.beamAngle !== undefined) properties.push(`${light.beamAngle}° beam`);
    if (light.size !== undefined) properties.push(`${light.size}px size`);
    if (light.rotation !== undefined) properties.push(`${Math.round(light.rotation)}° rotation`);
    if (light.length !== undefined) properties.push(`${light.length}px length`);
    
    return properties.join(' • ');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
          <h3 className="text-lg font-bold text-yellow-300">💡 LIGHTING ANALYSIS</h3>
        </div>
        <p className="text-xs text-yellow-200/70 mb-4">
          Complete lighting setup from 2D view with all fixtures, placements, and configurations
        </p>
      </div>

      {/* Lighting Statistics */}
      <div className="mb-6 cyber-card border border-yellow-500/20 rounded-lg p-4">
        <h4 className="text-yellow-300 font-medium text-sm mb-3">📊 Lighting Summary</h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-yellow-200/70">Total Lights:</span>
            <span className="text-yellow-300 font-medium">{totalLights}</span>
          </div>
          {categoryCounts.map(({ category, count, name }) => (
            <div key={category} className="flex justify-between text-xs">
              <span className="text-yellow-200/60">{name}:</span>
              <span className="text-yellow-300">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lights by Category */}
      <div className="space-y-4">
        {Object.entries(lightFixtures).map(([categoryKey, category]) => {
          const categoryLights = lightsByCategory[categoryKey] || [];
          
          if (categoryLights.length === 0) return null;

          return (
            <div key={categoryKey} className="cyber-card border border-yellow-500/20 rounded-lg">
              <button
                onClick={() => setExpandedCategories(prev => ({
                  ...prev,
                  [categoryKey]: !prev[categoryKey]
                }))}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-yellow-900/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color === '#FF00FF' ? '#ffff00' : category.color }}
                  />
                  <div>
                    <h4 className="text-yellow-200 font-medium text-sm">{category.name}</h4>
                    <p className="text-yellow-200/60 text-xs">{categoryLights.length} lights placed</p>
                  </div>
                </div>
                {expandedCategories[categoryKey] ? (
                  <ChevronDown className="w-4 h-4 text-yellow-300" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-yellow-300" />
                )}
              </button>

              {expandedCategories[categoryKey] && (
                <div className="border-t border-yellow-500/10 p-2 space-y-2">
                  {categoryLights.map((light) => (
                    <div 
                      key={light.id} 
                      className="flex items-start space-x-3 p-3 rounded-lg bg-yellow-900/10 hover:bg-yellow-900/20 transition-colors"
                    >
                      {/* Light Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {renderLightIcon(light, 32)}
                      </div>
                      
                      {/* Light Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-yellow-200 text-sm font-medium truncate">
                            {light.fixture.label}
                          </span>
                          <div className="flex items-center space-x-1">
                            {/* Color indicator */}
                            <div 
                              className="w-3 h-3 rounded-full border border-yellow-500/30"
                              style={{ backgroundColor: light.color || '#ffff00' }}
                              title={`Color: ${light.color || '#ffff00'}`}
                            />
                            {/* Special indicators */}
                            {light.category === 'magneticTrack' && light.isMagneticTrack && (
                              <span className="text-xs text-blue-300" title="Magnetic Track Base">🛤️</span>
                            )}
                            {light.category === 'magneticTrack' && !light.isMagneticTrack && (
                              <span className="text-xs text-green-300" title="Track-Mounted Light">🔗</span>
                            )}
                            {(light.category === 'specialtyLights' || light.category === 'decorativeLights' || light.category === 'laserBlades') && (
                              <span className="text-xs text-purple-300" title="Enhanced Light">✨</span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-yellow-200/60 text-xs mb-2 truncate">
                          {light.fixture.description}
                        </p>
                        
                        {/* Position */}
                        <div className="text-xs text-yellow-200/50 mb-1">
                          Position: {Math.round(light.x)}, {Math.round(light.y)}
                        </div>
                        
                        {/* Properties */}
                        {formatLightProperties(light) && (
                          <div className="text-xs text-yellow-300/80">
                            {formatLightProperties(light)}
                          </div>
                        )}
                        
                        {/* Special Properties */}
                        {light.specialtyMode && (
                          <div className="text-xs text-purple-300/80 mt-1">
                            Mode: {light.specialtyMode}
                          </div>
                        )}
                        {light.decorativePattern && (
                          <div className="text-xs text-pink-300/80 mt-1">
                            Pattern: {light.decorativePattern}
                          </div>
                        )}
                        {light.attachedToTrack && (
                          <div className="text-xs text-blue-300/80 mt-1">
                            Track Position: {Math.round((light.trackPosition || 0) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Lights Message */}
      {totalLights === 0 && (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-yellow-300/50 mx-auto mb-4" />
          <p className="text-yellow-300/70 font-medium">No lights placed</p>
          <p className="text-yellow-200/50 text-sm">Place lights in 2D view to see them here</p>
        </div>
      )}
    </div>
  );
};

export default LightingDataPanel; 
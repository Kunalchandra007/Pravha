import { useCallback, useMemo } from 'react';

interface MapPerformanceOptimizerProps {
  markers: any[];
  zoomLevel: number;
  maxMarkers?: number;
  clusterThreshold?: number;
}

/**
 * Custom hook for map performance optimization
 * Handles marker clustering, virtualization, and performance optimization
 */
export const useMapPerformanceOptimizer = ({
  markers,
  zoomLevel,
  maxMarkers = 100,
  clusterThreshold = 0.02
}: MapPerformanceOptimizerProps) => {
  
  // Calculate distance between two coordinate points
  const calculateDistance = useCallback((coord1: [number, number], coord2: [number, number]) => {
    if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) return Infinity;
    
    return Math.sqrt(
      Math.pow(coord1[0] - coord2[0], 2) +
      Math.pow(coord1[1] - coord2[1], 2)
    );
  }, []);

  // Calculate average coordinates for clustering
  const calculateAverageCoordinates = useCallback((markers: any[]) => {
    const validMarkers = markers.filter(m => 
      (m.coordinates || m.location) && 
      (m.coordinates || m.location).length === 2
    );
    
    if (validMarkers.length === 0) return [0, 0];
    
    const totalLat = validMarkers.reduce((sum, m) => {
      const coords = m.coordinates || m.location;
      return sum + coords[0];
    }, 0);
    
    const totalLng = validMarkers.reduce((sum, m) => {
      const coords = m.coordinates || m.location;
      return sum + coords[1];
    }, 0);
    
    return [totalLat / validMarkers.length, totalLng / validMarkers.length];
  }, []);

  // Enhanced clustering function
  const clusterMarkers = useCallback((markers: any[], zoomLevel: number) => {
    const clusterDistance = zoomLevel < 8 ? 0.05 : zoomLevel < 10 ? clusterThreshold : 0.01;
    const clustered: any[] = [];
    const processed = new Set<number>();
    
    markers.forEach((marker, index) => {
      if (processed.has(index)) return;
      
      const cluster = [marker];
      processed.add(index);
      
      // Find nearby markers to cluster
      markers.forEach((otherMarker, otherIndex) => {
        if (processed.has(otherIndex) || index === otherIndex) return;
        
        const distance = calculateDistance(
          marker.coordinates || marker.location,
          otherMarker.coordinates || otherMarker.location
        );
        
        if (distance < clusterDistance) {
          cluster.push(otherMarker);
          processed.add(otherIndex);
        }
      });
      
      // Create cluster marker
      if (cluster.length > 1) {
        const avgCoords = calculateAverageCoordinates(cluster);
        clustered.push({
          ...cluster[0],
          coordinates: avgCoords,
          location: avgCoords,
          clusterSize: cluster.length,
          isCluster: true,
          originalMarkers: cluster
        });
      } else {
        clustered.push(marker);
      }
    });
    
    return clustered;
  }, [clusterThreshold, calculateDistance, calculateAverageCoordinates]);

  // Optimize markers based on zoom level and performance constraints
  const optimizedMarkers = useMemo(() => {
    if (!markers || markers.length === 0) return [];
    
    // Limit total markers for performance
    let processedMarkers = markers.slice(0, maxMarkers);
    
    // Apply clustering for low zoom levels
    if (zoomLevel < 12) {
      processedMarkers = clusterMarkers(processedMarkers, zoomLevel);
    }
    
    return processedMarkers;
  }, [markers, zoomLevel, maxMarkers, clusterMarkers]);

  // Virtual scrolling for large datasets
  const getVisibleMarkers = useCallback((markers: any[], viewport: any) => {
    if (!viewport || markers.length <= 50) return markers;
    
    // Simple viewport-based filtering
    return markers.filter(marker => {
      const coords = marker.coordinates || marker.location;
      if (!coords || coords.length !== 2) return false;
      
      // Check if marker is within viewport bounds (with some padding)
      const padding = 0.01; // ~1km padding
      return (
        coords[0] >= viewport.south - padding &&
        coords[0] <= viewport.north + padding &&
        coords[1] >= viewport.west - padding &&
        coords[1] <= viewport.east + padding
      );
    });
  }, []);

  return {
    optimizedMarkers,
    clusterMarkers,
    calculateDistance,
    calculateAverageCoordinates,
    getVisibleMarkers
  };
};

// Default export for backward compatibility
const MapPerformanceOptimizer = () => null;
export default MapPerformanceOptimizer;
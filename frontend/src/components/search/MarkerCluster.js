import { MarkerClusterer } from '@googlemaps/markerclusterer';

/**
 * MarkerCluster component helper that groups map markers
 * using Google advanced marker clusterer.
 */
const MarkerCluster = {
  create(map, markers) {
    return new MarkerClusterer({
      map,
      markers
    });
  }
};

export default MarkerCluster;

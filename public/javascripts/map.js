import { publish, subscribe } from './pubSub.js';
import { getContainingCells, findCoverCellsByCenterAndPoint} from './s2.js';

export let map; // Leaflet map object.
const ttl = 10 * 10e3;

const infoBanner = document.getElementById('info');
export function showMessage(message, type = 'loading', errorObject) { // Show loading/instructions/error message.
  if (errorObject) console.error(message, errorObject);
  if (!message) {
    infoBanner.style.display = 'none';
    return;
  }
  
  infoBanner.style = '';
  infoBanner.textContent = message;
  infoBanner.className = `info-banner ${type}`;

  if (type === 'instructions') {
    setTimeout(() => infoBanner.style.display = 'none', 4000);
  }
}

let markers = [];
const icon = L.icon({iconUrl: "images/Achtung.png", iconSize: [40, 35]});
export function showMarker({position, expiration}) { // Add marker at position, completing a fade out at expiration.
  const now = Date.now(),
        remaining = expiration - now;
  if (remaining < 0) return;  // expired.
  const marker = L.marker(position, {icon}).addTo(map);
  // TODO: use css transitions?
  const seconds = remaining,  // milliseconds to fade
        interval = 200, // milliseconds to adjustment
        fade = interval / ttl; // Change in opacity each adjustment.
  let opacity = remaining / ttl;  // We do not start at one it was reported some time ago.
  const timer = setInterval(() => {
    marker.setOpacity(opacity -= fade);
    if (opacity > 0) return;
    clearInterval(timer);
    marker.removeFrom(map);
    markers = markers.filter(m => m != marker);
  }, interval);

  markers.push(marker); // TODO: use a weak map to hold against gc instead?
}

let subscriptions = [];
function updateSubscriptions() { // Update current subscriptions to the new map bounds.
  const center = map.getCenter();
  const bounds = map.getBounds();
  const northEast = bounds.getNorthEast();
  const cells = findCoverCellsByCenterAndPoint(center.lat, center.lng, northEast.lat, northEast.lng);
  for (const cell of subscriptions) cells.includes(cell) || subscribe(cell, null); 
  for (const cell of cells) subscriptions.includes(cell) || subscribe(cell, showMarker);
  subscriptions = cells;
}

var yourLocation;
export function initMap(lat, lng) { // Set up appropriate zoomed initial map and handlers for this position.
  // Initialize map centered on user's location
  map = L.map('map').setView([lat, lng], 14);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Add a marker at user's current location
  yourLocation = L.marker([lat, lng])
    .addTo(map)
    .bindPopup('Your Location')
    .openPopup();

  // Add click event to note postion
  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    const position = [lat, lng];
    //showMarker({position, expiration: Date.now() + ttl}); // To debug by showing immediately.
    const cells = getContainingCells(lat, lng);
    for (const cell of cells) {
      publish(cell, {position, expiration: Date.now() + ttl}, ttl);      
    }
  });

  map.on('moveend', updateSubscriptions);

  updateSubscriptions();
  showMessage('Tap anywhere to mark a concern. Markers fade after 10 min.', 'instructions');
}

export function updateLocation(lat, lng) {
  if (!map) {
    initMap(lat, lng);
    return;
  }
  const latLng = [lat, lng];
  yourLocation.setLatLng(latLng);
  map.panTo(latLng);
}

export function defaultInit() { // After two seconds, show San Fransisco.
  setTimeout(() => {
    updateLocation(37.7749, -122.4194);
  }, 2000);
}


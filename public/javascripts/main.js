import { publish, subscribe } from './pubSub.js';
import { getContainingCells, findCoverCellsByCenterAndPoint} from './s2.js';
let map;
let markers = [];
const icon = L.icon({iconUrl: "images/Achtung.png", iconSize: [40, 35]});
const infoBanner = document.getElementById('info');
const ttl = 10 * 10e3;

function showMarker({position, expiration}) { // Add marker at position, completing a fade out at expiration.
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

let aboutPopup = L.popup({className: 'tipless', content: document.getElementById('aboutContent').innerHTML});
document.getElementById('about-btn').onclick = () => {
  let center = map.getCenter();
  if (aboutPopup.isShowing) {
    aboutPopup.close();
  } else {
    aboutPopup.setLatLng(center);
    map.openPopup(aboutPopup);
  }
  aboutPopup.isShowing = !aboutPopup.isShowing;
};
var qrDisplayContainer = document.getElementById('qrDisplayContainer');
var qrDisplay = document.getElementById('qrDisplay');
document.getElementById('qrButton').onclick = () => { // generate (and display) qr code on-demand (in case url changes)
  const qr = new QRCodeStyling({
    width: 300,
    height: 300,
    type: "svg",
    data: location.href,
    dotsOptions: {
      color: "#bf5107",
      type: "rounded"
    },
    backgroundOptions: {
      color: "#e9ebee",
    },
    image: "images/YZ Owl.png",
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 10
    }
  });
  qrDisplay.innerHTML = '';
  qr.append(qrDisplay);
  qrDisplayContainer.classList.toggle('hidden', false);
}
qrDisplayContainer.onclick = () => qrDisplayContainer.classList.toggle('hidden', true);

function showMessage(message, type = 'loading', errorObject) {
  if (errorObject) {
    console.error(message, errorObject);
  }
  infoBanner.style = '';
  infoBanner.textContent = message;
  infoBanner.className = `info-banner ${type}`;

  if (type === 'instructions') {
    setTimeout(() => {
      infoBanner.style.display = 'none';
    }, 4000);
  }
}
window.showMessage = showMessage; // For use in pubSub. FIXME.

let subscriptions = [];
function updateSubscriptions() {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const northEast = bounds.getNorthEast();
  const cells = findCoverCellsByCenterAndPoint(center.lat, center.lng, northEast.lat, northEast.lng);
  for (const cell of subscriptions) subscribe(cell, null);
  for (const cell of cells) subscribe(cell, showMarker);
  subscriptions = cells;
}

function initMap(lat, lng) {
  // Initialize map centered on user's location
  window.mmap = map = L.map('map').setView([lat, lng], 14);
  
  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  
  // Add a marker at user's current location
  L.marker([lat, lng])
    .addTo(map)
    .bindPopup('Your Location')
    .openPopup();

  // Add click event to note postion
  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    const position = [lat, lng];
    const cells = getContainingCells(lat, lng);
    for (const cell of cells) {
      publish(cell, {position, expiration: Date.now() + ttl}, ttl);      
    }
    //showMarker({position, expiration: Date.now() + ttl}); // To debug by showing immediately.
  });

  map.on('moveend', updateSubscriptions);

  updateSubscriptions();
  showMessage('Tap anywhere to mark a concern. Markers fade after 10 min.', 'instructions');
}
function defaultInit() { // After two second, show San Fransisco.
  setTimeout(() => {
    initMap(37.7749, -122.4194);
  }, 2000);
}

// Get user's geolocation
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      initMap(lat, lng);
    },
    (error) => {
      showMessage('Location access denied. Using default location.', 'error', error);
      defaultInit();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
} else {
  showMessage('Geolocation not supported. Using default location.', 'error', 'fail');
  defaultInit();
}

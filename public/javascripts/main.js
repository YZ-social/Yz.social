import { setupNetwork } from './pubSub.js';
import { map, showMessage, initMap, defaultInit } from './map.js';

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

setupNetwork();
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

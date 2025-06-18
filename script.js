// Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const video = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvas = canvasElement.getContext('2d');
const statusText = document.getElementById('status');
const qrResult = document.getElementById('qr-result');
const startBtn = document.getElementById('start-btn');
const scannerSection = document.getElementById('scanner-section');

const collegeLatitude = 23.1854;
const collegeLongitude = 77.3271;
const allowedDistanceKm = 0.5;

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

startBtn.addEventListener('click', () => {
  statusText.textContent = '📍 Checking your location...';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const dist = getDistanceKm(
        position.coords.latitude,
        position.coords.longitude,
        collegeLatitude,
        collegeLongitude
      );

      if (dist <= allowedDistanceKm) {
        statusText.textContent = '✅ On Campus. Starting Scanner...';
        scannerSection.style.display = 'block';
        startScanner();
      } else {
        statusText.textContent = '❌ You are not inside campus.';
        alert(`You are ${Math.round(dist * 1000)} meters away from campus. Attendance not allowed.`);
      }
    },
    (error) => {
      alert("Location permission is required.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

async function loadFaceModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
}

function startScanner() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      video.srcObject = stream;
      video.play();
      requestAnimationFrame(tick);
    })
    .catch((err) => {
      alert("Camera access failed.");
    });
}

function tick() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvasElement.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
    const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code) {
      qrResult.textContent = `✅ QR Code: ${code.data}`;
      const email = extractEmailFromQR(code.data);
      if (email) {
        verifyFace(email);
      } else {
        alert("Invalid QR code data.");
      }
    } else {
      requestAnimationFrame(tick);
    }
  } else {
    requestAnimationFrame(tick);
  }
}

function extractEmailFromQR(data) {
  try {
    const url = new URL(data);
    return url.searchParams.get("email");
  } catch {
    return null;
  }
}

async function verifyFace(email) {
  await loadFaceModels();
  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
  if (!detection) {
    alert("Face not detected. Try again.");
    return;
  }
  const liveDescriptor = detection.descriptor;

  const doc = await db.collection("users").doc(email).get();
  if (!doc.exists) {
    alert("No face data registered for this email.");
    return;
  }
  const savedDescriptor = new Float32Array(doc.data().descriptor);
  const distance = faceapi.euclideanDistance(liveDescriptor, savedDescriptor);

  if (distance < 0.45) {
    window.location.href = decodeURIComponent(`?redirect=${email}`);
  } else {
    alert("Face verification failed. Unauthorized user.");
  }
}

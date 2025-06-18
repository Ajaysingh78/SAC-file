// Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const video = document.getElementById("video");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const statusP = document.getElementById("register-status");
const captureBtn = document.getElementById("capture-btn");

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
}

async function startVideo() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
}

captureBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();

  if (!name || !email) {
    alert("Please enter both name and email.");
    return;
  }

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    alert("Face not detected. Please try again.");
    return;
  }

  const descriptor = Array.from(detection.descriptor);

  await db.collection("users").doc(email).set({
    name: name,
    email: email,
    descriptor: descriptor
  });

  statusP.textContent = "✅ Face registered successfully!";
});
 
window.onload = async () => {
  await loadModels();
  await startVideo();
};

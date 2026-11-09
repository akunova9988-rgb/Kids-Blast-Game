// Replace with your Firebase project config from https://console.firebase.google.com
// Go to Project Settings > General > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Detect if Firebase is configured (not placeholder values)
export const isFirebaseConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

export default firebaseConfig;

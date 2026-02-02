// firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Apnar Firebase Console theke paoa original config
const firebaseConfig = {
  apiKey: "AIzaSyD5ckyLWthIZXNh-xGrQM27Ey0_OjOcxGE",
  authDomain: "family-cost-39134.firebaseapp.com",
  projectId: "family-cost-39134",
  storageBucket: "family-cost-39134.firebasestorage.app",
  messagingSenderId: "604502166989",
  appId: "1:604502166989:web:1acf838dc6d6c58d028884",
  measurementId: "G-0DRKYECE9E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Database export kora hochhe jate App.tsx e use kora jay
export const db = getFirestore(app);
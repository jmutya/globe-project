import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
  apiKey: "AIzaSyBoW9fYNNX5eE46QftAK89gtk-uvVm2mgU",
  authDomain: "globe-project-cdd3f.firebaseapp.com",
  projectId: "globe-project-cdd3f",
  storageBucket: "globe-project-cdd3f.firebasestorage.app",
  messagingSenderId: "758541012292",
  appId: "1:758541012292:web:0133177f54c242e44ddb11",
  measurementId: "G-YN14Z9M4RE"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, provider, db,app,storage };

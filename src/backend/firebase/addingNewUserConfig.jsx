import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// ⚠️ Replace with your second Firebase project's config
const firebaseConfig2 = {
    apiKey: "AIzaSyBoW9fYNNX5eE46QftAK89gtk-uvVm2mgU",
    authDomain: "globe-project-cdd3f.firebaseapp.com",
    projectId: "globe-project-cdd3f",
    storageBucket: "globe-project-cdd3f.firebasestorage.app",
    messagingSenderId: "758541012292",
    appId: "1:758541012292:web:0133177f54c242e44ddb11",
    measurementId: "G-YN14Z9M4RE"
};

const app2 = initializeApp(firebaseConfig2, "app2");
const auth2 = getAuth(app2);
const db2 = getFirestore(app2);

export { auth2, db2 };

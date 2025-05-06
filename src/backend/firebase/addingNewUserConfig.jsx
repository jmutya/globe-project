import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig2 = {
    apiKey: import.meta.env.VITE_API_KEY_ADDING_USERS,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN_ADDING_USERS,
    projectId: import.meta.env.VITE_PROJECT_ID_ADDING_USERS,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET_ADDING_USERS,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID_ADDING_USERS,
    appId: import.meta.env.VITE_APP_ID_ADDING_USERS,
    measurementId: import.meta.env.VITE_MEASUREMENT_ID_ADDING_USERS,
  };

const app2 = initializeApp(firebaseConfig2, "app2");
const auth2 = getAuth(app2);
const db2 = getFirestore(app2);

export { auth2, db2 };

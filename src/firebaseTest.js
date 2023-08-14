import { getFirestore, doc, getDoc } from "firebase/firestore";
import firebaseConfig from './firebaseConfig';
import { initializeApp } from "firebase/app";

const app = initializeApp(firebaseConfig);
const db = getFirestore();


export const testFirebaseConnection = async () => {
  const testDocRef = doc(db, "test", "test"); // change "statusDocument" to your document's ID
  const docSnap = await getDoc(testDocRef);
  if (docSnap.exists()) {
    console.log("Document data:", docSnap.data());
  } else {
    console.log("No such document!");
  }
};

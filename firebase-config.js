import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBY1QylvGw47FcONfnCqDd9w6HmirttTbQ",
    authDomain: "e-commerce-b9211.firebaseapp.com",
    projectId: "e-commerce-b9211",
    storageBucket: "e-commerce-b9211.firebasestorage.app",
    messagingSenderId: "21458914077",
    appId: "1:21458914077:web:75a387fc3051bb5eaf6ff4"
  };
  
let db = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase operando em modo simulação:", e);
}

export async function saveOrderToFirebase(orderData) {
    if (!db) return null;
    try {
        const docRef = await addDoc(collection(db, "pedidos"), orderData);
        return docRef.id;
    } catch (e) {
        console.error("Erro ao gravar pedido no Firebase:", e);
        return null;
    }
}
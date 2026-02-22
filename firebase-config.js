// Firebase конфигурация - ТВОИ РЕАЛЬНЫЕ ДАННЫЕ
const firebaseConfig = {
    apiKey: "AIzaSyAKSN02OzCvjrqgcJ3ijYrTW3M3V6OvEJo",
    authDomain: "komnatnaya-igroteka.firebaseapp.com",
    databaseURL: "https://komnatnaya-igroteka-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "komnatnaya-igroteka",
    storageBucket: "komnatnaya-igroteka.firebasestorage.app",
    messagingSenderId: "326053063088",
    appId: "1:326053063088:web:40bf1f418d01063fcfce75"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Получаем ссылки на базу данных
const database = firebase.database();
const roomsRef = database.ref('rooms');

// Делаем глобальными
window.database = database;
window.roomsRef = roomsRef;

console.log('✅ Firebase подключен!');
console.log('📁 База данных:', firebaseConfig.databaseURL);

// Вспомогательные функции
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    let code = '#';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function getCurrentTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
}

// Делаем функции глобальными
window.generateRoomCode = generateRoomCode;
window.getCurrentTimestamp = getCurrentTimestamp;

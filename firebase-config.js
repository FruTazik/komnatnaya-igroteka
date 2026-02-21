// Firebase конфигурация
const firebaseConfig = {
    apiKey: "FrutazAIKey",
    authDomain: "komnatnaya-igroteka.firebaseapp.com",
    databaseURL: "https://komnatnaya-igroteka-default-rtdb.firebaseio.com",
    projectId: "komnatnaya-igroteka",
    storageBucket: "komnatnaya-igroteka.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Получаем ссылки на базу данных
const database = firebase.database();
const roomsRef = database.ref('rooms');

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

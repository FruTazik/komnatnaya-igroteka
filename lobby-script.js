// Функция для форматирования кода комнаты
function formatCode(input) {
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (value.length > 0 && !value.startsWith('#')) {
        value = '#' + value;
    }
    
    if (value.length > 7) {
        value = value.slice(0, 7);
    }
    
    input.value = value;
}

// Функция создания комнаты
async function createRoom() {
    const nickname = document.getElementById('nickname-create').value.trim();
    
    if (!nickname) {
        alert('Пожалуйста, введите никнейм!');
        return;
    }
    
    try {
        console.log('🚀 Создание комнаты для:', nickname);
        
        // Проверяем Firebase
        if (typeof roomsRef === 'undefined') {
            throw new Error('Firebase не подключен');
        }
        
        // Генерируем код
        const code = generateRoomCode();
        const roomId = code.replace('#', '');
        const playerId = `${nickname}-${Date.now()}`;
        
        console.log('Код комнаты:', code);
        console.log('ID игрока:', playerId);
        
        // Создаем комнату
        await roomsRef.child(roomId).set({
            code: code,
            created: getCurrentTimestamp(),
            players: {
                [nickname]: {
                    id: playerId,
                    nickname: nickname,
                    isAdmin: true,
                    connected: true,
                    lastSeen: getCurrentTimestamp(),
                    score: 0,
                    isSpectator: false,
                    opponent: null,
                    matchId: null
                }
            },
            admin: nickname,
            gameStarted: false,
            selectedGame: null,
            matches: {},
            chat: {}
        });
        
        console.log('✅ Комната создана');
        
        // Сохраняем в localStorage
        localStorage.setItem('playerNickname', nickname);
        localStorage.setItem('playerId', playerId);
        localStorage.setItem('roomCode', code);
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('isAdmin', 'true');
        
        console.log('💾 localStorage сохранен');
        
        // Переходим
        window.location.href = 'room.html';
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Функция подключения к комнате
async function joinRoom() {
    const nickname = document.getElementById('nickname-join').value.trim();
    const roomCode = document.getElementById('room-code').value.trim();
    
    if (!nickname) {
        alert('Пожалуйста, введите никнейм!');
        return;
    }
    
    if (!roomCode || roomCode.length < 7) {
        alert('Введите код комнаты (например #A7F3C1)');
        return;
    }
    
    try {
        console.log('🚀 Подключение к комнате:', roomCode);
        
        const roomId = roomCode.replace('#', '');
        
        // Проверяем существование комнаты
        const snapshot = await roomsRef.child(roomId).once('value');
        const room = snapshot.val();
        
        if (!room) {
            alert('❌ Комната не найдена!');
            return;
        }
        
        console.log('✅ Комната найдена');
        
        const playerId = `${nickname}-${Date.now()}`;
        
        // Добавляем игрока
        await roomsRef.child(roomId).child('players').child(nickname).set({
            id: playerId,
            nickname: nickname,
            isAdmin: false,
            connected: true,
            lastSeen: getCurrentTimestamp(),
            score: 0,
            isSpectator: false,
            opponent: null,
            matchId: null
        });
        
        console.log('✅ Игрок добавлен');
        
        // Сохраняем в localStorage
        localStorage.setItem('playerNickname', nickname);
        localStorage.setItem('playerId', playerId);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('isAdmin', 'false');
        
        console.log('💾 localStorage сохранен');
        
        window.location.href = 'room.html';
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Автоформатирование кода
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 lobby.js загружен');
    
    const codeInput = document.getElementById('room-code');
    if (codeInput) {
        codeInput.addEventListener('input', function() {
            formatCode(this);
        });
    }
});

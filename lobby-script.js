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
        // Проверяем подключение к Firebase
        if (typeof roomsRef === 'undefined') {
            console.error('Firebase не подключен');
            alert('Ошибка подключения к базе данных');
            return;
        }
        
        // Генерируем код комнаты
        const code = generateRoomCode();
        const roomId = code.replace('#', '');
        
        console.log('Создаю комнату:', roomId);
        console.log('Код комнаты:', code);
        
        // Создаем игрока
        const playerId = `${nickname}-${Date.now()}`;
        
        // Создаем комнату в Firebase
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
        
        console.log('✅ Комната создана успешно');
        
        // Сохраняем в localStorage
        localStorage.setItem('playerNickname', nickname);
        localStorage.setItem('playerId', playerId);
        localStorage.setItem('roomCode', code);
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('isAdmin', 'true');
        
        // Переходим в комнату
        window.location.href = 'room.html';
        
    } catch (error) {
        console.error('❌ Ошибка создания комнаты:', error);
        alert('Ошибка при создании комнаты: ' + error.message);
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
        alert('Пожалуйста, введите корректный код комнаты (например #A7F3C1)');
        return;
    }
    
    try {
        // Проверяем Firebase
        if (typeof roomsRef === 'undefined') {
            console.error('Firebase не подключен');
            alert('Ошибка подключения к базе данных');
            return;
        }
        
        const roomId = roomCode.replace('#', '');
        
        console.log('Подключаюсь к комнате:', roomId);
        
        // Проверяем, существует ли комната
        const snapshot = await roomsRef.child(roomId).once('value');
        const room = snapshot.val();
        
        if (!room) {
            alert('❌ Комната с таким кодом не найдена!');
            return;
        }
        
        console.log('✅ Комната найдена:', room);
        
        // Создаем игрока
        const playerId = `${nickname}-${Date.now()}`;
        
        // Добавляем игрока в комнату
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
        
        console.log('✅ Игрок добавлен в комнату');
        
        // Сохраняем данные
        localStorage.setItem('playerNickname', nickname);
        localStorage.setItem('playerId', playerId);
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('isAdmin', 'false');
        
        // Переходим в комнату
        window.location.href = 'room.html';
        
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        alert('Ошибка при подключении: ' + error.message);
    }
}

// Автоматически форматируем код при вводе
document.addEventListener('DOMContentLoaded', function() {
    console.log('lobby.html загружен');
    
    const codeInput = document.getElementById('room-code');
    if (codeInput) {
        codeInput.addEventListener('input', function() {
            formatCode(this);
        });
    }
    
    // Проверяем Firebase
    if (typeof firebase !== 'undefined') {
        console.log('✅ Firebase доступен');
    } else {
        console.error('❌ Firebase не загружен');
    }
});

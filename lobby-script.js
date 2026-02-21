// Хранилище активных комнат (в реальном проекте это будет Firebase)
const activeRooms = JSON.parse(localStorage.getItem('activeRooms')) || {};

// Функция для форматирования кода комнаты
function formatCode(input) {
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Если первый символ не #, добавляем его
    if (value.length > 0 && !value.startsWith('#')) {
        value = '#' + value;
    }
    
    // Ограничиваем длину (1 символ # + 6 символов кода)
    if (value.length > 7) {
        value = value.slice(0, 7);
    }
    
    input.value = value;
}

// Функция создания комнаты
function createRoom() {
    const nickname = document.getElementById('nickname-create').value.trim();
    
    if (!nickname) {
        alert('Пожалуйста, введите никнейм!');
        return;
    }
    
    // Генерируем случайный код комнаты
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    let code = '#';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Сохраняем комнату в активные
    activeRooms[code] = {
        created: Date.now(),
        players: [nickname],
        admin: nickname
    };
    localStorage.setItem('activeRooms', JSON.stringify(activeRooms));
    
    // Сохраняем ник и код
    localStorage.setItem('playerNickname', nickname);
    localStorage.setItem('isHost', 'true');
    localStorage.setItem('roomCode', code);
    
    // Переходим в комнату
    window.location.href = 'room.html';
}

// Функция подключения к комнате
function joinRoom() {
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
    
    // Проверяем, существует ли комната
    if (!activeRooms[roomCode]) {
        alert('❌ Комната с таким кодом не найдена!\n\nПроверьте код или создайте новую комнату.');
        return;
    }
    
    // Сохраняем данные
    localStorage.setItem('playerNickname', nickname);
    localStorage.setItem('isHost', 'false');
    localStorage.setItem('roomCode', roomCode);
    
    // Добавляем игрока в список комнаты
    activeRooms[roomCode].players.push(nickname);
    localStorage.setItem('activeRooms', JSON.stringify(activeRooms));
    
    // Переходим в комнату
    window.location.href = 'room.html';
}

// Автоматически фокусируемся на поле ввода кода и форматируем
document.addEventListener('DOMContentLoaded', function() {
    const codeInput = document.getElementById('room-code');
    if (codeInput) {
        codeInput.addEventListener('input', function() {
            formatCode(this);
        });
    }
});

// Функция для очистки старых комнат (комнаты старше 1 часа)
function cleanOldRooms() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    Object.keys(activeRooms).forEach(code => {
        if (now - activeRooms[code].created > oneHour) {
            delete activeRooms[code];
        }
    });
    
    localStorage.setItem('activeRooms', JSON.stringify(activeRooms));
}

// Запускаем очистку при загрузке
cleanOldRooms();
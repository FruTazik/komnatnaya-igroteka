// Глобальные переменные
let currentPlayer = null;
let roomId = null;
let roomRef = null;
let playersRef = null;
let matchesRef = null;
let chatRef = null;
let currentPlayers = [];
let currentAdmin = null;
let selectedGame = null;
let gameStarted = false;
let spectatorHintTimeout = null;

// Загрузка комнаты
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 room.js загружен');
    
    // Получаем данные из localStorage
    const nickname = localStorage.getItem('playerNickname');
    const playerId = localStorage.getItem('playerId');
    const roomCode = localStorage.getItem('roomCode');
    roomId = localStorage.getItem('roomId');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    console.log('📦 Данные:', { nickname, playerId, roomCode, roomId, isAdmin });
    
    // Проверка данных
    if (!nickname || !roomCode || !roomId) {
        console.error('❌ Нет данных в localStorage');
        alert('Ошибка: данные не найдены. Вернитесь в лобби.');
        window.location.href = 'lobby.html';
        return;
    }
    
    // Проверка Firebase
    if (typeof roomsRef === 'undefined') {
        console.error('❌ Firebase не подключен');
        alert('Ошибка подключения к базе данных');
        return;
    }
    
    try {
        // Получаем ссылки
        roomRef = roomsRef.child(roomId);
        playersRef = roomRef.child('players');
        matchesRef = roomRef.child('matches');
        chatRef = roomRef.child('chat');
        
        console.log('🔗 Ссылки получены');
        
        // Проверяем комнату
        const snapshot = await roomRef.once('value');
        
        if (!snapshot.exists()) {
            alert('❌ Комната не существует!');
            window.location.href = 'lobby.html';
            return;
        }
        
        const roomData = snapshot.val();
        console.log('🏠 Данные комнаты:', roomData);
        
        // Создаем игрока
        currentPlayer = {
            id: playerId || `${nickname}-${Date.now()}`,
            nickname: nickname,
            isAdmin: isAdmin,
            score: 0,
            isSpectator: false,
            opponent: null,
            matchId: null,
            viewingPlayer: null
        };
        
        // Добавляем в Firebase
        await playersRef.child(nickname).set({
            id: currentPlayer.id,
            nickname: nickname,
            isAdmin: isAdmin,
            connected: true,
            lastSeen: getCurrentTimestamp(),
            score: 0,
            isSpectator: false,
            opponent: null,
            matchId: null,
            viewingPlayer: null
        });
        
        console.log('✅ Игрок добавлен в Firebase');
        
        // Отображаем код
        document.querySelectorAll('#room-code-display, #floating-code').forEach(el => {
            if (el) el.textContent = roomCode;
        });
        
        document.getElementById('player-name').textContent = nickname;
        
        // Скрываем элементы наблюдателя
        document.getElementById('spectator-controls').style.display = 'none';
        document.getElementById('spectator-hint').style.display = 'none';
        
        // Настраиваем слушатели
        setupFirebaseListeners();
        setupExitHandlers();
        
        // Обновляем интерфейс
        updateStartButton();
        updateWaitingMessage();
        
        console.log('✅ Комната готова');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
});

// Слушатели Firebase
function setupFirebaseListeners() {
    playersRef.on('value', (snapshot) => {
        const playersData = snapshot.val();
        if (!playersData) return;
        
        currentPlayers = Object.values(playersData);
        
        const admin = currentPlayers.find(p => p.isAdmin);
        if (admin) currentAdmin = admin.nickname;
        
        const myself = currentPlayers.find(p => p.nickname === currentPlayer.nickname);
        if (myself) currentPlayer = myself;
        
        updatePlayersList();
        updateStartButton();
        updateWaitingMessage();
        updateGameInfo();
    });
    
    roomRef.child('gameStarted').on('value', (snapshot) => {
        gameStarted = snapshot.val() || false;
        
        if (gameStarted) {
            document.getElementById('games-selection').style.display = 'none';
            document.getElementById('game-canvas').style.display = 'block';
            document.getElementById('game-title').textContent = `🎮 ${getGameName(selectedGame)}`;
            
            if (currentPlayer.isSpectator) {
                document.getElementById('spectator-controls').style.display = 'flex';
                setTimeout(showSpectatorHint, 2000);
            }
        } else {
            document.getElementById('games-selection').style.display = 'block';
            document.getElementById('game-canvas').style.display = 'none';
        }
    });
    
    roomRef.child('selectedGame').on('value', (snapshot) => {
        selectedGame = snapshot.val();
        
        if (selectedGame) {
            document.querySelectorAll('.game-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            const el = document.querySelector(`[data-game="${selectedGame}"]`);
            if (el) el.classList.add('selected');
        }
    });
    
    chatRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (data.sender !== currentPlayer.nickname) {
            addGlobalMessage(data.sender, data.message);
        }
    });
}

// Обновление списка игроков
function updatePlayersList() {
    const list = document.getElementById('players-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    currentPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card ${player.isAdmin ? 'admin' : ''}`;
        
        let icon = '✅';
        if (player.isAdmin) icon = '👑';
        if (player.isSpectator) icon = '👁️';
        
        card.innerHTML = `
            <span class="player-name">${player.nickname}</span>
            <span class="player-status">${icon}</span>
        `;
        list.appendChild(card);
    });
    
    for (let i = currentPlayers.length; i < 8; i++) {
        const empty = document.createElement('div');
        empty.className = 'player-card empty';
        empty.innerHTML = '<span class="player-name">Свободно</span><span class="player-status">⬜</span>';
        list.appendChild(empty);
    }
    
    updateScoresList();
}

// Обновление счета
function updateScoresList() {
    const scores = document.getElementById('scores-list');
    if (!scores) return;
    
    scores.innerHTML = '';
    
    const sorted = [...currentPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    sorted.forEach(player => {
        const item = document.createElement('div');
        item.className = 'score-item';
        item.innerHTML = `
            <span class="player-name">${player.nickname}${player.isSpectator ? ' 👁️' : ''}</span>
            <span class="player-score">${player.score || 0}</span>
        `;
        scores.appendChild(item);
    });
}

// Обновление кнопки старта
function updateStartButton() {
    const btn = document.getElementById('start-game-btn');
    if (!btn) return;
    
    if (currentPlayer.isAdmin) {
        btn.style.display = 'block';
        btn.disabled = currentPlayers.length < 2;
        btn.style.opacity = currentPlayers.length < 2 ? '0.5' : '1';
        btn.title = currentPlayers.length < 2 ? 'Нужно минимум 2 игрока' : '';
    } else {
        btn.style.display = 'none';
    }
}

// Обновление статуса
function updateWaitingMessage() {
    const status = document.getElementById('game-status');
    if (!status) return;
    
    if (currentPlayers.length < 2) {
        status.textContent = '⏳ Ожидание игроков...';
    } else if (!gameStarted) {
        status.textContent = currentPlayer.isAdmin ? 'Выберите игру' : '⏳ Ожидание администратора...';
    }
}

// Выбор игры
async function selectGame(gameName) {
    if (!currentPlayer.isAdmin) {
        alert('Только администратор может выбирать игру!');
        return;
    }
    
    try {
        await roomRef.update({ selectedGame: gameName });
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Начало игры
async function startSelectedGame() {
    if (!currentPlayer.isAdmin) {
        alert('Только администратор!');
        return;
    }
    
    if (currentPlayers.length < 2) {
        alert('Нужно минимум 2 игрока!');
        return;
    }
    
    if (!selectedGame) {
        alert('Выберите игру!');
        return;
    }
    
    try {
        const matches = createMatches(currentPlayers);
        
        await roomRef.update({
            gameStarted: true,
            selectedGame: selectedGame,
            matches: matches,
            startTime: getCurrentTimestamp()
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Создание пар
function createMatches(players) {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matches = {};
    
    for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
            const matchId = `match_${Date.now()}_${i}`;
            
            matches[matchId] = {
                id: matchId,
                player1: { id: shuffled[i].id, nickname: shuffled[i].nickname },
                player2: { id: shuffled[i + 1].id, nickname: shuffled[i + 1].nickname },
                currentTurn: Math.random() < 0.5 ? shuffled[i].id : shuffled[i + 1].id,
                moves: [],
                startTime: Date.now(),
                gameState: {}
            };
            
            playersRef.child(shuffled[i].nickname).update({
                isSpectator: false,
                opponent: shuffled[i + 1].nickname,
                matchId: matchId
            });
            
            playersRef.child(shuffled[i + 1].nickname).update({
                isSpectator: false,
                opponent: shuffled[i].nickname,
                matchId: matchId
            });
            
        } else {
            playersRef.child(shuffled[i].nickname).update({
                isSpectator: true,
                opponent: null,
                matchId: null,
                viewingPlayer: shuffled[0]?.id
            });
        }
    }
    
    return matches;
}

// Копирование кода
function copyRoomCode() {
    const code = document.getElementById('room-code-display').textContent;
    
    const textarea = document.createElement('textarea');
    textarea.value = code;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showNotification('Код скопирован!', 1500);
    } catch (err) {
        alert('Не удалось скопировать код');
    }
    
    document.body.removeChild(textarea);
}

// Чат
function sendGlobalMessage() {
    const input = document.getElementById('global-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addGlobalMessage(currentPlayer.nickname, message);
    chatRef.push({
        sender: currentPlayer.nickname,
        message: message,
        timestamp: getCurrentTimestamp()
    });
    
    input.value = '';
}

function addGlobalMessage(sender, message) {
    const div = document.getElementById('global-chat-messages');
    if (!div) return;
    
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.innerHTML = `
        <span class="sender">${sender}</span>
        <span class="time">${new Date().toLocaleTimeString().slice(0,5)}</span>
        <div>${message}</div>
    `;
    
    div.appendChild(msg);
    div.scrollTop = div.scrollHeight;
}

// Наблюдатели
function spectatorNext() {
    if (!currentPlayer.isSpectator) return;
    
    const players = currentPlayers.filter(p => !p.isSpectator);
    if (!players.length) return;
    
    let idx = players.findIndex(p => p.id === currentPlayer.viewingPlayer);
    if (idx === -1) idx = 0;
    
    idx = (idx + 1) % players.length;
    currentPlayer.viewingPlayer = players[idx].id;
    
    document.getElementById('spectator-viewing').textContent = `Наблюдение: ${players[idx].nickname}`;
    showSpectatorHint();
    
    playersRef.child(currentPlayer.nickname).update({
        viewingPlayer: currentPlayer.viewingPlayer
    });
}

function spectatorPrev() {
    if (!currentPlayer.isSpectator) return;
    
    const players = currentPlayers.filter(p => !p.isSpectator);
    if (!players.length) return;
    
    let idx = players.findIndex(p => p.id === currentPlayer.viewingPlayer);
    if (idx === -1) idx = 0;
    
    idx = (idx - 1 + players.length) % players.length;
    currentPlayer.viewingPlayer = players[idx].id;
    
    document.getElementById('spectator-viewing').textContent = `Наблюдение: ${players[idx].nickname}`;
    showSpectatorHint();
    
    playersRef.child(currentPlayer.nickname).update({
        viewingPlayer: currentPlayer.viewingPlayer
    });
}

function showSpectatorHint() {
    const hint = document.getElementById('spectator-hint');
    if (!hint) return;
    
    hint.style.display = 'block';
    
    if (spectatorHintTimeout) clearTimeout(spectatorHintTimeout);
    spectatorHintTimeout = setTimeout(() => {
        hint.style.display = 'none';
    }, 3000);
}

// Обновление информации
function updateGameInfo() {
    if (!gameStarted || !currentPlayer) return;
    
    if (currentPlayer.isSpectator) {
        document.getElementById('spectator-controls').style.display = 'flex';
        document.getElementById('game-opponent').style.display = 'none';
        document.getElementById('game-turn').style.display = 'none';
        
        const viewing = currentPlayers.find(p => p.id === currentPlayer.viewingPlayer);
        if (viewing) {
            document.getElementById('spectator-viewing').textContent = `Наблюдение: ${viewing.nickname}`;
        }
    } else {
        document.getElementById('spectator-controls').style.display = 'none';
        document.getElementById('game-opponent').style.display = 'flex';
        document.getElementById('game-turn').style.display = 'flex';
        document.getElementById('opponent-name').textContent = currentPlayer.opponent || '—';
    }
}

// Обработка клика для наблюдателя
document.addEventListener('click', function(e) {
    if (currentPlayer?.isSpectator && gameStarted) {
        if (e.target.closest('#game-canvas') || e.target.closest('.game-canvas')) {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) spectatorPrev();
            else spectatorNext();
        }
    }
});

// Enter в чате
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.id === 'global-chat-input') {
        sendGlobalMessage();
    }
});

// Уведомления
function showNotification(msg, duration) {
    const notif = document.createElement('div');
    notif.className = 'game-notification';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
}

// Выход из комнаты
function setupExitHandlers() {
    window.addEventListener('beforeunload', function() {
        if (roomRef && currentPlayer) {
            playersRef.child(currentPlayer.nickname).update({
                connected: false,
                lastSeen: getCurrentTimestamp()
            });
        }
    });
    
    setInterval(() => {
        if (roomRef && currentPlayer) {
            playersRef.child(currentPlayer.nickname).update({
                lastSeen: getCurrentTimestamp()
            });
        }
    }, 30000);
}

// Вспомогательные функции
function getGameName(gameName) {
    const names = {
        'sea-battle': 'Морской бой',
        'tic-tac-toe': 'Крестики-нолики',
        'gallows': 'Виселица',
        'crocodile': 'Крокодил',
        'danetki': 'Данетки',
        'hat': 'Шляпа',
        'who-am-i': 'Кто я?',
        'balda': 'Балда'
    };
    return names[gameName] || gameName;
}

function getCurrentTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
}

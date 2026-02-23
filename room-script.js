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
let countdownInterval = null;

// Эмодзи для аватаров
const avatars = ['😊', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐧', '🐸', '🐙', '🦄', '🐬', '🦋', '🌟', '⭐'];

// Загрузка комнаты
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 room.js загружен');
    
    const nickname = localStorage.getItem('playerNickname');
    const playerId = localStorage.getItem('playerId');
    const roomCode = localStorage.getItem('roomCode');
    roomId = localStorage.getItem('roomId');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    console.log('📦 Данные:', { nickname, playerId, roomCode, roomId, isAdmin });
    
    if (!nickname || !roomCode || !roomId) {
        alert('Ошибка: данные не найдены. Вернитесь в лобби.');
        window.location.href = 'lobby.html';
        return;
    }
    
    if (typeof roomsRef === 'undefined') {
        alert('Ошибка подключения к базе данных');
        return;
    }
    
    try {
        roomRef = roomsRef.child(roomId);
        playersRef = roomRef.child('players');
        matchesRef = roomRef.child('matches');
        chatRef = roomRef.child('chat');
        
        const snapshot = await roomRef.once('value');
        if (!snapshot.exists()) {
            alert('❌ Комната не существует!');
            window.location.href = 'lobby.html';
            return;
        }
        
        const roomData = snapshot.val();
        currentAdmin = roomData.admin;
        
        // Выбираем случайный аватар
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        
        currentPlayer = {
            id: playerId || `${nickname}-${Date.now()}`,
            nickname: nickname,
            isAdmin: isAdmin,
            score: 0,
            isSpectator: false,
            opponent: null,
            matchId: null,
            viewingPlayer: null,
            avatar: randomAvatar
        };
        
        await playersRef.child(nickname).set({
            id: currentPlayer.id,
            nickname: nickname,
            isAdmin: isAdmin,
            connected: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            score: 0,
            isSpectator: false,
            opponent: null,
            matchId: null,
            viewingPlayer: null,
            avatar: randomAvatar
        });
        
        // Отображаем код комнаты
        document.querySelectorAll('#room-code-display, #floating-code').forEach(el => {
            if (el) el.textContent = roomCode;
        });
        
        const playerNameSpan = document.getElementById('player-name');
        if (playerNameSpan) playerNameSpan.textContent = nickname;
        
        document.getElementById('spectator-controls').style.display = 'none';
        document.getElementById('spectator-hint').style.display = 'none';
        
        // Настраиваем слушатели
        setupFirebaseListeners();
        
        // Обновляем интерфейс
        updateStartButton();
        updateWaitingMessage();
        
        // Настраиваем обработчики выхода
        setupExitHandlers();
        
        // Настраиваем кнопки игр
        setupGameButtons();
        
        console.log('✅ Комната готова');
        
        // Обновляем отладку
        document.getElementById('debug-info').textContent = '✅ Комната готова';
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка: ' + error.message);
    }
});

// Настройка кнопок игр
function setupGameButtons() {
    console.log('🔧 Настройка кнопок игр');
    
    const gameOptions = document.querySelectorAll('.game-option:not(.coming-soon)');
    console.log('Найдено активных кнопок:', gameOptions.length);
    
    gameOptions.forEach(option => {
        // Убеждаемся, что кнопка кликабельна
        option.style.cursor = 'pointer';
        option.style.pointerEvents = 'auto';
        
        // Удаляем старые обработчики
        option.removeEventListener('click', handleGameClick);
        
        // Добавляем новый обработчик
        option.addEventListener('click', handleGameClick);
    });
}

// Обработчик клика по игре
function handleGameClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const gameName = this.dataset.game;
    console.log('👆 Клик по игре:', gameName);
    
    if (!gameName) {
        console.error('❌ Нет data-game атрибута');
        return;
    }
    
    selectGame(gameName);
}

// Функция выбора игры
async function selectGame(gameName) {
    console.log('🎯 selectGame вызвана с параметром:', gameName);
    
    if (!currentPlayer) {
        console.error('❌ currentPlayer не определен');
        alert('Ошибка: игрок не найден');
        return;
    }
    
    if (!currentPlayer.isAdmin) {
        console.log('🚫 Не админ, нельзя выбирать игру');
        alert('Только администратор может выбирать игру!');
        return;
    }
    
    try {
        console.log('✅ Сохраняем игру в Firebase:', gameName);
        await roomRef.update({ selectedGame: gameName });
        console.log('✅ Игра сохранена');
    } catch (error) {
        console.error('❌ Ошибка сохранения игры:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Функция для обработки выхода
function setupExitHandlers() {
    console.log('👋 Настройка обработчиков выхода');
    
    window.addEventListener('beforeunload', function() {
        if (roomRef && currentPlayer) {
            console.log('👋 Игрок выходит:', currentPlayer?.nickname);
            playersRef.child(currentPlayer.nickname).update({
                connected: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
    });
    
    setInterval(() => {
        if (roomRef && currentPlayer) {
            playersRef.child(currentPlayer.nickname).update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }, 30000);
}

// Слушатели Firebase
function setupFirebaseListeners() {
    playersRef.on('value', (snapshot) => {
        const playersData = snapshot.val();
        if (!playersData) return;
        
        currentPlayers = Object.values(playersData).map(p => ({
            ...p,
            id: p.id || p.nickname
        }));
        
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
            document.getElementById('start-game-btn').classList.add('hidden');
            
            if (currentPlayer.isSpectator) {
                document.getElementById('spectator-controls').style.display = 'flex';
                setTimeout(showSpectatorHint, 2000);
            }
            
            startCountdown();
        } else {
            document.getElementById('games-selection').style.display = 'block';
            document.getElementById('game-canvas').style.display = 'none';
            document.getElementById('start-game-btn').classList.remove('hidden');
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
            document.getElementById('game-title').textContent = `🎮 ${getGameName(selectedGame)}`;
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
    
    const sorted = [...currentPlayers].sort((a, b) => {
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return (b.score || 0) - (a.score || 0);
    });
    
    sorted.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card ${player.nickname === currentPlayer.nickname ? 'self' : ''}`;
        
        let statusIcon = player.avatar || '👤';
        if (player.isAdmin) statusIcon = '👑';
        
        card.innerHTML = `
            <div class="player-info">
                <span class="player-status">${statusIcon}</span>
                <span class="player-name">${player.nickname}</span>
            </div>
            <span class="player-score">${player.score || 0}</span>
        `;
        
        list.appendChild(card);
    });
    
    for (let i = currentPlayers.length; i < 8; i++) {
        const empty = document.createElement('div');
        empty.className = 'player-card empty';
        empty.innerHTML = `
            <div class="player-info">
                <span class="player-status">⬜</span>
                <span class="player-name">Свободно</span>
            </div>
            <span class="player-score">0</span>
        `;
        list.appendChild(empty);
    }
}

// Обновление кнопки старта
function updateStartButton() {
    const btn = document.getElementById('start-game-btn');
    if (!btn) return;
    
    if (currentPlayer.isAdmin && !gameStarted) {
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

// Начало игры
async function startSelectedGame() {
    if (!currentPlayer.isAdmin) {
        alert('Только администратор может начинать игру!');
        return;
    }
    
    if (currentPlayers.length < 2) {
        alert('Нужно минимум 2 игрока!');
        return;
    }
    
    if (!selectedGame) {
        alert('Сначала выберите игру!');
        return;
    }
    
    try {
        const matches = createMatches(currentPlayers);
        
        await roomRef.update({
            gameStarted: true,
            selectedGame: selectedGame,
            matches: matches,
            startTime: firebase.database.ServerValue.TIMESTAMP
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
        
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
        
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
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    input.value = '';
}

function addGlobalMessage(sender, message) {
    const div = document.getElementById('global-chat-messages');
    if (!div) return;
    
    const msg = document.createElement('div');
    msg.className = 'message';
    
    const time = new Date().toLocaleTimeString().slice(0,5);
    
    msg.innerHTML = `
        <span class="sender">${sender}</span>
        <span class="time">${time}</span>
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
        
        if (window.gameEngine && window.gameEngine.matches) {
            const match = Object.values(window.gameEngine.matches || {}).find(m => 
                m.player1?.id === currentPlayer.id || m.player2?.id === currentPlayer.id
            );
            
            if (match) {
                const isMyTurn = match.currentTurn === currentPlayer.id;
                const turnIndicator = document.getElementById('turn-indicator');
                turnIndicator.textContent = isMyTurn ? 'Ваш ход' : 'Ход соперника';
                turnIndicator.style.color = isMyTurn ? '#27ae60' : '#e74c3c';
            }
        }
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

// Отправка сообщения по Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.target.id === 'global-chat-input') {
        sendGlobalMessage();
    }
});

// Обратный отсчет
function startCountdown() {
    playSound('start_game_sound');
    
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'countdown-overlay';
    
    const countdownDiv = document.createElement('div');
    countdownDiv.className = 'countdown';
    countdownDiv.id = 'countdown-number';
    countdownDiv.textContent = '3';
    
    overlay.appendChild(countdownDiv);
    document.body.appendChild(overlay);
    
    let count = 3;
    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownDiv.textContent = count;
            playSound('start_game_sound');
        } else if (count === 0) {
            countdownDiv.textContent = 'GO!';
            playSound('start_game_sound');
        } else {
            clearInterval(countdownInterval);
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
            }, 500);
        }
    }, 1000);
}

// Показать уведомление
function showNotification(msg, duration) {
    const notif = document.createElement('div');
    notif.className = 'game-notification';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
}

// Звук (заглушка)
function playSound(soundName) {
    console.log(`🔊 Звук: ${soundName}`);
    // Здесь будет реальное воспроизведение звука
    // const audio = new Audio(`sounds/${soundName}.mp3`);
    // audio.play().catch(e => console.log('Ошибка воспроизведения звука'));
}

// Получение имени игры
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

// Делаем функции глобальными
window.selectGame = selectGame;
window.startSelectedGame = startSelectedGame;
window.copyRoomCode = copyRoomCode;
window.sendGlobalMessage = sendGlobalMessage;
window.spectatorNext = spectatorNext;
window.spectatorPrev = spectatorPrev;
window.showNotification = showNotification;
window.playSound = playSound;

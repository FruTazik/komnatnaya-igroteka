// Глобальные переменные
let currentPlayer = null;
let roomId = null;
let roomRef = null;
let playersRef = null;
let currentPlayers = [];
let currentAdmin = null;
let selectedGame = null;
let gameStarted = false;
let gameEngine = null;
let spectatorHintTimeout = null;

// Загружаем данные при открытии комнаты
document.addEventListener('DOMContentLoaded', async function() {
    const nickname = localStorage.getItem('playerNickname');
    const roomCode = localStorage.getItem('roomCode');
    roomId = localStorage.getItem('roomId');
    
    if (!nickname || !roomCode || !roomId) {
        alert('Ошибка: данные не найдены');
        window.location.href = 'lobby.html';
        return;
    }
    
    // Создаем текущего игрока
    currentPlayer = {
        id: `${nickname}-${Date.now()}`,
        nickname: nickname,
        isAdmin: false,
        score: 0,
        isSpectator: false
    };
    
    // Получаем ссылки на Firebase
    if (typeof roomsRef !== 'undefined') {
        roomRef = roomsRef.child(roomId);
        playersRef = roomRef.child('players');
    } else {
        console.error('Firebase не подключен');
        alert('Ошибка подключения к базе данных');
        return;
    }
    
    // Проверяем, существует ли комната
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) {
        alert('❌ Комната больше не существует!');
        window.location.href = 'lobby.html';
        return;
    }
    
    const roomData = snapshot.val();
    currentAdmin = roomData.admin;
    currentPlayer.isAdmin = (roomData.admin === nickname);
    
    // Добавляем игрока в комнату
    await playersRef.child(nickname).set({
        id: currentPlayer.id,
        nickname: nickname,
        isAdmin: currentPlayer.isAdmin,
        connected: true,
        lastSeen: getCurrentTimestamp(),
        score: 0
    });
    
    // Отображаем код комнаты
    const codeElements = document.querySelectorAll('#room-code-display, #floating-code');
    codeElements.forEach(el => {
        if (el) el.textContent = roomCode;
    });
    
    // Слушаем изменения в комнате
    setupFirebaseListeners();
    
    // Настраиваем обработчики выхода
    setupExitHandlers();
    
    // Обновляем информацию на панели
    document.getElementById('player-name').textContent = nickname;
});

// Настройка слушателей Firebase
function setupFirebaseListeners() {
    // Слушаем изменения игроков
    playersRef.on('value', (snapshot) => {
        const playersData = snapshot.val();
        if (!playersData) return;
        
        // Преобразуем в массив
        currentPlayers = Object.values(playersData).map(p => ({
            ...p,
            id: p.id || p.nickname
        }));
        
        // Находим админа
        const admin = currentPlayers.find(p => p.isAdmin);
        if (admin) {
            currentAdmin = admin.nickname;
        }
        
        // Обновляем себя
        const myself = currentPlayers.find(p => p.nickname === currentPlayer.nickname);
        if (myself) {
            currentPlayer = myself;
        }
        
        updatePlayersList();
        updateStartButton();
        updateWaitingMessage();
    });
    
    // Слушаем начало игры
    roomRef.child('gameStarted').on('value', (snapshot) => {
        gameStarted = snapshot.val() || false;
        
        if (gameStarted) {
            // Скрываем список игр, показываем игровое поле
            document.getElementById('games-selection').style.display = 'none';
            document.getElementById('game-canvas').style.display = 'block';
            document.getElementById('game-title').textContent = `🎮 ${getGameName(selectedGame)}`;
            
            // Если игрок наблюдатель, показываем подсказку
            if (currentPlayer.isSpectator) {
                document.getElementById('spectator-controls').style.display = 'flex';
                setTimeout(() => {
                    showSpectatorHint();
                }, 2000);
            }
        }
    });
    
    // Слушаем выбранную игру
    roomRef.child('selectedGame').on('value', (snapshot) => {
        selectedGame = snapshot.val();
    });
    
    // Слушаем матчи
    roomRef.child('matches').on('value', (snapshot) => {
        const matches = snapshot.val();
        if (matches && gameEngine) {
            gameEngine.matches = Object.values(matches);
            updateGameInfo();
        }
    });
}

// Обновление списка игроков
function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    if (!playersList) return;
    
    playersList.innerHTML = '';
    
    currentPlayers.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = `player-card ${player.isAdmin ? 'admin' : ''}`;
        
        let statusIcon = '✅';
        if (player.isAdmin) statusIcon = '👑';
        if (player.isSpectator) statusIcon = '👁️';
        
        playerCard.innerHTML = `
            <span class="player-name">${player.nickname}</span>
            <span class="player-status">${statusIcon}</span>
        `;
        
        playersList.appendChild(playerCard);
    });
    
    // Добавляем пустые места до 8 игроков
    for (let i = currentPlayers.length; i < 8; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'player-card empty';
        emptyCard.innerHTML = `
            <span class="player-name">Свободно</span>
            <span class="player-status">⬜</span>
        `;
        playersList.appendChild(emptyCard);
    }
    
    // Обновляем счет
    updateScoresList();
}

// Обновление списка счета
function updateScoresList() {
    const scoresList = document.getElementById('scores-list');
    if (!scoresList) return;
    
    scoresList.innerHTML = '';
    
    // Сортируем по убыванию очков
    const sorted = [...currentPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    sorted.forEach(player => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        
        let nameDisplay = player.nickname;
        if (player.isSpectator) nameDisplay += ' 👁️';
        
        scoreItem.innerHTML = `
            <span class="player-name">${nameDisplay}</span>
            <span class="player-score">${player.score || 0}</span>
        `;
        scoresList.appendChild(scoreItem);
    });
}

// Обновление кнопки начала игры
function updateStartButton() {
    const startBtn = document.getElementById('start-game-btn');
    if (!startBtn) return;
    
    if (currentPlayer.isAdmin) {
        if (currentPlayers.length >= 2) {
            startBtn.style.display = 'block';
            startBtn.disabled = false;
            startBtn.title = '';
            startBtn.style.opacity = '1';
        } else {
            startBtn.style.display = 'block';
            startBtn.disabled = true;
            startBtn.title = 'Нужно минимум 2 игрока';
            startBtn.style.opacity = '0.5';
        }
    } else {
        startBtn.style.display = 'none';
    }
}

// Обновление сообщения "Подождите"
function updateWaitingMessage() {
    const gameStatus = document.getElementById('game-status');
    if (!gameStatus) return;
    
    if (currentPlayers.length < 2) {
        gameStatus.textContent = '⏳ Ожидание игроков...';
    } else if (!gameStarted) {
        if (!currentPlayer.isAdmin) {
            gameStatus.textContent = '⏳ Ожидание администратора...';
        } else {
            gameStatus.textContent = 'Выберите игру';
        }
    }
}

// Копирование кода комнаты
function copyRoomCode() {
    const roomCode = document.getElementById('room-code-display').textContent;
    
    const textarea = document.createElement('textarea');
    textarea.value = roomCode;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
        
        showNotification('Код скопирован!', 1500);
    } catch (err) {
        alert('Не удалось скопировать код');
    }
    
    document.body.removeChild(textarea);
}

// Выбор игры (только для админа)
function selectGame(gameName) {
    if (!currentPlayer.isAdmin) {
        alert('Только администратор может выбирать игру!');
        return;
    }
    
    selectedGame = gameName;
    
    // Подсвечиваем выбранную игру
    document.querySelectorAll('.game-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-game="${gameName}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
    
    // Сохраняем в Firebase
    roomRef.update({ selectedGame: gameName });
}

// Начало выбранной игры
async function startSelectedGame() {
    if (!currentPlayer.isAdmin) {
        alert('Только администратор может начать игру!');
        return;
    }
    
    if (currentPlayers.length < 2) {
        alert('Нужно минимум 2 игрока для начала игры!');
        return;
    }
    
    if (!selectedGame) {
        alert('Сначала выберите игру!');
        return;
    }
    
    // Создаем пары игроков
    const matches = createMatches(currentPlayers);
    
    // Сохраняем в Firebase
    await roomRef.update({
        gameStarted: true,
        selectedGame: selectedGame,
        matches: matches,
        startTime: getCurrentTimestamp()
    });
    
    // Инициализируем игровой движок
    if (!gameEngine) {
        gameEngine = new GameEngine();
    }
    
    gameEngine.initGame(selectedGame, currentPlayers);
}

// Создание пар для игры
function createMatches(players) {
    // Перемешиваем игроков
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const matches = [];
    const spectators = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
            const match = {
                id: matches.length + 1,
                player1: {
                    id: shuffled[i].id,
                    nickname: shuffled[i].nickname
                },
                player2: {
                    id: shuffled[i + 1].id,
                    nickname: shuffled[i + 1].nickname
                },
                currentTurn: Math.random() < 0.5 ? shuffled[i].id : shuffled[i + 1].id,
                moves: [],
                startTime: Date.now()
            };
            
            matches.push(match);
            
            // Обновляем статус игроков
            playersRef.child(shuffled[i].nickname).update({
                isSpectator: false,
                opponent: shuffled[i + 1].nickname,
                matchId: match.id
            });
            
            playersRef.child(shuffled[i + 1].nickname).update({
                isSpectator: false,
                opponent: shuffled[i].nickname,
                matchId: match.id
            });
        } else {
            // Оставшийся игрок - наблюдатель
            spectators.push(shuffled[i]);
            
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

// Функции чата
function sendGlobalMessage() {
    const input = document.getElementById('global-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Добавляем сообщение в чат
    addGlobalMessage(currentPlayer.nickname, message);
    
    // Отправляем в Firebase
    roomRef.child('chat').push({
        sender: currentPlayer.nickname,
        message: message,
        timestamp: getCurrentTimestamp()
    });
    
    input.value = '';
}

function addGlobalMessage(sender, message) {
    const messagesDiv = document.getElementById('global-chat-messages');
    if (!messagesDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const time = new Date().toLocaleTimeString().slice(0, 5);
    
    messageElement.innerHTML = `
        <span class="sender">${sender}</span>
        <span class="time">${time}</span>
        <div>${message}</div>
    `;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Слушаем новые сообщения в Firebase
if (roomRef) {
    roomRef.child('chat').on('child_added', (snapshot) => {
        const chatData = snapshot.val();
        if (chatData.sender !== currentPlayer.nickname) {
            addGlobalMessage(chatData.sender, chatData.message);
        }
    });
}

// Функции для наблюдателя
function spectatorNext() {
    if (!currentPlayer.isSpectator || !gameEngine) return;
    
    const players = currentPlayers.filter(p => !p.isSpectator);
    if (players.length === 0) return;
    
    let currentIndex = players.findIndex(p => p.id === currentPlayer.viewingPlayer);
    if (currentIndex === -1) currentIndex = 0;
    
    currentIndex = (currentIndex + 1) % players.length;
    currentPlayer.viewingPlayer = players[currentIndex].id;
    
    document.getElementById('spectator-viewing').textContent = 
        `Наблюдение: ${players[currentIndex].nickname}`;
    
    showSpectatorHint();
    
    // Обновляем в Firebase
    playersRef.child(currentPlayer.nickname).update({
        viewingPlayer: currentPlayer.viewingPlayer
    });
}

function spectatorPrev() {
    if (!currentPlayer.isSpectator || !gameEngine) return;
    
    const players = currentPlayers.filter(p => !p.isSpectator);
    if (players.length === 0) return;
    
    let currentIndex = players.findIndex(p => p.id === currentPlayer.viewingPlayer);
    if (currentIndex === -1) currentIndex = 0;
    
    currentIndex = (currentIndex - 1 + players.length) % players.length;
    currentPlayer.viewingPlayer = players[currentIndex].id;
    
    document.getElementById('spectator-viewing').textContent = 
        `Наблюдение: ${players[currentIndex].nickname}`;
    
    showSpectatorHint();
    
    // Обновляем в Firebase
    playersRef.child(currentPlayer.nickname).update({
        viewingPlayer: currentPlayer.viewingPlayer
    });
}

// Показать подсказку для наблюдателя
function showSpectatorHint() {
    const hint = document.getElementById('spectator-hint');
    if (hint) {
        hint.style.display = 'block';
        
        if (spectatorHintTimeout) {
            clearTimeout(spectatorHintTimeout);
        }
        
        spectatorHintTimeout = setTimeout(() => {
            hint.style.display = 'none';
        }, 3000);
    }
}

// Обновление игровой информации
function updateGameInfo() {
    if (!gameStarted || !currentPlayer) return;
    
    if (currentPlayer.isSpectator) {
        document.getElementById('spectator-controls').style.display = 'flex';
        document.getElementById('game-opponent').style.display = 'none';
        document.getElementById('game-turn').style.display = 'none';
        
        const viewing = currentPlayers.find(p => p.id === currentPlayer.viewingPlayer);
        if (viewing) {
            document.getElementById('spectator-viewing').textContent = 
                `Наблюдение: ${viewing.nickname}`;
        }
    } else {
        document.getElementById('spectator-controls').style.display = 'none';
        document.getElementById('game-opponent').style.display = 'flex';
        document.getElementById('game-turn').style.display = 'flex';
        
        document.getElementById('opponent-name').textContent = currentPlayer.opponent || '—';
        
        // Определяем, чей ход
        if (gameEngine && gameEngine.matches) {
            const match = gameEngine.matches.find(m => 
                m.player1.id === currentPlayer.id || m.player2.id === currentPlayer.id
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
function handleSpectatorClick(event) {
    if (!currentPlayer.isSpectator || !gameStarted) return;
    
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    if (x < width / 2) {
        spectatorPrev();
    } else {
        spectatorNext();
    }
}

// Добавляем обработчик клика
document.addEventListener('click', function(e) {
    if (currentPlayer?.isSpectator && gameStarted) {
        if (e.target.closest('#game-canvas') || e.target.closest('.game-canvas')) {
            handleSpectatorClick(e);
        }
    }
});

// Отправка по Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (e.target.id === 'global-chat-input') {
            sendGlobalMessage();
        }
    }
});

// Показать уведомление
function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'game-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Настройка обработчиков выхода
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

// Получение текущего времени
function getCurrentTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
}

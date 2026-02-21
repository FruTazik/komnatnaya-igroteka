// Глобальные переменные
let currentPlayer = null;
let roomId = null;
let roomRef = null;
let playersRef = null;
let gameRef = null;
let currentPlayers = [];
let currentAdmin = null;
let selectedGame = null;
let selectedMode = null;
let gameStarted = false;
let teams = [];

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
        nickname: nickname,
        isAdmin: false
    };
    
    // Получаем ссылки на Firebase
    roomRef = roomsRef.child(roomId);
    playersRef = roomRef.child('players');
    gameRef = roomRef.child('game');
    
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
    
    // Обновляем свое подключение
    await playersRef.child(nickname).update({
        connected: true,
        lastSeen: getCurrentTimestamp()
    });
    
    // Отображаем код комнаты
    const codeElements = document.querySelectorAll('#room-code-display, #floating-code');
    codeElements.forEach(el => {
        if (el) el.textContent = roomCode;
    });
    
    // Слушаем изменения в комнате
    setupFirebaseListeners();
    
    // Скрываем командный чат
    document.querySelector('.team-chat').style.display = 'none';
    
    // Настраиваем обработчики выхода
    setupExitHandlers();
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
            id: p.nickname
        }));
        
        // Обновляем админа
        const admin = Object.values(playersData).find(p => p.isAdmin);
        if (admin) {
            currentAdmin = admin.nickname;
        }
        
        updatePlayersList();
        updateStartButton();
        updateWaitingMessage();
    });
    
    // Слушаем изменения игры
    roomRef.child('gameStarted').on('value', (snapshot) => {
        gameStarted = snapshot.val() || false;
    });
    
    roomRef.child('selectedGame').on('value', (snapshot) => {
        selectedGame = snapshot.val();
    });
    
    roomRef.child('gameMode').on('value', (snapshot) => {
        selectedMode = snapshot.val();
    });
    
    // Слушаем команды
    roomRef.child('teams').on('value', (snapshot) => {
        teams = snapshot.val() || [];
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
        
        let statusIcon = player.connected ? '✅' : '❌';
        if (player.isAdmin) statusIcon = '👑';
        
        const teamColorClass = player.teamColor ? ` team-${player.teamColor}` : '';
        
        playerCard.innerHTML = `
            <span class="player-name${teamColorClass}">${player.nickname}</span>
            <span class="player-status">${statusIcon}</span>
        `;
        
        playersList.appendChild(playerCard);
    });
    
    for (let i = currentPlayers.length; i < 8; i++) {
        const emptyCard = document.createElement('div');
        emptyCard.className = 'player-card empty';
        emptyCard.innerHTML = `
            <span class="player-name">Свободно</span>
            <span class="player-status">⬜</span>
        `;
        playersList.appendChild(emptyCard);
    }
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
    } catch (err) {
        alert('Не удалось скопировать код');
    }
    
    document.body.removeChild(textarea);
}

// Выбор игры (только для админа)
async function selectGame(gameName) {
    if (!currentPlayer.isAdmin) {
        alert('Только администратор может выбирать игру!');
        return;
    }
    
    await roomRef.update({ selectedGame: gameName });
    
    // Подсвечиваем выбранную игру
    document.querySelectorAll('.game-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedElement = document.querySelector(`[data-game="${gameName}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
    
    // Показываем настройки режима
    showGameModes(gameName);
}

// Показ режимов для выбранной игры
function showGameModes(gameName) {
    const settings = gameEngine.gameSettings[gameName];
    if (!settings) return;
    
    const modeSettings = document.getElementById('game-mode-settings');
    const modeOptions = document.getElementById('mode-options');
    
    modeOptions.innerHTML = '';
    
    const oldCloseBtn = modeSettings.querySelector('.close-settings');
    if (oldCloseBtn) oldCloseBtn.remove();
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-settings';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => {
        modeSettings.style.display = 'none';
    };
    modeSettings.appendChild(closeBtn);
    
    settings.modes.forEach(mode => {
        const modeBtn = document.createElement('button');
        modeBtn.className = 'mode-btn';
        modeBtn.textContent = mode;
        modeBtn.onclick = () => selectGameMode(mode);
        modeOptions.appendChild(modeBtn);
    });
    
    modeSettings.style.display = 'block';
}

// Выбор режима игры
async function selectGameMode(mode) {
    await roomRef.update({ gameMode: mode });
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    
    setTimeout(() => {
        document.getElementById('game-mode-settings').style.display = 'none';
    }, 2000);
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
    
    if (!selectedMode) {
        alert('Выберите режим игры!');
        return;
    }
    
    // Распределяем команды
    const teams = distributeTeams(selectedMode, currentPlayers);
    
    // Сохраняем в Firebase
    await roomRef.update({
        gameStarted: true,
        teams: teams,
        currentTurn: 1
    });
    
    // Показываем игрокам их команды
    showTeamAssignment(teams);
    
    // Запускаем игру через движок
    const config = gameEngine.initGame(selectedGame, currentPlayers, selectedMode, teams);
    
    // Скрываем список игр, показываем игровое поле
    document.getElementById('games-selection').style.display = 'none';
    document.getElementById('game-canvas').style.display = 'block';
    document.getElementById('game-mode-settings').style.display = 'none';
    
    // Показываем командный чат
    document.querySelector('.team-chat').style.display = 'flex';
    
    // Обновляем статус
    document.getElementById('game-status').textContent = `Игра: ${getGameName(selectedGame)} (${selectedMode})`;
    
    // Загружаем игру
    loadGame(selectedGame, config);
}

// Распределение команд
function distributeTeams(mode, players) {
    const colors = ['желтый', 'синий', 'красный', 'зеленый'];
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const usedColors = [];
    const teams = [];
    
    if (mode.includes('x')) {
        const [playersPerGame, gamesCount] = mode.split('x').map(Number);
        
        for (let i = 0; i < gamesCount; i++) {
            const color = getRandomTeamColor(usedColors);
            usedColors.push(color);
            
            const teamPlayers = [];
            for (let j = 0; j < playersPerGame; j++) {
                if (shuffled.length > 0) {
                    const player = shuffled.shift();
                    player.teamColor = color;
                    teamPlayers.push(player);
                }
            }
            
            teams.push({
                id: i + 1,
                color: color,
                players: teamPlayers,
                score: 0
            });
        }
    } else if (mode.includes('v')) {
        const [team1size, team2size] = mode.split('v').map(Number);
        
        // Команда 1
        const color1 = getRandomTeamColor(usedColors);
        usedColors.push(color1);
        const team1 = [];
        for (let i = 0; i < team1size; i++) {
            if (shuffled.length > 0) {
                const player = shuffled.shift();
                player.teamColor = color1;
                team1.push(player);
            }
        }
        teams.push({ id: 1, color: color1, players: team1, score: 0 });
        
        // Команда 2
        const color2 = getRandomTeamColor(usedColors);
        usedColors.push(color2);
        const team2 = [];
        for (let i = 0; i < team2size; i++) {
            if (shuffled.length > 0) {
                const player = shuffled.shift();
                player.teamColor = color2;
                team2.push(player);
            }
        }
        teams.push({ id: 2, color: color2, players: team2, score: 0 });
    }
    
    // Оставшиеся - наблюдатели
    shuffled.forEach(player => {
        player.isSpectator = true;
    });
    
    return teams;
}

// Показ распределения команд
function showTeamAssignment(teams) {
    const playerTeam = teams.find(t => 
        t.players.some(p => p.nickname === currentPlayer.nickname)
    );
    
    let message = '';
    if (playerTeam) {
        const teammates = playerTeam.players
            .filter(p => p.nickname !== currentPlayer.nickname)
            .map(p => p.nickname)
            .join(', ');
        
        message = `🎨 Команда ${playerTeam.color}\n\n`;
        if (teammates) {
            message += `С вами: ${teammates}`;
        } else {
            message += 'Вы один в команде';
        }
    } else {
        message = '👁️ Вы наблюдатель';
    }
    
    if (message) {
        showNotification(message, 5000);
    }
}

// Показать уведомление
function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'team-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Загрузка игры
function loadGame(gameName, config) {
    if (document.querySelector(`script[src="games/${gameName}.js"]`)) {
        if (window[`init${camelCase(gameName)}`]) {
            window[`init${camelCase(gameName)}`](config);
        }
        return;
    }
    
    const script = document.createElement('script');
    script.src = `games/${gameName}.js`;
    script.onload = () => {
        if (window[`init${camelCase(gameName)}`]) {
            window[`init${camelCase(gameName)}`](config);
        }
    };
    document.head.appendChild(script);
}

// Вспомогательные функции
function camelCase(str) {
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

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

function getRandomTeamColor(usedColors = []) {
    const colors = ['желтый', 'синий', 'красный', 'зеленый'];
    const available = colors.filter(c => !usedColors.includes(c));
    if (available.length === 0) return colors[Math.floor(Math.random() * colors.length)];
    return available[Math.floor(Math.random() * available.length)];
}

// Функции чата
async function sendTeamMessage() {
    const input = document.getElementById('team-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Сохраняем сообщение в Firebase
    await roomRef.child('chat').child('team').push({
        sender: currentPlayer.nickname,
        message: message,
        timestamp: getCurrentTimestamp()
    });
    
    input.value = '';
}

async function sendGlobalMessage() {
    const input = document.getElementById('global-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Сохраняем сообщение в Firebase
    await roomRef.child('chat').child('global').push({
        sender: currentPlayer.nickname,
        message: message,
        timestamp: getCurrentTimestamp()
    });
    
    input.value = '';
}

// Настройка обработчиков выхода
function setupExitHandlers() {
    // При закрытии вкладки
    window.addEventListener('beforeunload', function() {
        if (roomRef && currentPlayer) {
            playersRef.child(currentPlayer.nickname).update({
                connected: false,
                lastSeen: getCurrentTimestamp()
            });
        }
    });
    
    // Периодическое обновление присутствия
    setInterval(async () => {
        if (roomRef && currentPlayer) {
            await playersRef.child(currentPlayer.nickname).update({
                lastSeen: getCurrentTimestamp()
            });
        }
    }, 30000); // Каждые 30 секунд
}

// Отправка по Enter
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        if (e.target.id === 'team-chat-input') {
            sendTeamMessage();
        } else if (e.target.id === 'global-chat-input') {
            sendGlobalMessage();
        }
    }
});
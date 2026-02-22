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
            lastSeen: getCurrentTimestamp(),
            score: 0,
            isSpectator: false,
            opponent: null,
            matchId: null,
            viewingPlayer: null,
            avatar: randomAvatar
        });
        
        document.querySelectorAll('#room-code-display, #floating-code').forEach(el => {
            if (el) el.textContent = roomCode;
        });
        
        document.getElementById('player-name').textContent = nickname;
        
        document.getElementById('spectator-controls').style.display = 'none';
        document.getElementById('spectator-hint').style.display = 'none';
        
        setupFirebaseListeners();
        setupExitHandlers();
        
        updateStartButton();
        updateWaitingMessage();
        
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
        } else if (count === 0) {
            countdownDiv.textContent = 'GO!';
            playSound('start_game_sound');
        } else {
            clearInterval(countdownInterval);
            setTimeout(() => {
                overlay.remove();
            }, 500);
        }
    }, 1000);
}

// Обновление списка игроков с сортировкой по очкам
function updatePlayersList() {
    const list = document.getElementById('players-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    // Сортируем: сначала админ, потом по убыванию очков
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

// Остальные функции остаются без изменений...
// (updateStartButton, updateWaitingMessage, selectGame, startSelectedGame, createMatches, copyRoomCode, sendGlobalMessage, addGlobalMessage, spectatorNext, spectatorPrev, showSpectatorHint, updateGameInfo, handleSpectatorClick, showNotification, setupExitHandlers, getGameName, getCurrentTimestamp)

// Добавляем функцию для звука
function playSound(soundName) {
    console.log(`🔊 Звук: ${soundName}`);
    // Здесь будет реальное воспроизведение
}

// Делаем функцию глобальной
window.playSound = playSound;

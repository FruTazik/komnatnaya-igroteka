// game-engine.js - Движок с наблюдателями как в CS2

class GameEngine {
    constructor() {
        this.currentGame = null;
        this.players = [];
        this.matches = []; // Пары игроков
        this.spectators = []; // Наблюдатели
        this.gameState = 'waiting';
        this.timer = null;
        this.timerValue = 20 * 60; // 20 минут
        this.maxScore = 1000;
        
        // Настройки для каждой игры
        this.gameSettings = {
            'sea-battle': {
                pointsPerWin: 40,
                maxPlayers: 8,
                minPlayers: 2,
                timePerMove: 30,
                name: 'Морской бой'
            },
            'tic-tac-toe': {
                pointsPerWin: 10,
                maxPlayers: 8,
                minPlayers: 2,
                timePerMove: 10,
                name: 'Крестики-нолики'
            },
            'gallows': {
                pointsPerWin: 15,
                maxPlayers: 8,
                minPlayers: 2,
                timePerMove: 20,
                name: 'Виселица'
            },
            'crocodile': {
                pointsPerWin: 25,
                maxPlayers: 8,
                minPlayers: 3,
                timePerRound: 60,
                name: 'Крокодил'
            },
            'danetki': {
                pointsPerWin: 20,
                maxPlayers: 8,
                minPlayers: 3,
                timePerQuestion: 120,
                name: 'Данетки'
            },
            'hat': {
                pointsPerWin: 25,
                maxPlayers: 8,
                minPlayers: 4,
                timePerRound: 60,
                name: 'Шляпа'
            },
            'who-am-i': {
                pointsPerWin: 15,
                maxPlayers: 8,
                minPlayers: 3,
                timePerRound: 45,
                name: 'Кто я?'
            },
            'balda': {
                pointsPerWin: 25,
                maxPlayers: 4,
                minPlayers: 2,
                timePerMove: 30,
                name: 'Балда'
            }
        };
    }

    // Инициализация игры
    initGame(gameName, players) {
        this.currentGame = gameName;
        this.players = players.map(p => ({
            ...p,
            score: p.score || 0,
            currentMatch: null,
            opponent: null,
            isSpectator: false
        }));
        
        this.gameState = 'playing';
        
        // Создаем пары и определяем наблюдателей
        this.createMatchesAndSpectators();
        
        // Запускаем таймер
        this.startTimer(this.gameDuration);
        
        // Обновляем информационную панель
        this.updateGameInfo();
        
        return this.getGameConfig();
    }

    // Создание пар и определение наблюдателей
    createMatchesAndSpectators() {
        // Перемешиваем игроков
        const shuffled = [...this.players].sort(() => Math.random() - 0.5);
        this.matches = [];
        this.spectators = [];
        
        // Создаем пары
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                // Создаем матч
                const match = {
                    id: this.matches.length + 1,
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    currentTurn: Math.random() < 0.5 ? shuffled[i] : shuffled[i + 1], // Случайный первый ход
                    moves: [],
                    gameState: {},
                    startTime: Date.now()
                };
                
                this.matches.push(match);
                
                // Назначаем игроков в матч
                shuffled[i].currentMatch = match.id;
                shuffled[i].opponent = shuffled[i + 1].nickname;
                shuffled[i].isSpectator = false;
                
                shuffled[i + 1].currentMatch = match.id;
                shuffled[i + 1].opponent = shuffled[i].nickname;
                shuffled[i + 1].isSpectator = false;
            } else {
                // Оставшийся игрок становится наблюдателем
                shuffled[i].isSpectator = true;
                shuffled[i].currentMatch = null;
                shuffled[i].opponent = null;
                shuffled[i].viewingPlayer = this.players[0]?.id; // Наблюдает за первым игроком
                this.spectators.push(shuffled[i]);
            }
        }
        
        console.log('Созданы матчи:', this.matches);
        console.log('Наблюдатели:', this.spectators);
    }

    // Получение конфигурации игры
    getGameConfig() {
        return {
            game: this.currentGame,
            settings: this.gameSettings[this.currentGame],
            players: this.players,
            matches: this.matches,
            spectators: this.spectators,
            timer: this.timerValue
        };
    }

    // Запуск таймера
    startTimer(seconds) {
        this.timerValue = seconds;
        this.timer = setInterval(() => {
            this.timerValue--;
            this.updateTimer();
            
            if (this.timerValue <= 0) {
                this.endGame('timeout');
            }
        }, 1000);
    }

    // Обновление таймера
    updateTimer() {
        const minutes = Math.floor(this.timerValue / 60);
        const seconds = this.timerValue % 60;
        const timerDisplay = document.getElementById('game-timer');
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // Обновление информационной панели
    updateGameInfo() {
        const gameTitle = document.getElementById('game-title');
        const playerNameSpan = document.getElementById('player-name');
        const opponentNameSpan = document.getElementById('opponent-name');
        const turnIndicator = document.getElementById('turn-indicator');
        
        if (gameTitle) {
            gameTitle.textContent = `🎮 ${this.gameSettings[this.currentGame]?.name || 'Игра'}`;
        }
    }

    // Обновление информации для конкретного игрока
    updatePlayerInfo(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        const playerNameSpan = document.getElementById('player-name');
        const opponentNameSpan = document.getElementById('opponent-name');
        const turnIndicator = document.getElementById('turn-indicator');
        const spectatorControls = document.getElementById('spectator-controls');
        
        if (player.isSpectator) {
            // Наблюдатель
            spectatorControls.style.display = 'flex';
            document.getElementById('game-opponent').style.display = 'none';
            document.getElementById('game-turn').style.display = 'none';
            
            const viewing = this.players.find(p => p.id === player.viewingPlayer);
            if (viewing) {
                document.getElementById('spectator-viewing').textContent = 
                    `Наблюдение: ${viewing.nickname}`;
            }
        } else {
            // Игрок
            spectatorControls.style.display = 'none';
            document.getElementById('game-opponent').style.display = 'flex';
            document.getElementById('game-turn').style.display = 'flex';
            
            playerNameSpan.textContent = player.nickname;
            opponentNameSpan.textContent = player.opponent || '—';
            
            const match = this.getPlayerMatch(playerId);
            if (match) {
                const isMyTurn = match.currentTurn?.id === playerId;
                turnIndicator.textContent = isMyTurn ? 'Ваш ход' : `Ход соперника`;
                turnIndicator.style.color = isMyTurn ? '#27ae60' : '#e74c3c';
            }
        }
    }

    // Переключение вида для наблюдателя
    spectatorSwitch(playerId, direction) {
        const spectator = this.spectators.find(s => s.id === playerId);
        if (!spectator) return;
        
        // Получаем список всех игроков (не наблюдателей)
        const activePlayers = this.players.filter(p => !p.isSpectator);
        if (activePlayers.length === 0) return;
        
        let currentIndex = activePlayers.findIndex(p => p.id === spectator.viewingPlayer);
        if (currentIndex === -1) currentIndex = 0;
        
        if (direction === 'next') {
            currentIndex = (currentIndex + 1) % activePlayers.length;
        } else if (direction === 'prev') {
            currentIndex = (currentIndex - 1 + activePlayers.length) % activePlayers.length;
        }
        
        spectator.viewingPlayer = activePlayers[currentIndex].id;
        
        // Обновляем отображение
        document.getElementById('spectator-viewing').textContent = 
            `Наблюдение: ${activePlayers[currentIndex].nickname}`;
        
        // Возвращаем ID игрока, за которым наблюдаем
        return activePlayers[currentIndex].id;
    }

    // Сделать ход
    makeMove(playerId, matchId, move) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return false;
        
        // Проверяем, что ходит нужный игрок
        if (match.currentTurn.id !== playerId) return false;
        
        // Добавляем ход
        match.moves.push({
            player: playerId,
            move: move,
            timestamp: Date.now()
        });
        
        // Меняем игрока
        match.currentTurn = (match.currentTurn.id === match.player1.id) ? match.player2 : match.player1;
        
        // Обновляем информацию для обоих игроков
        this.updatePlayerInfo(match.player1.id);
        this.updatePlayerInfo(match.player2.id);
        
        return true;
    }

    // Добавление очков игроку
    addPoints(playerId, points) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.score = (player.score || 0) + points;
            this.updateScores();
            
            if (player.score >= this.maxScore) {
                this.endGame('winner', player);
            }
        }
    }

    // Обновление счета
    updateScores() {
        const scoresList = document.getElementById('scores-list');
        if (!scoresList) return;
        
        scoresList.innerHTML = '';
        
        // Сортируем по убыванию очков
        const sorted = [...this.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        
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

    // Получить матч игрока
    getPlayerMatch(playerId) {
        return this.matches.find(m => 
            m.player1.id === playerId || m.player2.id === playerId
        );
    }

    // Получить информацию о текущем состоянии
    getGameState(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return null;
        
        if (player.isSpectator) {
            // Для наблюдателя показываем игру того, за кем он наблюдает
            const viewingPlayer = this.players.find(p => p.id === player.viewingPlayer);
            if (viewingPlayer) {
                const match = this.getPlayerMatch(viewingPlayer.id);
                return {
                    isSpectator: true,
                    viewingPlayer: viewingPlayer,
                    match: match,
                    allMatches: this.matches
                };
            }
        } else {
            // Для игрока показываем его матч
            const match = this.getPlayerMatch(playerId);
            return {
                isSpectator: false,
                player: player,
                match: match,
                isMyTurn: match?.currentTurn?.id === playerId
            };
        }
        
        return null;
    }

    // Показать уведомление
    showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
    }

    // Завершение игры
    endGame(reason, winner = null) {
        clearInterval(this.timer);
        
        let message = '';
        if (reason === 'winner') {
            message = `🏆 Победитель: ${winner.nickname} с ${winner.score} очками!`;
        } else if (reason === 'timeout') {
            // Находим игрока с наибольшим счетом
            const winner = this.players.reduce((max, p) => 
                (p.score || 0) > (max.score || 0) ? p : max
            , this.players[0]);
            
            if (winner) {
                message = `⏰ Время вышло! Победитель: ${winner.nickname} с ${winner.score || 0} очками!`;
            }
        }
        
        if (message) {
            this.showNotification(message, 5000);
            alert(message);
        }
        
        this.gameState = 'finished';
    }

    // Сброс игры
    resetGame() {
        clearInterval(this.timer);
        this.currentGame = null;
        this.players = [];
        this.matches = [];
        this.spectators = [];
        this.gameState = 'waiting';
        this.timerValue = 20 * 60;
    }
}

// Создаем глобальный экземпляр
const gameEngine = new GameEngine();

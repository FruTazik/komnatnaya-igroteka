// game-engine.js - Упрощенный движок (только индивидуальные игры)

class GameEngine {
    constructor() {
        this.currentGame = null;
        this.players = [];
        this.matches = []; // Пары игроков [ [player1, player2], ... ]
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
                timePerMove: 30
            },
            'tic-tac-toe': {
                pointsPerWin: 10,
                maxPlayers: 8,
                minPlayers: 2,
                timePerMove: 10
            },
            'gallows': {
                pointsPerWin: 15,
                maxPlayers: 8,
                minPlayers: 2,
                timePerMove: 20
            },
            'crocodile': {
                pointsPerWin: 25,
                maxPlayers: 8,
                minPlayers: 3,
                timePerRound: 60
            },
            'danetki': {
                pointsPerWin: 20,
                maxPlayers: 8,
                minPlayers: 3,
                timePerQuestion: 120
            },
            'hat': {
                pointsPerWin: 25,
                maxPlayers: 8,
                minPlayers: 4,
                timePerRound: 60
            },
            'who-am-i': {
                pointsPerWin: 15,
                maxPlayers: 8,
                minPlayers: 3,
                timePerRound: 45
            },
            'balda': {
                pointsPerWin: 25,
                maxPlayers: 4,
                minPlayers: 2,
                timePerMove: 30
            }
        };
    }

    // Инициализация игры
    initGame(gameName, players) {
        this.currentGame = gameName;
        this.players = players.map(p => ({
            ...p,
            score: 0,
            currentMatch: null,
            opponent: null
        }));
        
        this.gameState = 'playing';
        
        // Создаем пары для игры
        this.createMatches();
        
        // Запускаем таймер
        this.startTimer(this.gameSettings[gameName].timePerMove * 10);
        
        return this.getGameConfig();
    }

    // Создание пар игроков (рандомное перемешивание)
    createMatches() {
        const shuffled = [...this.players].sort(() => Math.random() - 0.5);
        this.matches = [];
        
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                // Пара игроков
                const match = {
                    id: this.matches.length + 1,
                    player1: shuffled[i],
                    player2: shuffled[i + 1],
                    currentTurn: shuffled[i],
                    gameState: {},
                    moves: []
                };
                
                this.matches.push(match);
                
                // Сохраняем информацию для игроков
                shuffled[i].currentMatch = match.id;
                shuffled[i].opponent = shuffled[i + 1].nickname;
                
                shuffled[i + 1].currentMatch = match.id;
                shuffled[i + 1].opponent = shuffled[i].nickname;
            } else {
                // Если остался один игрок - он наблюдает
                shuffled[i].isSpectator = true;
                shuffled[i].opponent = null;
            }
        }
        
        console.log('Созданы пары:', this.matches);
    }

    // Получение конфигурации игры
    getGameConfig() {
        return {
            game: this.currentGame,
            settings: this.gameSettings[this.currentGame],
            players: this.players,
            matches: this.matches,
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
            timerDisplay.textContent = `⏰ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.timerValue < 60) {
                timerDisplay.style.color = '#e74c3c';
            } else if (this.timerValue < 300) {
                timerDisplay.style.color = '#f39c12';
            }
        }
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
        this.gameState = 'waiting';
        this.timerValue = 20 * 60;
    }
}

// Создаем глобальный экземпляр
const gameEngine = new GameEngine();

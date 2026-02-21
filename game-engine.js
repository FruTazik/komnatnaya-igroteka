// game-engine.js - Универсальный движок для всех игр

class GameEngine {
    constructor() {
        this.currentGame = null;
        this.players = [];
        this.teams = [];
        this.spectators = [];
        this.gameState = 'waiting'; // waiting, selecting-mode, playing, paused
        this.timer = null;
        this.timerValue = 20 * 60; // 20 минут в секундах
        this.maxScore = 1000; // Цель - 1000 очков
        this.currentTurn = null;
        this.gameDuration = 20 * 60; // 20 минут в секундах
        
        // Настройки для каждой игры
        this.gameSettings = {
            'sea-battle': {
                pointsPerWin: 40,
                maxPlayers: 8,
                minPlayers: 2,
                teamBased: true,
                timePerMove: 30,
                modes: ['2v2', '3v3', '1v1x4', 'наблюдение']
            },
            'tic-tac-toe': {
                pointsPerWin: 10,
                maxPlayers: 8,
                minPlayers: 2,
                teamBased: true,
                timePerMove: 10,
                modes: ['2v2', '3v3', '1v1x4', 'турнир']
            },
            'gallows': {
                pointsPerWin: 15,
                maxPlayers: 8,
                minPlayers: 2,
                teamBased: true,
                timePerMove: 20,
                modes: ['2v2', '3v3', 'каждый за себя']
            },
            'crocodile': {
                pointsPerWin: 25,
                maxPlayers: 8,
                minPlayers: 3,
                teamBased: true,
                timePerRound: 60,
                modes: ['2v2', '3v3', 'каждый за себя']
            },
            'danetki': {
                pointsPerWin: 20,
                maxPlayers: 8,
                minPlayers: 3,
                teamBased: true,
                timePerQuestion: 120,
                modes: ['2v2', '3v3', 'командный']
            },
            'hat': {
                pointsPerWin: 25,
                maxPlayers: 8,
                minPlayers: 4,
                teamBased: true,
                timePerRound: 60,
                modes: ['2v2', '3v3', '4v4']
            },
            'who-am-i': {
                pointsPerWin: 15,
                maxPlayers: 8,
                minPlayers: 3,
                teamBased: false,
                timePerRound: 45,
                modes: ['каждый за себя', 'командный']
            },
            'balda': {
                pointsPerWin: 25,
                maxPlayers: 4,
                minPlayers: 2,
                teamBased: true,
                timePerMove: 30,
                modes: ['2v2', '1v1']
            }
        };
    }

    // Инициализация игры
    initGame(gameName, players, mode, teams) {
        this.currentGame = gameName;
        this.players = players;
        this.teams = teams || [];
        this.gameState = 'playing';
        
        // Определяем наблюдателей
        this.spectators = players.filter(p => p.isSpectator);
        
        // Устанавливаем первый ход
        if (this.teams.length > 0) {
            this.currentTurn = this.teams[0].id;
        }
        
        // Запускаем таймер на 20 минут
        this.startTimer(this.gameDuration);
        
        return this.getGameConfig();
    }

    // Получение конфигурации игры
    getGameConfig() {
        return {
            game: this.currentGame,
            settings: this.gameSettings[this.currentGame],
            teams: this.teams,
            spectators: this.spectators,
            timer: this.timerValue,
            players: this.players,
            currentTurn: this.currentTurn
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

    // Обновление таймера на странице
    updateTimer() {
        const minutes = Math.floor(this.timerValue / 60);
        const seconds = this.timerValue % 60;
        const timerDisplay = document.getElementById('game-timer');
        if (timerDisplay) {
            timerDisplay.textContent = `⏰ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Меняем цвет, если осталось мало времени
            if (this.timerValue < 60) {
                timerDisplay.style.color = '#e74c3c';
            } else if (this.timerValue < 300) {
                timerDisplay.style.color = '#f39c12';
            }
        }
    }

    // Голосование за ход
    voteForMove(teamId, playerId, move) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) return false;
        
        if (!team.currentVotes) {
            team.currentVotes = {};
        }
        
        team.currentVotes[playerId] = move;
        
        // Проверяем, все ли проголосовали
        const votes = Object.values(team.currentVotes);
        
        // Проверяем, все ли проголосовали одинаково
        const allSame = votes.length === team.players.length && 
                       votes.every(v => JSON.stringify(v) === JSON.stringify(votes[0]));
        
        if (allSame) {
            team.agreedMove = votes[0];
            return true; // Все согласны, можно делать ход
        }
        
        return false; // Ждем остальных
    }

    // Сброс голосов команды
    clearVotes(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (team) {
            team.currentVotes = {};
            team.agreedMove = null;
        }
    }

    // Переключение на следующий ход
    nextTurn() {
        if (!this.currentTurn) {
            this.currentTurn = this.teams[0]?.id;
        } else {
            const teamIds = this.teams.map(t => t.id);
            const currentIndex = teamIds.indexOf(this.currentTurn);
            this.currentTurn = teamIds[(currentIndex + 1) % teamIds.length];
        }
        
        // Очищаем голоса всех команд
        this.teams.forEach(t => {
            t.currentVotes = {};
            t.agreedMove = null;
        });
        
        return this.currentTurn;
    }

    // Добавление очков команде
    addPoints(teamId, points) {
        const team = this.teams.find(t => t.id === teamId);
        if (team) {
            team.score = (team.score || 0) + points;
            this.updateScores();
            
            // Проверяем, не набрала ли команда 1000 очков
            if (team.score >= this.maxScore) {
                this.endGame('winner', team);
            }
        }
    }

    // Обновление отображения очков
    updateScores() {
        const scoresList = document.getElementById('scores-list');
        if (!scoresList) return;
        
        scoresList.innerHTML = '';
        
        // Сначала показываем игроков из команд
        this.teams.forEach(team => {
            team.players.forEach(player => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                scoreItem.innerHTML = `
                    <span class="player-name team-${team.color}">${player.nickname}</span>
                    <span class="player-score">${team.score || 0}</span>
                `;
                scoresList.appendChild(scoreItem);
            });
        });
        
        // Потом наблюдателей (у них 0 очков)
        this.spectators.forEach(player => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.innerHTML = `
                <span class="player-name">${player.nickname} 👁️</span>
                <span class="player-score">0</span>
            `;
            scoresList.appendChild(scoreItem);
        });
    }

    // Получить команду игрока
    getPlayerTeam(playerId) {
        return this.teams.find(team => team.players.some(p => p.id === playerId));
    }

    // Получить цвет команды игрока
    getPlayerColor(playerId) {
        const team = this.getPlayerTeam(playerId);
        return team ? team.color : null;
    }

    // Проверка, является ли игрок наблюдателем
    isSpectator(playerId) {
        return this.spectators.some(p => p.id === playerId);
    }

    // Переключение вида для наблюдателя
    spectatorSwitchView(spectatorId, targetPlayerId) {
        const spectator = this.spectators.find(s => s.id === spectatorId);
        if (spectator) {
            spectator.viewing = targetPlayerId;
            
            // Подсвечиваем, за кем наблюдает
            const targetPlayer = this.players.find(p => p.id === targetPlayerId);
            if (targetPlayer) {
                this.showNotification(`👁️ Наблюдаете за ${targetPlayer.nickname}`);
            }
        }
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
            message = `🏆 Победила команда ${winner.color} с ${winner.score} очками!`;
        } else if (reason === 'timeout') {
            // Определяем победителя по очкам
            if (this.teams.length > 0) {
                const winner = this.teams.reduce((max, team) => 
                    (team.score || 0) > (max.score || 0) ? team : max
                , this.teams[0]);
                message = `⏰ Время вышло! Победила команда ${winner.color} с ${winner.score || 0} очками!`;
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
        this.teams = [];
        this.spectators = [];
        this.gameState = 'waiting';
        this.timerValue = this.gameDuration;
        this.currentTurn = null;
        
        // Сброс игроков
        this.players.forEach(p => {
            p.team = null;
            p.teamColor = null;
            p.isSpectator = false;
        });
    }
}

// Создаем глобальный экземпляр движка
const gameEngine = new GameEngine();

// Добавляем вспомогательные функции для игр

// Функция для добавления сообщения в командный чат
function addTeamMessage(sender, message) {
    const messagesDiv = document.getElementById('team-chat-messages');
    if (!messagesDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message team-message';
    
    if (sender === 'system') {
        messageElement.innerHTML = `
            <div style="color: #666; font-style: italic;">⚡ ${message}</div>
        `;
    } else {
        messageElement.innerHTML = `
            <span class="sender">${sender}</span>
            <span class="time">${new Date().toLocaleTimeString()}</span>
            <div>${message}</div>
        `;
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Функция для добавления сообщения в общий чат
function addGlobalMessage(sender, message) {
    const messagesDiv = document.getElementById('global-chat-messages');
    if (!messagesDiv) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    if (sender === 'system') {
        messageElement.innerHTML = `
            <div style="color: #666; font-style: italic;">🔔 ${message}</div>
        `;
    } else {
        messageElement.innerHTML = `
            <span class="sender">${sender}</span>
            <span class="time">${new Date().toLocaleTimeString()}</span>
            <div>${message}</div>
        `;
    }
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Функция для получения случайного цвета команды
function getRandomTeamColor(usedColors = []) {
    const colors = ['желтый', 'синий', 'красный', 'зеленый'];
    const available = colors.filter(c => !usedColors.includes(c));
    if (available.length === 0) return colors[Math.floor(Math.random() * colors.length)];
    return available[Math.floor(Math.random() * available.length)];
}

// Функция для получения CSS цвета
function getColorCode(color) {
    const colors = {
        'желтый': '#f1c40f',
        'синий': '#3498db',
        'красный': '#e74c3c',
        'зеленый': '#2ecc71'
    };
    return colors[color] || '#333';
}
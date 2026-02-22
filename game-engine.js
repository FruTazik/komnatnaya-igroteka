// game-engine.js - Упрощенный движок
class GameEngine {
    constructor() {
        this.currentGame = null;
        this.players = [];
        this.matches = [];
        this.gameState = 'waiting';
        this.timer = null;
        this.timerValue = 20 * 60;
        this.maxScore = 1000;
        
        this.gameSettings = {
            'sea-battle': { pointsPerWin: 40, maxPlayers: 8, minPlayers: 2, name: 'Морской бой' },
            'tic-tac-toe': { pointsPerWin: 10, maxPlayers: 8, minPlayers: 2, name: 'Крестики-нолики' },
            'gallows': { pointsPerWin: 15, maxPlayers: 8, minPlayers: 2, name: 'Виселица' },
            'crocodile': { pointsPerWin: 25, maxPlayers: 8, minPlayers: 3, name: 'Крокодил' },
            'danetki': { pointsPerWin: 20, maxPlayers: 8, minPlayers: 3, name: 'Данетки' },
            'hat': { pointsPerWin: 25, maxPlayers: 8, minPlayers: 4, name: 'Шляпа' },
            'who-am-i': { pointsPerWin: 15, maxPlayers: 8, minPlayers: 3, name: 'Кто я?' },
            'balda': { pointsPerWin: 25, maxPlayers: 4, minPlayers: 2, name: 'Балда' }
        };
    }

    initGame(gameName, players) {
        this.currentGame = gameName;
        this.players = players.map(p => ({...p, score: p.score || 0}));
        this.gameState = 'playing';
        this.startTimer(20 * 60);
        return this.getGameConfig();
    }

    getGameConfig() {
        return {
            game: this.currentGame,
            settings: this.gameSettings[this.currentGame],
            players: this.players,
            matches: this.matches,
            timer: this.timerValue
        };
    }

    startTimer(seconds) {
        this.timerValue = seconds;
        this.timer = setInterval(() => {
            this.timerValue--;
            this.updateTimer();
            if (this.timerValue <= 0) this.endGame('timeout');
        }, 1000);
    }

    updateTimer() {
        const minutes = Math.floor(this.timerValue / 60);
        const seconds = this.timerValue % 60;
        const timer = document.getElementById('game-timer');
        if (timer) {
            timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    makeMove(playerId, matchId, move) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return false;
        if (match.currentTurn !== playerId) return false;
        
        match.moves.push({ player: playerId, move, timestamp: Date.now() });
        match.currentTurn = match.currentTurn === match.player1.id ? match.player2.id : match.player1.id;
        return true;
    }

    addPoints(playerId, points) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.score = (player.score || 0) + points;
            if (player.score >= this.maxScore) this.endGame('winner', player);
        }
    }

    endGame(reason, winner = null) {
        clearInterval(this.timer);
        let message = reason === 'winner' ? `🏆 Победитель: ${winner.nickname}` : '⏰ Время вышло!';
        alert(message);
        this.gameState = 'finished';
    }

    resetGame() {
        clearInterval(this.timer);
        this.currentGame = null;
        this.players = [];
        this.matches = [];
        this.gameState = 'waiting';
        this.timerValue = 20 * 60;
    }
}

window.gameEngine = new GameEngine();

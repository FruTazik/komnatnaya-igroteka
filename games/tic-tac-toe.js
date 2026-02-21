// Крестики-нолики
function initTicTacToe(config) {
    console.log('Инициализация крестиков-ноликов', config);
    
    const canvas = document.getElementById('game-canvas');
    canvas.innerHTML = `
        <div class="tic-tac-toe-container">
            <div class="game-info">
                <div class="current-turn" id="current-turn">Ход команды красных</div>
                <div class="board-size">
                    <select id="board-size" onchange="changeBoardSize(this.value)">
                        <option value="3">3x3</option>
                        <option value="5">5x5 (Гомоку)</option>
                    </select>
                </div>
            </div>
            <div class="board-container">
                <div id="game-board" class="game-board board-3x3"></div>
            </div>
            <div class="team-votes" id="team-votes"></div>
        </div>
    `;
    
    // Создаем доску 3x3 по умолчанию
    createBoard(3);
    
    // Показываем, какая команда ходит
    updateTurn();
}

function createBoard(size) {
    const board = document.getElementById('game-board');
    board.className = `game-board board-${size}x${size}`;
    board.innerHTML = '';
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.className = 'tic-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.onclick = () => cellClick(i, j);
            
            // Добавляем координаты для наблюдателей
            cell.innerHTML = `<span class="cell-coord">${String.fromCharCode(65 + i)}${j + 1}</span>`;
            
            board.appendChild(cell);
        }
    }
}

function changeBoardSize(size) {
    createBoard(parseInt(size));
    gameEngine.resetGameState();
}

function cellClick(row, col) {
    const currentPlayer = getCurrentPlayer();
    
    if (currentPlayer.isSpectator) {
        // Наблюдатель переключает вид
        spectatorView(row, col);
        return;
    }
    
    // Находим команду игрока
    const playerTeam = gameEngine.teams.find(t => t.players.includes(currentPlayer));
    if (!playerTeam) return;
    
    // Проверяем, что ходит именно эта команда
    if (gameEngine.currentTurn !== playerTeam.id) {
        addTeamMessage('system', 'Сейчас не ваш ход!');
        return;
    }
    
    // Голосуем за ход
    const allAgreed = gameEngine.voteForMove(playerTeam.id, currentPlayer.id, {row, col});
    
    if (allAgreed) {
        // Все в команде согласны, делаем ход
        makeMove(playerTeam, playerTeam.agreedMove);
    } else {
        // Показываем, кто за что голосует
        showTeamVotes(playerTeam);
    }
}

function makeMove(team, move) {
    const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
    
    if (!cell || cell.classList.contains('taken')) {
        addTeamMessage('system', 'Эта клетка уже занята!');
        return;
    }
    
    // Ставим символ команды
    cell.classList.add('taken');
    cell.classList.add(`team-${team.color}`);
    
    // Определяем символ (X или O) в зависимости от команды
    const symbol = team.id === 1 ? '❌' : '⭕';
    cell.innerHTML = symbol;
    
    // Проверяем победу
    if (checkWin(team)) {
        gameEngine.addPoints(team.id, gameEngine.gameSettings['tic-tac-toe'].pointsPerWin);
        addTeamMessage('system', `🎉 Команда ${team.color} победила! +${gameEngine.gameSettings['tic-tac-toe'].pointsPerWin} очков`);
        gameEngine.nextTurn();
    } else {
        // Следующая команда
        gameEngine.nextTurn();
    }
    
    updateTurn();
}

function checkWin(team) {
    // Простая проверка для 3x3
    const cells = document.querySelectorAll('.tic-cell');
    const size = Math.sqrt(cells.length);
    const board = [];
    
    for (let i = 0; i < size; i++) {
        board[i] = [];
        for (let j = 0; j < size; j++) {
            const cell = cells[i * size + j];
            board[i][j] = cell.classList.contains(`team-${team.color}`) ? team.color : null;
        }
    }
    
    // Проверка горизонталей
    for (let i = 0; i < size; i++) {
        let win = true;
        for (let j = 0; j < size; j++) {
            if (board[i][j] !== team.color) {
                win = false;
                break;
            }
        }
        if (win) return true;
    }
    
    // Проверка вертикалей
    for (let j = 0; j < size; j++) {
        let win = true;
        for (let i = 0; i < size; i++) {
            if (board[i][j] !== team.color) {
                win = false;
                break;
            }
        }
        if (win) return true;
    }
    
    // Проверка диагоналей
    let win1 = true;
    let win2 = true;
    for (let i = 0; i < size; i++) {
        if (board[i][i] !== team.color) win1 = false;
        if (board[i][size - 1 - i] !== team.color) win2 = false;
    }
    
    return win1 || win2;
}

function updateTurn() {
    const turnDiv = document.getElementById('current-turn');
    if (!turnDiv) return;
    
    const currentTeam = gameEngine.teams.find(t => t.id === gameEngine.currentTurn);
    if (currentTeam) {
        turnDiv.textContent = `Ход команды ${currentTeam.color}`;
        turnDiv.style.color = getColorCode(currentTeam.color);
    }
}

function showTeamVotes(team) {
    const votesDiv = document.getElementById('team-votes');
    votesDiv.innerHTML = '<h4>Голосование:</h4>';
    
    team.players.forEach(player => {
        const vote = team.currentVotes[player.id];
        const voteText = vote ? `${String.fromCharCode(65 + vote.row)}${vote.col + 1}` : '⚪ еще не выбрал';
        
        const voteItem = document.createElement('div');
        voteItem.className = 'vote-item';
        voteItem.innerHTML = `
            <span class="player">${player.nickname}:</span>
            <span class="vote">${voteText}</span>
        `;
        votesDiv.appendChild(voteItem);
    });
}

function getColorCode(color) {
    const colors = {
        'желтый': '#f1c40f',
        'синий': '#3498db',
        'красный': '#e74c3c',
        'зеленый': '#2ecc71'
    };
    return colors[color] || '#333';
}

function spectatorView(row, col) {
    // Наблюдатель смотрит на конкретную клетку
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.style.transform = 'scale(1.2)';
    cell.style.transition = 'transform 0.3s';
    setTimeout(() => {
        cell.style.transform = 'scale(1)';
    }, 300);
}

function getCurrentPlayer() {
    // В реальном приложении нужно получать текущего игрока из сессии
    return gameEngine.players[0];
}

// Добавляем в gameEngine функцию nextTurn
gameEngine.nextTurn = function() {
    if (!this.currentTurn) {
        this.currentTurn = 1;
    } else {
        const teamIds = this.teams.map(t => t.id);
        const currentIndex = teamIds.indexOf(this.currentTurn);
        this.currentTurn = teamIds[(currentIndex + 1) % teamIds.length];
    }
    
    // Очищаем голоса
    this.teams.forEach(t => {
        t.currentVotes = {};
        t.agreedMove = null;
    });
};
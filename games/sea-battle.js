// Морской бой
let seaBattleGame = {
    playerField: Array(10).fill().map(() => Array(10).fill(null)),
    enemyField: Array(10).fill().map(() => Array(10).fill(null)),
    ships: [],
    myTurn: false,
    matchId: null,
    opponent: null,
    placementPhase: true,
    placementTime: 60,
    gameTime: 540, // 9 минут
    timer: null,
    selectedShip: null,
    shipOrientation: 'horizontal',
    myShips: [
        { size: 4, count: 1, placed: 0 },
        { size: 3, count: 2, placed: 0 },
        { size: 2, count: 3, placed: 0 },
        { size: 1, count: 4, placed: 0 }
    ],
    myPlacedShips: [],
    enemyShips: [],
    myHits: [],
    enemyHits: [],
    gameOver: false,
    gameStarted: false
};

function initSeaBattle(config) {
    console.log('🎮 Морской бой инициализирован', config);
    
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    // Очищаем canvas
    canvas.innerHTML = '';
    canvas.style.display = 'block';
    
    // Находим матч игрока
    const match = config.matches.find(m => 
        m.player1.id === currentPlayer.id || m.player2.id === currentPlayer.id
    );
    
    if (match) {
        seaBattleGame.matchId = match.id;
        seaBattleGame.opponent = match.player1.id === currentPlayer.id ? 
            match.player2.nickname : match.player1.nickname;
        seaBattleGame.myTurn = match.currentTurn === currentPlayer.id;
    }
    
    // Создаем интерфейс
    canvas.innerHTML = `
        <div class="sea-battle-container">
            <div class="placement-area" id="placement-area">
                <h3>Расстановка кораблей <span id="placement-timer">60</span>с</h3>
                <div class="ships-panel" id="ships-panel">
                    <div class="ships-list" id="ships-list">
                        ${renderShipsList()}
                    </div>
                    <button class="rotate-btn" onclick="rotateShip()">↻ Повернуть (горизонтально)</button>
                </div>
            </div>
            <div class="battlefields">
                <div class="field-container">
                    <h4>Ваше поле</h4>
                    <div class="battlefield my-field" id="my-field"></div>
                </div>
                <div class="field-container">
                    <h4>Поле противника (${seaBattleGame.opponent})</h4>
                    <div class="battlefield enemy-field" id="enemy-field"></div>
                </div>
            </div>
        </div>
    `;
    
    // Инициализируем поля
    seaBattleGame.playerField = Array(10).fill().map(() => Array(10).fill(null));
    seaBattleGame.enemyField = Array(10).fill().map(() => Array(10).fill(null));
    
    // Создаем поля
    createField('my-field', true);
    createField('enemy-field', false);
    
    // Запускаем таймер расстановки
    startPlacementTimer();
}

function renderShipsList() {
    let html = '';
    seaBattleGame.myShips.forEach((ship, index) => {
        for (let i = 0; i < ship.count - ship.placed; i++) {
            html += `<div class="ship-item" data-size="${ship.size}" data-index="${index}" draggable="true" ondragstart="dragShip(event)">`;
            for (let j = 0; j < ship.size; j++) {
                html += '🚢';
            }
            html += '</div>';
        }
    });
    return html;
}

function createField(fieldId, isMyField) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    field.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.className = 'battle-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            
            if (isMyField) {
                cell.addEventListener('dragover', (e) => e.preventDefault());
                cell.addEventListener('drop', (e) => dropShip(e, i, j));
                cell.addEventListener('mouseenter', () => highlightCell(i, j, true));
                cell.addEventListener('mouseleave', () => highlightCell(i, j, false));
            } else {
                cell.addEventListener('click', () => makeMove(i, j));
                cell.addEventListener('mouseenter', () => highlightCell(i, j, false));
                cell.addEventListener('mouseleave', () => highlightCell(i, j, false));
            }
            
            field.appendChild(cell);
        }
    }
}

function highlightCell(row, col, isMyField) {
    const fieldId = isMyField ? 'my-field' : 'enemy-field';
    const cell = document.querySelector(`#${fieldId} [data-row="${row}"][data-col="${col}"]`);
    if (cell && !cell.classList.contains('hit') && !cell.classList.contains('miss')) {
        cell.style.backgroundColor = '#5dade2';
        setTimeout(() => {
            if (!cell.classList.contains('hit') && !cell.classList.contains('miss')) {
                cell.style.backgroundColor = '';
            }
        }, 200);
    }
}

function dragShip(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.size);
    e.dataTransfer.setData('index', e.target.dataset.index);
}

function dropShip(e, row, col) {
    e.preventDefault();
    
    const size = parseInt(e.dataTransfer.getData('text/plain'));
    const shipIndex = parseInt(e.dataTransfer.getData('index'));
    
    if (canPlaceShip(row, col, size)) {
        placeShip(row, col, size, shipIndex);
    }
}

function canPlaceShip(row, col, size) {
    if (seaBattleGame.shipOrientation === 'horizontal') {
        if (col + size > 10) return false;
        for (let i = 0; i < size; i++) {
            if (seaBattleGame.playerField[row][col + i] !== null) return false;
        }
    } else {
        if (row + size > 10) return false;
        for (let i = 0; i < size; i++) {
            if (seaBattleGame.playerField[row + i][col] !== null) return false;
        }
    }
    return true;
}

function placeShip(row, col, size, shipIndex) {
    const ship = {
        row, col,
        size,
        orientation: seaBattleGame.shipOrientation,
        hits: []
    };
    
    seaBattleGame.myPlacedShips.push(ship);
    
    if (ship.orientation === 'horizontal') {
        for (let i = 0; i < size; i++) {
            seaBattleGame.playerField[row][col + i] = 'ship';
            const cell = document.querySelector(`#my-field [data-row="${row}"][data-col="${col + i}"]`);
            if (cell) cell.classList.add('ship-placed');
        }
    } else {
        for (let i = 0; i < size; i++) {
            seaBattleGame.playerField[row + i][col] = 'ship';
            const cell = document.querySelector(`#my-field [data-row="${row + i}"][data-col="${col}"]`);
            if (cell) cell.classList.add('ship-placed');
        }
    }
    
    seaBattleGame.myShips[shipIndex].placed++;
    
    // Обновляем список кораблей
    const shipsList = document.getElementById('ships-list');
    if (shipsList) {
        shipsList.innerHTML = renderShipsList();
    }
    
    checkAllShipsPlaced();
}

function rotateShip() {
    seaBattleGame.shipOrientation = seaBattleGame.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    const rotateBtn = document.querySelector('.rotate-btn');
    if (rotateBtn) {
        rotateBtn.textContent = `↻ Повернуть (${seaBattleGame.shipOrientation === 'horizontal' ? 'горизонтально' : 'вертикально'})`;
    }
}

function checkAllShipsPlaced() {
    const allPlaced = seaBattleGame.myShips.every(ship => ship.placed === ship.count);
    if (allPlaced && seaBattleGame.placementPhase) {
        setTimeout(() => {
            document.getElementById('placement-area').style.display = 'none';
            document.querySelector('.battlefields').style.width = '100%';
            startGameTimer();
            seaBattleGame.placementPhase = false;
        }, 500);
    }
}

function startPlacementTimer() {
    seaBattleGame.placementTimer = setInterval(() => {
        seaBattleGame.placementTime--;
        const timerSpan = document.getElementById('placement-timer');
        if (timerSpan) {
            timerSpan.textContent = seaBattleGame.placementTime;
        }
        
        if (seaBattleGame.placementTime <= 0) {
            clearInterval(seaBattleGame.placementTimer);
            document.getElementById('placement-area').style.display = 'none';
            document.querySelector('.battlefields').style.width = '100%';
            startGameTimer();
            seaBattleGame.placementPhase = false;
        }
    }, 1000);
}

function startGameTimer() {
    seaBattleGame.gameStarted = true;
    
    seaBattleGame.timer = setInterval(() => {
        seaBattleGame.gameTime--;
        
        const minutes = Math.floor(seaBattleGame.gameTime / 60);
        const seconds = seaBattleGame.gameTime % 60;
        const timerDisplay = document.getElementById('game-timer');
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (seaBattleGame.gameTime === 120) {
            playSound('timer_sound');
        }
        
        if (seaBattleGame.gameTime <= 0) {
            endGameByTime();
        }
    }, 1000);
}

function makeMove(row, col) {
    if (seaBattleGame.placementPhase || !seaBattleGame.myTurn || seaBattleGame.gameOver) return;
    
    const cell = document.querySelector(`#enemy-field [data-row="${row}"][data-col="${col}"]`);
    if (!cell || cell.classList.contains('hit') || cell.classList.contains('miss')) return;
    
    // Отправляем ход
    if (gameEngine) {
        gameEngine.makeMove(currentPlayer.id, seaBattleGame.matchId, { row, col });
    }
    
    // Проверяем попадание (временно рандомно)
    const isHit = Math.random() < 0.4;
    
    if (isHit) {
        cell.classList.add('hit');
        seaBattleGame.myHits.push({ row, col });
        playSound('boom_sound');
        
        // Проверяем, убит ли корабль
        if (Math.random() < 0.3) {
            cell.classList.add('killed');
            playSound('die_sound');
        }
    } else {
        cell.classList.add('miss');
        playSound('no_boom_sound');
    }
    
    seaBattleGame.myTurn = false;
    
    if (checkVictory()) {
        endGame(true);
    }
}

function checkVictory() {
    return seaBattleGame.myHits.length >= 20;
}

function endGame(win) {
    seaBattleGame.gameOver = true;
    clearInterval(seaBattleGame.timer);
    
    playSound(win ? 'win_sound' : 'lose_sound');
    
    if (win && gameEngine) {
        gameEngine.addPoints(currentPlayer.id, 40);
    }
    
    showGameResult(win);
}

function endGameByTime() {
    const myScore = seaBattleGame.myHits.length;
    const enemyScore = seaBattleGame.enemyHits.length;
    endGame(myScore > enemyScore);
}

function showGameResult(win) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'game-result';
    resultDiv.innerHTML = `
        <h2>${win ? '🏆 Победа!' : '💔 Поражение'}</h2>
        <p>Ваши попадания: ${seaBattleGame.myHits.length}</p>
        <p>Попадания противника: ${seaBattleGame.enemyHits.length}</p>
        <button onclick="closeGameResult()">Продолжить наблюдение</button>
    `;
    document.body.appendChild(resultDiv);
}

function closeGameResult() {
    document.querySelector('.game-result')?.remove();
    if (currentPlayer) {
        currentPlayer.isSpectator = true;
        updateGameInfo();
    }
}

function playSound(soundName) {
    console.log(`🔊 Звук: ${soundName}`);
    // Здесь будет реальное воспроизведение звука
}

// Делаем функции глобальными
window.initSeaBattle = initSeaBattle;
window.rotateShip = rotateShip;
window.dragShip = dragShip;
window.closeGameResult = closeGameResult;

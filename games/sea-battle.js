// Морской бой
let seaBattleGame = {
    playerField: [],
    enemyField: [],
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
        { size: 4, count: 1, placed: false },
        { size: 3, count: 2, placed: false },
        { size: 2, count: 3, placed: false },
        { size: 1, count: 4, placed: false }
    ],
    myPlacedShips: [],
    enemyShips: [],
    myHits: [],
    enemyHits: [],
    gameOver: false
};

function initSeaBattle(config) {
    console.log('🎮 Морской бой инициализирован', config);
    
    const canvas = document.getElementById('game-canvas');
    
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
                <h3>Расстановка кораблей (${seaBattleGame.placementTime}с)</h3>
                <div class="ships-panel" id="ships-panel">
                    <div class="ships-list">
                        ${renderShipsList()}
                    </div>
                    <button class="rotate-btn" onclick="rotateShip()">↻ Повернуть</button>
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
    
    // Создаем поля
    createField('my-field', true);
    createField('enemy-field', false);
    
    // Запускаем таймер расстановки
    startPlacementTimer();
}

function renderShipsList() {
    let html = '';
    seaBattleGame.myShips.forEach((ship, index) => {
        for (let i = 0; i < ship.count; i++) {
            if (!ship.placed) {
                html += `<div class="ship-item" data-size="${ship.size}" data-index="${index}" draggable="true" ondragstart="dragShip(event)">`;
                for (let j = 0; j < ship.size; j++) {
                    html += '🚢';
                }
                html += '</div>';
            }
        }
    });
    return html;
}

function createField(fieldId, isMyField) {
    const field = document.getElementById(fieldId);
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
    // Подсветка клетки при наведении
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
    // Проверка возможности размещения корабля
    if (seaBattleGame.shipOrientation === 'horizontal') {
        if (col + size > 10) return false;
        for (let i = 0; i < size; i++) {
            if (seaBattleGame.playerField[row]?.[col + i]) return false;
        }
    } else {
        if (row + size > 10) return false;
        for (let i = 0; i < size; i++) {
            if (seaBattleGame.playerField[row + i]?.[col]) return false;
        }
    }
    return true;
}

function placeShip(row, col, size, shipIndex) {
    // Размещение корабля
    const ship = {
        row, col,
        size,
        orientation: seaBattleGame.shipOrientation,
        hits: []
    };
    
    seaBattleGame.myPlacedShips.push(ship);
    
    // Обновляем поле
    if (ship.orientation === 'horizontal') {
        for (let i = 0; i < size; i++) {
            seaBattleGame.playerField[row][col + i] = 'ship';
            const cell = document.querySelector(`#my-field [data-row="${row}"][data-col="${col + i}"]`);
            cell.classList.add('ship-placed');
        }
    } else {
        for (let i = 0; i < size; i++) {
            seaBattleGame.playerField[row + i][col] = 'ship';
            const cell = document.querySelector(`#my-field [data-row="${row + i}"][data-col="${col}"]`);
            cell.classList.add('ship-placed');
        }
    }
    
    // Убираем корабль из списка
    const shipElement = document.querySelector(`[data-index="${shipIndex}"]`);
    if (shipElement) shipElement.remove();
    
    // Обновляем счетчик
    seaBattleGame.myShips[shipIndex].placed = true;
    
    // Проверяем, все ли корабли расставлены
    checkAllShipsPlaced();
}

function rotateShip() {
    seaBattleGame.shipOrientation = seaBattleGame.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
}

function checkAllShipsPlaced() {
    const allPlaced = seaBattleGame.myShips.every(ship => ship.placed);
    if (allPlaced) {
        setTimeout(() => {
            document.getElementById('placement-area').style.display = 'none';
            document.querySelector('.battlefields').style.width = '100%';
            startGameTimer();
        }, 500);
    }
}

function startPlacementTimer() {
    seaBattleGame.placementTimer = setInterval(() => {
        seaBattleGame.placementTime--;
        const timerDisplay = document.querySelector('.placement-area h3');
        if (timerDisplay) {
            timerDisplay.textContent = `Расстановка кораблей (${seaBattleGame.placementTime}с)`;
        }
        
        if (seaBattleGame.placementTime <= 0) {
            clearInterval(seaBattleGame.placementTimer);
            document.getElementById('placement-area').style.display = 'none';
            document.querySelector('.battlefields').style.width = '100%';
            startGameTimer();
        }
    }, 1000);
}

function startGameTimer() {
    seaBattleGame.placementPhase = false;
    
    seaBattleGame.timer = setInterval(() => {
        seaBattleGame.gameTime--;
        
        const minutes = Math.floor(seaBattleGame.gameTime / 60);
        const seconds = seaBattleGame.gameTime % 60;
        document.getElementById('game-timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Звук за 2 минуты до конца
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
    if (cell.classList.contains('hit') || cell.classList.contains('miss')) return;
    
    // Отправляем ход
    gameEngine.makeMove(currentPlayer.id, seaBattleGame.matchId, { row, col });
    
    // Проверяем попадание
    const isHit = Math.random() < 0.5; // Заглушка, в реальности проверять по кораблям противника
    
    if (isHit) {
        cell.classList.add('hit');
        seaBattleGame.myHits.push({ row, col });
        playSound('boom_sound');
        
        // Проверяем, убит ли корабль
        if (isShipKilled(row, col)) {
            cell.classList.add('killed');
            playSound('die_sound');
        }
    } else {
        cell.classList.add('miss');
        playSound('no_boom_sound');
    }
    
    seaBattleGame.myTurn = false;
    
    // Проверяем победу
    if (checkVictory()) {
        endGame(true);
    }
}

function isShipKilled(row, col) {
    // Заглушка - проверка убит ли корабль
    return Math.random() < 0.3;
}

function checkVictory() {
    // Заглушка - проверка победы
    return seaBattleGame.myHits.length >= 20;
}

function endGame(win) {
    seaBattleGame.gameOver = true;
    clearInterval(seaBattleGame.timer);
    
    playSound(win ? 'win_sound' : 'lose_sound');
    
    // Добавляем очки
    if (win) {
        gameEngine.addPoints(currentPlayer.id, 40);
    }
    
    // Показываем окно результата
    showGameResult(win);
}

function endGameByTime() {
    // Подсчет очков по времени
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
    // Переключаем в режим наблюдателя
    currentPlayer.isSpectator = true;
    updateGameInfo();
}

function playSound(soundName) {
    // Заглушка для звуков
    console.log(`🔊 Звук: ${soundName}`);
}

// Добавляем стили для морского боя
const seaBattleStyles = document.createElement('style');
seaBattleStyles.textContent = `
    .sea-battle-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        height: 100%;
    }
    
    .placement-area {
        background: #f0f0f0;
        padding: 15px;
        border-radius: 10px;
        text-align: center;
        transition: all 0.5s ease;
    }
    
    .ships-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }
    
    .ships-list {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        min-height: 60px;
    }
    
    .ship-item {
        padding: 8px 15px;
        background: #2c3e50;
        color: white;
        border-radius: 5px;
        cursor: move;
        font-size: 1.2em;
        user-select: none;
        display: inline-block;
    }
    
    .ship-item:hover {
        background: #34495e;
    }
    
    .rotate-btn {
        padding: 8px 20px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 1em;
    }
    
    .rotate-btn:hover {
        background: #764ba2;
    }
    
    .battlefields {
        display: flex;
        gap: 30px;
        justify-content: center;
        transition: all 0.5s ease;
    }
    
    .field-container {
        text-align: center;
    }
    
    .field-container h4 {
        margin-bottom: 10px;
        color: #333;
    }
    
    .battlefield {
        display: grid;
        grid-template-columns: repeat(10, 40px);
        gap: 2px;
        background: #1e3c72;
        padding: 10px;
        border-radius: 8px;
    }
    
    .battle-cell {
        width: 40px;
        height: 40px;
        background: #3498db;
        border: 1px solid #2980b9;
        cursor: pointer;
        transition: background 0.2s;
        border-radius: 3px;
    }
    
    .battle-cell:hover {
        background: #5dade2;
    }
    
    .battle-cell.ship-placed {
        background: #27ae60;
    }
    
    .battle-cell.hit {
        background: #e74c3c;
        cursor: not-allowed;
        position: relative;
    }
    
    .battle-cell.hit::after {
        content: '✕';
        color: white;
        font-size: 1.2em;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    
    .battle-cell.hit.killed {
        background: #f39c12;
    }
    
    .battle-cell.miss {
        background: #95a5a6;
        cursor: not-allowed;
        position: relative;
    }
    
    .battle-cell.miss::after {
        content: '•';
        color: white;
        font-size: 1.5em;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    
    .game-result {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px 50px;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        text-align: center;
        z-index: 11000;
        animation: slideIn 0.3s ease;
    }
    
    .game-result h2 {
        font-size: 2em;
        margin-bottom: 20px;
        color: #333;
    }
    
    .game-result p {
        margin: 10px 0;
        font-size: 1.2em;
    }
    
    .game-result button {
        margin-top: 20px;
        padding: 10px 30px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-size: 1.1em;
    }
    
    @media (max-width: 1024px) {
        .battlefield {
            grid-template-columns: repeat(10, 30px);
        }
        .battle-cell {
            width: 30px;
            height: 30px;
        }
    }
`;

document.head.appendChild(seaBattleStyles);

// Делаем функции глобальными
window.rotateShip = rotateShip;
window.dragShip = dragShip;

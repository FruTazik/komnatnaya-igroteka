// Морской бой
function initSeaBattle(config) {
    console.log('Инициализация морского боя', config);
    
    const canvas = document.getElementById('game-canvas');
    canvas.innerHTML = `
        <div class="sea-battle-container">
            <div class="battlefield">
                <div class="player-field" id="player-field"></div>
                <div class="enemy-field" id="enemy-field"></div>
            </div>
            <div class="ship-placement" id="ship-placement" style="display: none;">
                <h3>Расстановка кораблей</h3>
                <div class="ships-list" id="ships-list"></div>
                <button onclick="rotateShip()">🔄 Повернуть</button>
            </div>
        </div>
    `;
    
    // Создаем поля 10x10
    createBattleField('player-field');
    createBattleField('enemy-field');
    
    // Показываем расстановку только для игроков (не наблюдателей)
    if (!config.spectators.includes(getCurrentPlayer())) {
        document.getElementById('ship-placement').style.display = 'block';
        showShipsToPlace();
    }
}

function createBattleField(fieldId) {
    const field = document.getElementById(fieldId);
    field.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            const cell = document.createElement('div');
            cell.className = 'battle-cell';
            cell.dataset.x = i;
            cell.dataset.y = j;
            cell.onclick = () => cellClick(fieldId, i, j);
            field.appendChild(cell);
        }
    }
}

function cellClick(fieldId, x, y) {
    const currentPlayer = getCurrentPlayer();
    
    if (currentPlayer.isSpectator) {
        // Наблюдатель переключает вид
        spectatorSwitchView(currentPlayer, x, y);
        return;
    }
    
    // Игрок голосует за ход
    const team = gameEngine.teams.find(t => t.players.includes(currentPlayer));
    if (team) {
        const allAgreed = gameEngine.voteForMove(team.id, currentPlayer.id, {x, y, field: fieldId});
        
        if (allAgreed) {
            // Все в команде согласны, делаем ход
            makeMove(team.agreedMove);
        } else {
            // Показываем, кто за какой ход голосует
            showVotes(team);
        }
    }
}

function showVotes(team) {
    // Подсвечиваем клетки, за которые голосуют игроки
    Object.entries(team.currentVotes).forEach(([playerId, move]) => {
        const player = gameEngine.players.find(p => p.id == playerId);
        // Подсветка на поле
    });
}

function makeMove(move) {
    console.log('Делаем ход:', move);
    // Логика хода в морском бое
}

function rotateShip() {
    // Поворот корабля при расстановке
    console.log('Поворот корабля');
}

function showShipsToPlace() {
    const shipsList = document.getElementById('ships-list');
    shipsList.innerHTML = '';
    
    const ships = [
        {size: 4, count: 1},
        {size: 3, count: 2},
        {size: 2, count: 3},
        {size: 1, count: 4}
    ];
    
    ships.forEach(ship => {
        for (let i = 0; i < ship.count; i++) {
            const shipEl = document.createElement('div');
            shipEl.className = 'ship-to-place';
            shipEl.innerHTML = '🚢'.repeat(ship.size);
            shipEl.draggable = true;
            shipsList.appendChild(shipEl);
        }
    });
}

function getCurrentPlayer() {
    // В реальности нужно получать текущего игрока из сессии
    return gameEngine.players[0];
}
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
    
    for (let i = 0; i < 10; i

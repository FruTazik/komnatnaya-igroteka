// Карусель игр
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.games-container');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            container.scrollBy({
                left: -200,
                behavior: 'smooth'
            });
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            container.scrollBy({
                left: 200,
                behavior: 'smooth'
            });
        });
    }
    
    // Клик по карточке игры (пока просто подсветка)
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', function() {
            gameCards.forEach(c => c.style.transform = 'scale(1)');
            this.style.transform = 'scale(1.05)';
        });
    });
});
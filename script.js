// Карусель игр
document.addEventListener('DOMContentLoaded', function() {
    const container = document.querySelector('.games-container');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            container.scrollBy({ left: -200, behavior: 'smooth' });
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            container.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }
    
    // Клик по карточке игры
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.game-card').forEach(c => c.style.transform = 'scale(1)');
            this.style.transform = 'scale(1.05)';
        });
    });
    
    console.log('index.js загружен');
});

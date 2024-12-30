

export function setupEventListeners(startNewGame) {
    document.getElementById('startButton').addEventListener('click', function () {
        startNewGame();
    });

    document.getElementById('endStartButton').addEventListener('click', function () {
        const endScreen = document.getElementById('endScreen');
        const endText = document.getElementById('endText');
        endScreen.style.display = 'none';
        endText.style.display = 'none';

        startNewGame();
    });

    document.getElementById('continueButton').addEventListener('click', function () {
        document.getElementById('menu').style.display = 'none';
        document.getElementById('menuButton').style.display = 'block';
        const timerDiv = document.getElementById('timer');
        if (timerDiv) {
            timerDiv.style.display = 'flex';
            timerDiv.style.backgroundColor = '#ffffff';
            timerDiv.style.color = '#000000';
        }
    });

    document.getElementById('controlsButton').addEventListener('click', function () {
        const controlsDiv = document.getElementById('controls');
        if (controlsDiv) {
            controlsDiv.style.display = 'flex';
        }
    });

    document.getElementById('backToMenuButton')?.addEventListener('click', function () {
        const controlsDiv = document.getElementById('controls');
        if (controlsDiv) {
            controlsDiv.style.display = 'none';
        }
    });

    document.getElementById('menuButton').addEventListener('click', function () {
        document.getElementById('continueButton').style.display = 'block';
        const menu = document.getElementById('menu');
        const menuButton = document.getElementById('menuButton');
        const timerDiv = document.getElementById('timer');
        if (timerDiv) {
            timerDiv.style.backgroundColor = '#000000';
            timerDiv.style.color = '#ffffff';
        }

        if (menu.style.display === 'none' || menu.style.display === '') {
            menu.style.display = 'flex';
            menuButton.style.display = 'none';
        }
    });
}





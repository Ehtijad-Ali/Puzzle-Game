// --- Game State Variables ---
let currentMode = 'logic';
let logicBoard = [];
let logicSolution = [];
let selectedLogicCell = null;
let imageTiles = [];
let emptyTileIndex = 15;
let moves = 0;
let errors = 0;
let timerInterval = null;
let seconds = 0;
let difficulty = 'easy';
let uploadedImageSrc = '';

const difficultyLevels = {
    easy: 8,
    medium: 6,
    hard: 4
};

// --- DOM Elements ---
const logicBoardElement = document.getElementById('sudoku-board');
const imageBoardElement = document.getElementById('image-board');
const timerElement = document.getElementById('timer');
const imageTimerElement = document.getElementById('image-timer');
const errorsElement = document.getElementById('errors');
const movesElement = document.getElementById('moves');
const messageArea = document.getElementById('message-area');
const summaryModal = document.getElementById('summary-modal');
const imageUploadInput = document.getElementById('image-upload');
const modeSwitcher = document.querySelector('.mode-switcher'); // Get the switcher element

// --- Core Game Logic ---

function initGame() {
    setupEventListeners();
    startNewLogicGame();
}

function setupEventListeners() {
    // Mode switcher
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    // Logic Puzzle listeners
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.classList.add('puzzle-cell', 'logic-cell');
        cell.dataset.index = i;
        cell.addEventListener('click', () => selectLogicCell(cell));
        logicBoardElement.appendChild(cell);
    }
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => inputNumber(btn.dataset.number));
    });
    document.querySelectorAll('#logic-mode .control-btn').forEach(btn => {
        if (btn.classList.contains('new-game')) {
            btn.addEventListener('click', startNewLogicGame);
        } else if (btn.classList.contains('hint')) {
            btn.addEventListener('click', getHint);
        } else if (btn.classList.contains('clear')) {
            btn.addEventListener('click', clearUserInputs);
        }
    });
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => setDifficulty(btn.dataset.level));
    });

    // Image Puzzle listeners
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.classList.add('puzzle-cell', 'image-cell');
        cell.dataset.index = i;
        cell.addEventListener('click', () => moveTile(i));
        imageBoardElement.appendChild(cell);
    }
    imageUploadInput.addEventListener('change', handleImageUpload);
    document.getElementById('new-image-game').addEventListener('click', shuffleImageTiles);
}

function switchMode(mode) {
    if (currentMode === mode) return;

    const currentModeElement = document.getElementById(`${currentMode}-mode`);
    const newModeElement = document.getElementById(`${mode}-mode`);

    // Update the custom property for the sliding indicator
    const slidePos = mode === 'image' ? 1 : 0;
    modeSwitcher.style.setProperty('--slide-pos', slidePos);

    // Animate out the current mode
    currentModeElement.classList.remove('active');

    // Switch active state on buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Animate in the new mode after a short delay
    setTimeout(() => {
        currentMode = mode;
        newModeElement.classList.add('active');
    }, 300); // This delay should match the CSS transition duration

    stopTimer();
    seconds = 0;
    moves = 0;
    errors = 0;
    movesElement.textContent = '0';
    errorsElement.textContent = '0';
    messageArea.textContent = '';
    
    if (mode === 'logic') {
        startNewLogicGame();
    } else {
        if (uploadedImageSrc) {
            renderImageBoard();
            messageArea.textContent = 'Click a tile next to the empty space to move it.';
        } else {
            messageArea.textContent = 'Upload an image to start the puzzle.';
        }
    }
}

// --- Logic Puzzle Functions ---
function startNewLogicGame() {
    resetLogicGame();
    generatePuzzle();
    renderLogicBoard();
    startTimer();
    messageArea.textContent = 'Good luck!';
}

function resetLogicGame() {
    errors = 0;
    seconds = 0;
    errorsElement.textContent = '0';
    timerElement.textContent = '00:00';
    stopTimer();
    selectedLogicCell = null;
    logicBoardElement.querySelectorAll('.puzzle-cell').forEach(cell => {
        cell.classList.remove('selected', 'related', 'error', 'correct', 'user-input', 'clue');
        cell.textContent = '';
    });
    logicBoardElement.classList.remove('won');
}

function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === level);
    });
    startNewLogicGame();
}

function generateSolution() {
    const sol = Array.from({ length: 4 }, () => Array(4).fill(0));
    function isValid(num, row, col) {
        for (let i = 0; i < 4; i++) {
            if (sol[row][i] === num || sol[i][col] === num) return false;
        }
        const boxRow = Math.floor(row / 2) * 2;
        const boxCol = Math.floor(col / 2) * 2;
        for (let i = boxRow; i < boxRow + 2; i++) {
            for (let j = boxCol; j < boxCol + 2; j++) {
                if (sol[i][j] === num) return false;
            }
        }
        return true;
    }
    function solve() {
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                if (sol[row][col] === 0) {
                    const numbers = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
                    for (const num of numbers) {
                        if (isValid(num, row, col)) {
                            sol[row][col] = num;
                            if (solve()) return true;
                            sol[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    solve();
    return sol;
}

function generatePuzzle() {
    logicSolution = generateSolution();
    logicBoard = logicSolution.map(row => [...row]);
    const cluesToShow = difficultyLevels[difficulty];
    const cellsToRemove = 16 - cluesToShow;
    let removed = 0;
    while (removed < cellsToRemove) {
        const row = Math.floor(Math.random() * 4);
        const col = Math.floor(Math.random() * 4);
        if (logicBoard[row][col] !== 0) {
            logicBoard[row][col] = 0;
            removed++;
        }
    }
}

function renderLogicBoard() {
    const cells = logicBoardElement.querySelectorAll('.puzzle-cell');
    cells.forEach((cell, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const value = logicBoard[row][col];
        cell.textContent = value !== 0 ? value : '';
        cell.classList.remove('user-input', 'clue', 'error', 'correct');
        if (value !== 0) {
            cell.classList.add('clue');
        } else {
            cell.classList.add('user-input');
        }
    });
}

function selectLogicCell(cell) {
    if (cell.classList.contains('clue')) return;
    logicBoardElement.querySelectorAll('.puzzle-cell').forEach(c => {
        c.classList.remove('selected', 'related');
    });
    selectedLogicCell = cell;
    cell.classList.add('selected');
    const index = parseInt(cell.dataset.index);
    const row = Math.floor(index / 4);
    const col = index % 4;
    const boxRow = Math.floor(row / 2) * 2;
    const boxCol = Math.floor(col / 2) * 2;
    logicBoardElement.querySelectorAll('.puzzle-cell').forEach((c, i) => {
        const r = Math.floor(i / 4);
        const cl = i % 4;
        if (r === row || cl === col || (r >= boxRow && r < boxRow + 2 && cl >= boxCol && cl < boxCol + 2)) {
            c.classList.add('related');
        }
    });
}

function inputNumber(number) {
    if (!selectedLogicCell || selectedLogicCell.classList.contains('clue')) return;
    const index = parseInt(selectedLogicCell.dataset.index);
    const row = Math.floor(index / 4);
    const col = index % 4;
    const correctValue = logicSolution[row][col];
    selectedLogicCell.textContent = number;
    logicBoard[row][col] = parseInt(number, 10);
    if (parseInt(number, 10) === correctValue) {
        selectedLogicCell.classList.remove('error');
        selectedLogicCell.classList.add('correct');
        setTimeout(() => selectedLogicCell.classList.remove('correct'), 600);
    } else {
        selectedLogicCell.classList.add('error');
        errors++;
        errorsElement.textContent = errors;
        setTimeout(() => selectedLogicCell.classList.remove('error'), 500);
    }
    checkLogicWin();
}

function clearUserInputs() {
    logicBoardElement.querySelectorAll('.puzzle-cell.user-input').forEach(cell => {
        const index = parseInt(cell.dataset.index);
        const row = Math.floor(index / 4);
        const col = index % 4;
        logicBoard[row][col] = 0;
        cell.textContent = '';
        cell.classList.remove('error', 'correct');
    });
    messageArea.textContent = 'Board cleared.';
}

function getHint() {
    const emptyCells = [];
    logicBoardElement.querySelectorAll('.puzzle-cell.user-input').forEach(cell => {
        if (!cell.textContent) {
            emptyCells.push(cell);
        }
    });
    if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const index = parseInt(randomCell.dataset.index);
        const row = Math.floor(index / 4);
        const col = index % 4;
        const correctValue = logicSolution[row][col];
        inputNumber(correctValue.toString());
        messageArea.textContent = 'Hint used!';
    } else {
        messageArea.textContent = 'No empty cells for a hint.';
    }
}

function checkLogicWin() {
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            if (logicBoard[row][col] !== logicSolution[row][col]) {
                return false;
            }
        }
    }
    logicBoardElement.classList.add('won');
    onGameWon('Logic Puzzle');
    return true;
}

// --- Image Puzzle Functions ---
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        imageBoardElement.classList.add('loading');
        messageArea.textContent = 'Processing image...';
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageSrc = e.target.result;
            initializeImagePuzzle();
            imageBoardElement.classList.remove('loading');
        };
        reader.readAsDataURL(file);
    } else {
        messageArea.textContent = 'Please upload a valid image file.';
    }
}

function initializeImagePuzzle() {
    imageTiles = [...Array(16).keys()];
    emptyTileIndex = 15;
    moves = 0;
    movesElement.textContent = '0';
    renderImageBoard();
    shuffleImageTiles();
    messageArea.textContent = 'Click a tile next to the empty space to move it.';
}

function renderImageBoard() {
    const cells = imageBoardElement.querySelectorAll('.puzzle-cell');
    cells.forEach((cell, index) => {
        cell.classList.remove('empty');
        const tileValue = imageTiles[index];
        if (tileValue === 15) {
            cell.style.backgroundImage = '';
            cell.classList.add('empty');
        } else {
            const row = Math.floor(tileValue / 4);
            const col = tileValue % 4;
            cell.style.backgroundImage = `url(${uploadedImageSrc})`;
            cell.style.backgroundPosition = `${-col * 100}% ${-row * 100}%`;
        }
    });
}

function shuffleImageTiles() {
    if (!uploadedImageSrc) {
        messageArea.textContent = 'Please upload an image first.';
        return;
    }
    stopTimer();
    seconds = 0;
    moves = 0;
    movesElement.textContent = '0';
    imageBoardElement.classList.remove('won');

    // Perform a large number of random valid moves to ensure solvability
    for (let i = 0; i < 200; i++) {
        const adjacentIndices = getAdjacentIndices(emptyTileIndex);
        const randomIndex = adjacentIndices[Math.floor(Math.random() * adjacentIndices.length)];
        swapTiles(emptyTileIndex, randomIndex, false);
    }
    renderImageBoard();
    startTimer();
}

function getAdjacentIndices(index) {
    const adjacent = [];
    const row = Math.floor(index / 4);
    const col = index % 4;
    if (row > 0) adjacent.push(index - 4); // Up
    if (row < 3) adjacent.push(index + 4); // Down
    if (col > 0) adjacent.push(index - 1); // Left
    if (col < 3) adjacent.push(index + 1); // Right
    return adjacent;
}

function moveTile(index) {
    if (isAdjacent(index, emptyTileIndex)) {
        swapTiles(index, emptyTileIndex, true);
        emptyTileIndex = index;
        moves++;
        movesElement.textContent = moves;
        renderImageBoard();
        checkImageWin();
    }
}

function isAdjacent(index1, index2) {
    const row1 = Math.floor(index1 / 4);
    const col1 = index1 % 4;
    const row2 = Math.floor(index2 / 4);
    const col2 = index2 % 4;
    return (Math.abs(row1 - row2) === 1 && col1 === col2) || (Math.abs(col1 - col2) === 1 && row1 === row2);
}

function swapTiles(index1, index2, animate = false) {
    const temp = imageTiles[index1];
    imageTiles[index1] = imageTiles[index2];
    imageTiles[index2] = temp;
}

function checkImageWin() {
    for (let i = 0; i < 16; i++) {
        if (imageTiles[i] !== i) {
            return false;
        }
    }
    imageBoardElement.classList.add('won');
    onGameWon('Image Puzzle');
    return true;
}

// --- Common Game Functions ---
function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timeString = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        timerElement.textContent = timeString;
        imageTimerElement.textContent = timeString;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function onGameWon(mode) {
    stopTimer();
    messageArea.textContent = '🎉 Puzzle Solved! 🎉';
    showSummaryModal(mode);
}

function showSummaryModal(mode) {
    const timeString = timerElement.textContent;
    document.getElementById('summary-time').textContent = timeString;

    if (mode === 'Logic Puzzle') {
        document.getElementById('summary-stat-label').innerHTML = 'Total Errors: <span id="summary-stat-value"></span>';
        document.getElementById('summary-stat-value').textContent = errors;
        document.getElementById('summary-difficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    } else {
        document.getElementById('summary-stat-label').innerHTML = 'Total Moves: <span id="summary-stat-value"></span>';
        document.getElementById('summary-stat-value').textContent = moves;
        document.getElementById('summary-difficulty').textContent = 'Custom';
    }

    summaryModal.classList.add('show');
}

function closeSummaryModal() {
    summaryModal.classList.remove('show');
    if (currentMode === 'logic') {
        startNewLogicGame();
    } else {
        shuffleImageTiles();
    }
}

// --- Start the Game on Page Load ---
document.addEventListener('DOMContentLoaded', initGame);
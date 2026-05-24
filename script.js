/* ================================================================
   CONNECT 4 · script.js
   ================================================================ */
'use strict';

/* ── Constants ──────────────────────────────────────────────────── */
const ROWS  = 6;
const COLS  = 7;
const EMPTY = 0;
const P1    = 1;
const P2    = 2;

/* ── DOM helpers ────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── DOM refs ───────────────────────────────────────────────────── */
const setupPanel          = $('setupPanel');
const gameArea            = $('gameArea');
const boardEl             = $('board');
const colArrowsEl         = $('colArrows');
const turnIndicator       = $('turnIndicator');
const turnDot             = $('turnDot');
const turnText            = $('turnText');
const winOverlay          = $('winOverlay');
const winnerName          = $('winnerName');
const confettiBox         = $('confettiBox');
const p1Input             = $('p1Name');
const p2Input             = $('p2Name');
const startBtn            = $('startBtn');
const resetBtn            = $('resetBtn');
const homeBtn             = $('homeBtn');
const overlayPlayAgainBtn = $('overlayPlayAgainBtn');
const overlayHomeBtn      = $('overlayHomeBtn');
const themeToggleBtn      = $('themeToggle');
const sidebarToggle       = $('sidebarToggle');
const gameSidebar         = document.querySelector('.game-sidebar');

/* ── Game state ─────────────────────────────────────────────────── */
let board         = [];
let currentPlayer = P1;
let playerNames   = ['Player 1', 'Player 2'];
let gameOver      = false;
let moveCount     = 0;

/* ================================================================
   Theme
   ================================================================ */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggleBtn.textContent = theme === 'light' ? '🌙' : '☀️';
  themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
  localStorage.setItem('connect4-theme', theme);
}
setTheme(localStorage.getItem('connect4-theme') || 'light');
themeToggleBtn.addEventListener('click', () => {
  setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
});

/* ================================================================
   Sidebar collapse / expand
   ================================================================ */
sidebarToggle.addEventListener('click', () => {
  const collapsed = gameSidebar.classList.toggle('collapsed');
  sidebarToggle.textContent    = collapsed ? '▶' : '◀';
  sidebarToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
});

function resetSidebar() {
  gameSidebar.classList.remove('collapsed');
  sidebarToggle.textContent = '◀';
  sidebarToggle.setAttribute('aria-label', 'Collapse sidebar');
}

/* ================================================================
   Board setup
   ================================================================ */
function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
}

function buildBoardDOM() {
  boardEl.innerHTML = colArrowsEl.innerHTML = '';

  for (let c = 0; c < COLS; c++) {
    const arrow = document.createElement('div');
    arrow.className   = 'col-arrow';
    arrow.textContent = '▼';
    arrow.dataset.col = c;
    arrow.addEventListener('click', () => handleDrop(c));
    colArrowsEl.appendChild(arrow);
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${r + 1}, Column ${c + 1}`);
      cell.addEventListener('click',      () => handleDrop(c));
      cell.addEventListener('mouseenter', () => highlightColumn(c, true));
      cell.addEventListener('mouseleave', () => highlightColumn(c, false));
      boardEl.appendChild(cell);
    }
  }
}

/* ================================================================
   Game lifecycle
   ================================================================ */
function startGame(keepNames = false) {
  if (!keepNames) {
    playerNames = [
      p1Input.value.trim() || 'Player 1',
      p2Input.value.trim() || 'Player 2',
    ];
  }
  setupPanel.classList.add('hidden');
  gameArea.classList.remove('hidden');
  document.body.classList.add('game-active');

  board = createBoard();
  currentPlayer = P1;
  gameOver  = false;
  moveCount = 0;

  buildBoardDOM();
  updateTurnUI();
}

function resetGame() {
  board = createBoard();
  currentPlayer = P1;
  gameOver  = false;
  moveCount = 0;

  document.querySelectorAll('.cell').forEach(cell => {
    cell.innerHTML = '';
    cell.classList.remove('col-hover');
  });
  document.querySelectorAll('.col-arrow').forEach(a => a.classList.remove('hovered'));

  winOverlay.classList.remove('active');
  winOverlay.setAttribute('aria-hidden', 'true');
  confettiBox.innerHTML = '';
  updateTurnUI();
}

function returnToSetup() {
  winOverlay.classList.remove('active');
  winOverlay.setAttribute('aria-hidden', 'true');
  gameArea.classList.add('hidden');
  setupPanel.classList.remove('hidden');
  document.body.classList.remove('game-active');
  resetSidebar();

  p1Input.value = playerNames[0] !== 'Player 1' ? playerNames[0] : '';
  p2Input.value = playerNames[1] !== 'Player 2' ? playerNames[1] : '';
}

/* ================================================================
   Drop logic
   ================================================================ */
function handleDrop(col) {
  if (gameOver) return;
  const row = getLowestRow(col);
  if (row === -1) return;

  board[row][col] = currentPlayer;
  moveCount++;
  renderChip(row, col, currentPlayer);

  const winLine = checkWin(row, col, currentPlayer);
  if (winLine) { handleWin(winLine); return; }
  if (moveCount === ROWS * COLS) { handleDraw(); return; }

  currentPlayer = currentPlayer === P1 ? P2 : P1;
  updateTurnUI();
}

function getLowestRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) return r;
  }
  return -1;
}

function renderChip(row, col, player) {
  const cell     = getCellEl(row, col);
  const cellUnit = getCellUnit();
  const chip     = document.createElement('div');
  chip.classList.add('chip', player === P1 ? 'p1' : 'p2');
  chip.style.setProperty('--drop-from', `-${Math.round((row + 1) * cellUnit)}px`);
  cell.appendChild(chip);
}

function getCellEl(row, col) {
  return boardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function getCellUnit() {
  const s = getComputedStyle(document.documentElement);
  return (parseInt(s.getPropertyValue('--cell-size'), 10) || 68)
       + (parseInt(s.getPropertyValue('--cell-gap'),  10) || 10);
}

/* ================================================================
   Win detection
   ================================================================ */
function checkWin(row, col, player) {
  for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    const line = getLine(row, col, dr, dc, player);
    if (line.length >= 4) return line;
  }
  return null;
}

function getLine(r0, c0, dr, dc, player) {
  const cells = [[r0, c0]];
  for (let d = -1; d <= 1; d += 2) {
    for (let i = 1; i < 4; i++) {
      const r = r0 + dr * d * i, c = c0 + dc * d * i;
      if (!inBounds(r, c) || board[r][c] !== player) break;
      cells.push([r, c]);
    }
  }
  return cells;
}

function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

/* ================================================================
   Win / draw handlers
   ================================================================ */
function handleWin(winCells) {
  gameOver = true;
  winCells.forEach(([r, c]) => getCellEl(r, c).querySelector('.chip')?.classList.add('winner'));

  setTimeout(() => {
    winnerName.textContent = playerNames[currentPlayer - 1];
    winnerName.style.color = currentPlayer === P1 ? 'var(--chip-p1)' : 'var(--chip-p2)';
    spawnConfetti();
    winOverlay.classList.add('active');
    winOverlay.setAttribute('aria-hidden', 'false');
    overlayPlayAgainBtn.focus();
  }, 680);
}

function handleDraw() {
  gameOver = true;
  turnDot.style.background = 'var(--text-muted)';
  turnDot.style.boxShadow  = 'none';
  turnText.style.color     = 'var(--text-sec)';
  turnText.textContent     = "It's a draw! 🤝";
  turnIndicator.style.borderColor = 'var(--border)';
}

/* ================================================================
   UI helpers
   ================================================================ */
function updateTurnUI() {
  const name        = playerNames[currentPlayer - 1];
  const dotColor    = currentPlayer === P1 ? 'var(--chip-p1)'    : 'var(--chip-p2)';
  const edgeVar     = currentPlayer === P1 ? 'var(--chip-p1-lo)' : 'var(--chip-p2-lo)';
  const borderColor = currentPlayer === P1 ? 'rgba(255,87,87,0.40)' : 'rgba(62,204,106,0.40)';

  turnDot.style.background        = dotColor;
  turnDot.style.boxShadow         = `0 2px 0 ${edgeVar}, inset 0 -2px 3px rgba(0,0,0,0.18), inset 0 2px 4px rgba(255,255,255,0.28)`;
  turnText.style.color            = dotColor;
  turnText.textContent            = `${name}'s turn!`;
  turnIndicator.style.borderColor = borderColor;
}

function highlightColumn(col, on) {
  if (gameOver) return;
  for (let r = 0; r < ROWS; r++) {
    if (board[r][col] === EMPTY) getCellEl(r, col)?.classList.toggle('col-hover', on);
  }
  colArrowsEl.children[col]?.classList.toggle('hovered', on);
}

/* ================================================================
   Confetti
   ================================================================ */
function spawnConfetti() {
  const colors = ['#FF5757','#FFAAAA','#3ECC6A','#8EEAA8','#4A9EFF','#90C8FF','#FFD700','#FFB347'];
  confettiBox.innerHTML = '';
  for (let i = 0; i < 54; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 5 + Math.random() * 7;
    p.style.cssText = `
      left:${Math.random()*100}%; top:${Math.random()*30-8}%;
      width:${size}px; height:${size}px;
      border-radius:${Math.random()>0.45?'50%':'3px'};
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${0.6+Math.random()*1.1}s;
      animation-delay:${Math.random()*0.5}s;
    `;
    confettiBox.appendChild(p);
  }
}

/* ================================================================
   Event listeners
   ================================================================ */
startBtn.addEventListener('click', () => startGame(false));
[p1Input, p2Input].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') startGame(false); }));

resetBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to restart the current game?')) resetGame();
});
overlayPlayAgainBtn.addEventListener('click', resetGame);

homeBtn.addEventListener('click', () => {
  if (confirm('Go home? Your current game will be lost.')) returnToSetup();
});
overlayHomeBtn.addEventListener('click', returnToSetup);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && winOverlay.classList.contains('active')) resetGame();
});

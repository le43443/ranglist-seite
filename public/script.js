let playerName = null;
const totalHoles = 18;
let scores = Array(totalHoles).fill(0);

const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const finishedScreen = document.getElementById('finished-screen'); // Neu: fertiger Bildschirm
const playerInput = document.getElementById('player-input');
const startBtn = document.getElementById('start-btn');
const logoutBtn = document.getElementById('logout-btn');

const scoreTableBody = document.querySelector('#score-table tbody');
const submitScoresBtn = document.getElementById('submit-scores-btn');

const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
const playerDisplay = document.getElementById('player-name');

let leaderboardInterval = null;
let lastLeaderboardOrder = []; // Für Animation beim Platzwechsel

// UI Funktionen
function showScreen(screen) {
  loginScreen.classList.remove('active');
  mainScreen.classList.remove('active');
  if (finishedScreen) finishedScreen.classList.remove('active'); // Falls existiert
  screen.classList.add('active');
}

function initScoreTable() {
  scoreTableBody.innerHTML = '';
  for (let i = 0; i < totalHoles; i++) {
    const tr = document.createElement('tr');
    const tdHole = document.createElement('td');
    tdHole.textContent = i + 1;

    const tdInput = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '15';
    input.value = scores[i];
    input.dataset.hole = i;
    input.autocomplete = 'off';
    input.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      scores[e.target.dataset.hole] = isNaN(val) ? 0 : val;

      // Wenn alle Bahnen ausgefüllt (kein 0), zeige Fertig-Bildschirm
      if (scores.every(s => s > 0)) {
        showFinishedScreen();
      }
    });
    tdInput.appendChild(input);

    tr.appendChild(tdHole);
    tr.appendChild(tdInput);
    scoreTableBody.appendChild(tr);
  }
}

function updateLeaderboard(data) {
  // Animation: check für Platzwechsel
  const oldOrder = lastLeaderboardOrder.map(p => p.name);
  const newOrder = data.map(p => p.name);

  leaderboardTableBody.innerHTML = '';

  data.forEach((item, index) => {
    const tr = document.createElement('tr');

    if (index === 0) tr.classList.add('first-place');
    else if (index === 1) tr.classList.add('second-place');
    else if (index === 2) tr.classList.add('third-place');

    const rankTd = document.createElement('td');
    rankTd.textContent = index + 1;
    const nameTd = document.createElement('td');
    nameTd.textContent = item.name;
    const strokesTd = document.createElement('td');
    strokesTd.textContent = item.strokes;

    tr.appendChild(rankTd);
    tr.appendChild(nameTd);
    tr.appendChild(strokesTd);

    leaderboardTableBody.appendChild(tr);

    // Prüfe ob sich Platz geändert hat (Name an anderer Position)
    const oldIndex = oldOrder.indexOf(item.name);
    if (oldIndex !== -1 && oldIndex !== index) {
      // Animation: kurz Highlight und bewegen
      tr.classList.add('moved');
      setTimeout(() => tr.classList.remove('moved'), 1500);
    }
  });

  lastLeaderboardOrder = data;
}

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) throw new Error('Fetch leaderboard failed');
    const data = await res.json();
    updateLeaderboard(data);
  } catch (err) {
    console.error('Leaderboard Error:', err);
  }
}

function startLeaderboardPolling() {
  if (leaderboardInterval) clearInterval(leaderboardInterval);
  fetchLeaderboard();
  leaderboardInterval = setInterval(fetchLeaderboard, 2000); // alle 2 Sekunden
}

// Fertig-Bildschirm anzeigen
function showFinishedScreen() {
  alert('Alle Bahnen ausgefüllt! Du kannst jetzt deine Schläge absenden.');
  // Oder du machst hier z.B. showScreen(finishedScreen);
  // Wenn du möchtest, kann ich dir den HTML-Code für finishedScreen machen.
}

// Events

startBtn.addEventListener('click', () => {
  const name = playerInput.value.trim();
  if (name.length < 2) {
    alert('Bitte gib einen gültigen Namen ein (mindestens 2 Zeichen).');
    return;
  }
  playerName = name;
  localStorage.setItem('golfPlayerName', playerName);
  login();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('golfPlayerName');
  playerName = null;
  scores = Array(totalHoles).fill(0);
  showScreen(loginScreen);
  playerInput.value = '';
  if (leaderboardInterval) clearInterval(leaderboardInterval);
});

submitScoresBtn.addEventListener('click', async () => {
  if (!playerName) return;
  // Scores validieren
  if (scores.some(s => s < 0 || s > 15)) {
    alert('Bitte gültige Schläge zwischen 0 und 15 eingeben.');
    return;
  }
  if (scores.some(s => s === 0)) {
    alert('Bitte trage für alle Bahnen Schläge ein.');
    return;
  }
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName, strokes: scores.reduce((a,b) => a+b, 0) }),
    });
    if (!res.ok) throw new Error('Fehler beim Absenden der Schläge');
    alert('Schläge erfolgreich gespeichert!');
    fetchLeaderboard();
  } catch (err) {
    alert('Fehler beim Absenden der Schläge: ' + err.message);
  }
});

// Automatisch login laden, falls gespeichert
function autoLogin() {
  const savedName = localStorage.getItem('golfPlayerName');
  if (savedName) {
    playerName = savedName;
    login();
  } else {
    showScreen(loginScreen);
  }
}

function login() {
  playerDisplay.textContent = playerName;
  initScoreTable();
  fetchLeaderboard();
  startLeaderboardPolling();
  showScreen(mainScreen);
}

// Start
autoLogin();

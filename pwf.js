// === Variables globales ===
let timer = null, currentLevelIndex = 0, timeLeft = 0, isPaused = true, clockRunning = false, clockSyncTimeout = null;
let colorSettings = [];
let colorDefault = "#933557";
let leaderboardData = {};
let allTournaments = [];
let leaderboardSortCol = 2;
let leaderboardSortAsc = false;

// === Onglets ===
function showTab(tabName, evt) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('is-active'));
    document.querySelectorAll('.tabs li').forEach(li => li.classList.remove('is-active'));
    document.getElementById(tabName + 'Tab').classList.add('is-active');
    evt.currentTarget.classList.add('is-active');
}

// === Gestion des niveaux/pauses ===
function addLevelRow(sb = '', bb = '', ante = '', duration = '', type = 'niveau') {
    const tbody = document.getElementById('levelsBody');
    const tr = document.createElement('tr');
    tr.className = (type === "pause") ? "pause-row" : "";
    tr.innerHTML = `
        <td class="param-level-num"></td>
        <td>
            <select class="input" onchange="onChangeLevelType(this)">
                <option value="niveau"${type === "niveau" ? " selected" : ""}>Niveau</option>
                <option value="pause"${type === "pause" ? " selected" : ""}>Pause</option>
            </select>
        </td>
        <td>${type === "pause" ? "" : `<input class="input" type="number" min="0" value="${sb}">`}</td>
        <td>${type === "pause" ? "" : `<input class="input" type="number" min="0" value="${bb}">`}</td>
        <td>${type === "pause" ? "" : `<input class="input" type="number" min="0" value="${ante}">`}</td>
        <td><input class="input" type="number" min="1" value="${duration}"></td>
        <td>
            ${type === "niveau" ? `
            <button class="button is-small is-info" onclick="transferLevel(this)" title="Transférer ce niveau vers l'horloge">
                <span class="icon">
                    <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12h-6v8h-2v-8H5l7-8 7 8zm-14 8h14v2H5v-2z" fill="currentColor"/>
                    </svg>
                </span>
            </button>
            ` : ''}
            <button class="button is-small is-danger" onclick="removeLevelRow(this)">
                ×
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    updateLevelNumbers();
}


function addPauseRow(duration = 10) {
    addLevelRow('', '', '', duration, 'pause');
}

function removeLevelRow(btn) {
    btn.closest('tr').remove();
    updateLevelNumbers();
}

function clearLevels() {
    document.getElementById('levelsBody').innerHTML = '';
    updateLevelNumbers();
}

function updateLevelNumbers() {
    const rows = document.querySelectorAll('#levelsBody tr');
    let num = 1;
    rows.forEach((row) => {
        const type = row.querySelector('select').value;
        const numCell = row.querySelector('.param-level-num');
        if(numCell) {
            if(type === "pause") {
                numCell.textContent = "";
            } else {
                numCell.textContent = num++;
            }
        }
    });
}



function transferLevel(btn) {
    if (!isPaused || clockRunning) {
        alert("Veuillez mettre le chronomètre sur pause avant de transférer un niveau !");
        return;
    }
    const row = btn.closest('tr');
    const rows = Array.from(document.querySelectorAll('#levelsBody tr'));
    const idx = rows.indexOf(row);
    currentLevelIndex = idx;
    timeLeft = parseInt(row.cells[5].querySelector('input').value) * 60;
    updateCurrentLevelDisplay();
    updateClockDisplay(timeLeft);
    setPlayPauseIcon();
    updateClockColor(timeLeft);
}


function onChangeLevelType(select) {
    const tr = select.closest('tr');
    const type = select.value;
    tr.className = (type === "pause") ? "pause-row" : "";
    if (type === "pause") {
        tr.cells[2].innerHTML = "";
        tr.cells[3].innerHTML = "";
        tr.cells[4].innerHTML = "";
        if (!tr.cells[5].querySelector('input')) {
            tr.cells[5].innerHTML = `<input class="input" type="number" min="1" value="10">`;
        }
        tr.cells[6].innerHTML = `
            <button class="button is-small is-danger" onclick="removeLevelRow(this)">
                ×
            </button>
        `;
    } else {
        tr.cells[2].innerHTML = `<input class="input" type="number" min="0" value="1">`;
        tr.cells[3].innerHTML = `<input class="input" type="number" min="0" value="2">`;
        tr.cells[4].innerHTML = `<input class="input" type="number" min="0" value="0">`;
        if (!tr.cells[5].querySelector('input')) {
            tr.cells[5].innerHTML = `<input class="input" type="number" min="1" value="20">`;
        }
        tr.cells[6].innerHTML = `
            <button class="button is-small is-info" onclick="transferLevel(this)" title="Transférer ce niveau vers l'horloge">
                <span class="icon">
                    <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12h-6v8h-2v-8H5l7-8 7 8zm-14 8h14v2H5v-2z" fill="currentColor"/>
                    </svg>
                </span>
            </button>
            <button class="button is-small is-danger" onclick="removeLevelRow(this)">
                ×
            </button>
        `;
    }
}


function saveLevelsParam() {
    const levels = Array.from(document.querySelectorAll('#levelsBody tr')).map(row => {
        const type = row.querySelector('select').value;
        const duration = row.cells[5].querySelector('input').value;
        return type === "pause" ? 
            { type, duration } : 
            {
                type,
                sb: row.cells[2].querySelector('input').value,
                bb: row.cells[3].querySelector('input').value,
                ante: row.cells[4].querySelector('input').value,
                duration
            };
    });
    localStorage.setItem('poker_niveaux', JSON.stringify(levels));
    alert('Niveaux sauvegardés !');
}

function loadLevelsParam() {
    const data = localStorage.getItem('poker_niveaux');
    if (!data) { alert("Aucune sauvegarde trouvée."); return; }
    clearLevels();
    JSON.parse(data).forEach(lvl => {
        lvl.type === "pause" ? 
            addPauseRow(lvl.duration) : 
            addLevelRow(lvl.sb, lvl.bb, lvl.ante, lvl.duration, 'niveau');
    });
    updateLevelNumbers();
}

// === Horloge ===
function updateCurrentLevelDisplay() {
    const rows = document.querySelectorAll('#levelsBody tr');
    const currentLevelDiv = document.getElementById('currentLevel');
    const nextLevelDiv = document.getElementById('nextLevel');
    const pauseLabel = document.getElementById('pauseLabel');
    if (rows.length === 0) {
        currentLevelDiv.innerHTML = '<strong>Niveau : -</strong>';
        nextLevelDiv.textContent = 'Prochain niveau : --';
        pauseLabel.style.display = 'none';
        return;
    }
    const row = rows[currentLevelIndex] || rows[0];
    const type = row.querySelector('select').value;
    let html = "";
    if(type === "pause") {
        pauseLabel.style.display = '';
        html = `<strong>Pause de ${row.cells[5].querySelector('input').value} min</strong>`;
    } else {
        pauseLabel.style.display = 'none';
        const inputs = row.querySelectorAll('input');
        html = `<strong>Niveau ${getLevelNumber(currentLevelIndex)} : ${inputs[0].value} - ${inputs[1].value} / ${inputs[2].value}</strong>`;
        // Ajout du message si le prochain niveau est une pause
        if (rows[currentLevelIndex + 1]) {
            const nextRow = rows[currentLevelIndex + 1];
            const nextType = nextRow.querySelector('select').value;
            if(nextType === "pause") {
                const pauseMin = nextRow.cells[5].querySelector('input').value;
                html += `<div style="font-weight:bold; color:#933557; margin-top:0.5em;">Il y aura une pause de ${pauseMin} minutes après la fin de ce niveau</div>`;
            }
        }
    }
    currentLevelDiv.innerHTML = html;

    // Prochain niveau (affiche le niveau réel après la pause)
    let nextIdx = currentLevelIndex + 1;
    while (nextIdx < rows.length && rows[nextIdx] && rows[nextIdx].querySelector('select').value === "pause") {
        nextIdx++;
    }
    if (nextIdx < rows.length && rows[nextIdx]) {
        const nextRow = rows[nextIdx];
        const nextInputs = nextRow.querySelectorAll('input');
        nextLevelDiv.textContent =
            `Prochain niveau : ${getLevelNumber(nextIdx)} : ${nextInputs[0].value} - ${nextInputs[1].value} / ${nextInputs[2].value}`;
    } else {
        nextLevelDiv.textContent = 'Prochain niveau : --';
    }
}

// Fonction utilitaire pour numéroter les niveaux en ignorant les pauses
function getLevelNumber(idx) {
    const rows = document.querySelectorAll('#levelsBody tr');
    let num = 1;
    for(let i=0; i<=idx; i++) {
        if(rows[i].querySelector('select').value === "niveau") num++;
    }
    return num-1;
}
function updateClockDisplay(seconds) {
    seconds = Math.max(0, seconds);
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    document.getElementById('clockDisplay').textContent = `${hrs}:${mins}:${secs}`;
    updateClockColor(seconds);
}

function togglePlayPause() {
    const rows = document.querySelectorAll('#levelsBody tr');
    if (rows.length === 0) return;

    if (!clockRunning) {
        const row = rows[currentLevelIndex] || rows[0];
        if (timeLeft <= 0) {
            timeLeft = parseInt(row.cells[5].querySelector('input').value) * 60;
        }
        clockRunning = true;
        isPaused = false;
        syncClockTick();
    } else {
        isPaused = !isPaused;
    }
    setPlayPauseIcon();
    updateClockColor(timeLeft);
}

function setPlayPauseIcon() {
    const iconSpan = document.getElementById('playPauseIcon');
    iconSpan.innerHTML = (!clockRunning || isPaused) ? 
        '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' : 
        '<svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" fill="currentColor"/></svg>';
}

function syncClockTick() {
    if (clockSyncTimeout) clearTimeout(clockSyncTimeout);
    const ms = 1000 - (new Date()).getMilliseconds();
    clockSyncTimeout = setTimeout(() => {
        timerTick();
        timer = setInterval(timerTick, 1000);
    }, ms);
}

function timerTick() {
    if (!isPaused && clockRunning) {
        if (timeLeft > 0) {
            timeLeft--;
            updateClockDisplay(timeLeft);
        } else {
            const rows = document.querySelectorAll('#levelsBody tr');
            currentLevelIndex++;
            if (rows[currentLevelIndex]) {
                timeLeft = parseInt(rows[currentLevelIndex].cells[5].querySelector('input').value) * 60;
                updateCurrentLevelDisplay();
                updateClockDisplay(timeLeft);
            } else {
                clockRunning = false;
                isPaused = true;
                clearInterval(timer);
                updateClockDisplay(0);
                setPlayPauseIcon();
            }
        }
    }
}

function resetTimer() {
    clearInterval(timer);
    if (clockSyncTimeout) clearTimeout(clockSyncTimeout);
    timeLeft = 0;
    currentLevelIndex = 0;
    clockRunning = false;
    isPaused = true;
    updateClockDisplay(0);
    updateCurrentLevelDisplay();
    setPlayPauseIcon();
    updateClockColor(timeLeft);
}

// === Couleurs de l'horloge ===
function updateColorSettings() {
    colorSettings = [];
    colorDefault = document.getElementById('colorDefaultInput').value || "#933557";
    
    document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)').forEach(row => {
        const timeInput = row.querySelector('.time-input');
        const colorInput = row.querySelector('input[type="color"]');
        if(timeInput.value && colorInput.value) {
            const [minutes, seconds] = timeInput.value.split(':').map(Number);
            colorSettings.push({
                threshold: minutes * 60 + seconds,
                color: colorInput.value,
                display: timeInput.value
            });
        }
    });
    
    colorSettings.sort((a, b) => b.threshold - a.threshold);
    updateClockColor(timeLeft);
}

function updateClockColor(seconds) {
    let selectedColor = colorDefault;
    for(const setting of colorSettings) {
        if(seconds <= setting.threshold) {
            selectedColor = setting.color;
        }
    }
    document.getElementById('clockDisplay').style.color = selectedColor;
}

function addColorSettingRow(time = '', color = '#933557') {
    const tbody = document.getElementById('colorSettingsBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <input class="input time-input" type="text" placeholder="MM:SS" value="${time}"
                   pattern="[0-9]{1,2}:[0-5][0-9]">
        </td>
        <td>
            <input class="input" type="color" value="${color}">
        </td>
        <td>
            <button class="button is-small is-danger" onclick="removeColorSettingRow(this)">
                ×
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    updateColorSettings();
}

function removeColorSettingRow(btn) {
    btn.closest('tr').remove();
    updateColorSettings();
}

function saveColorsParam() {
    const colors = {
        default: colorDefault,
        steps: Array.from(document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)')).map(row => ({
            time: row.querySelector('.time-input').value,
            color: row.querySelector('input[type="color"]').value
        }))
    };
    localStorage.setItem('poker_couleurs', JSON.stringify(colors));
    alert('Couleurs sauvegardées !');
}

function loadColorsParam() {
    const data = localStorage.getItem('poker_couleurs');
    if (!data) { alert("Aucune sauvegarde trouvée."); return; }
    const colors = JSON.parse(data);
    document.getElementById('colorDefaultInput').value = colors.default || "#933557";
    document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)').forEach(row => row.remove());
    colors.steps?.forEach(step => addColorSettingRow(step.time, step.color));
    updateColorSettings();
}

// === Joueurs ===
function addPlayerParamRow(name = '') {
    const tbody = document.getElementById('playersParamBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="param-level-num"></td>
        <td><input class="input" type="text" placeholder="Nom du joueur" value="${name}"></td>
        <td>
            <button class="button is-small is-danger" onclick="removePlayerParamRow(this)">
                &times;
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    updatePlayerParamNumbers();
    syncPlayersToResults();
}

function removePlayerParamRow(btn) {
    btn.closest('tr').remove();
    updatePlayerParamNumbers();
    syncPlayersToResults();
}

function clearPlayersParam() {
    document.getElementById('playersParamBody').innerHTML = '';
    syncPlayersToResults();
}

function updatePlayerParamNumbers() {
    document.querySelectorAll('#playersParamBody tr').forEach((row, idx) => {
        row.querySelector('.param-level-num').textContent = idx + 1;
    });
}

function savePlayersParam() {
    const players = Array.from(document.querySelectorAll('#playersParamBody tr'))
        .map(row => row.querySelector('input').value.trim());
    localStorage.setItem('poker_joueurs', JSON.stringify(players));
    alert('Joueurs sauvegardés !');
}

function loadPlayersParam() {
    const data = localStorage.getItem('poker_joueurs');
    if (!data) { alert("Aucune sauvegarde trouvée."); return; }
    clearPlayersParam();
    JSON.parse(data).forEach(name => addPlayerParamRow(name));
    syncPlayersToResults();
}

function syncPlayersToResults() {
    const playerNames = Array.from(document.querySelectorAll('#playersParamBody tr'))
        .map(row => row.querySelector('input').value.trim() || `Joueur ${row.rowIndex}`);
    
    const tbody = document.getElementById('playerRows');
    const oldData = Array.from(tbody.children).map(row => ({
        SD: row.cells[2].querySelector('input').value,
        R: row.cells[3].querySelector('input').value,
        SA: row.cells[4].querySelector('input').value,
        bust: row.cells[5].querySelector('select').value
    }));
    
    tbody.innerHTML = playerNames.map((name, idx) => `
        <tr>
            <td class="player-pos">${idx + 1}</td>
            <td>${name}</td>
            <td><input class="input" type="number" min="0" value="${oldData[idx]?.SD || 400}" oninput="updateChipsAndWarning()"></td>
            <td><input class="input" type="number" min="0" value="${oldData[idx]?.R || ''}" oninput="updateChipsAndWarning()"></td>
            <td><input class="input" type="number" min="0" value="${oldData[idx]?.SA || ''}" oninput="updateChipsAndWarning()"></td>
            <td>
                <div class="select is-fullwidth">
                    <select onchange="updateChipsAndWarning()">
                        ${getBustOptions(oldData[idx]?.bust, playerNames.length)}
                    </select>
                </div>
            </td>
        </tr>
    `).join('');
    
    updateBustRankOptions();
    updateChipsAndWarning();
}

// === Résultats ===
function getBustOptions(selected, playerCount) {
    let options = '<option value="">--</option>';
    for(let i = 1; i < playerCount; i++) {
        options += `<option value="${i}" ${selected == i ? 'selected' : ''}>${i}</option>`;
    }
    return options;
}

function updateBustRankOptions() {
    document.querySelectorAll('#playerRows tr').forEach(row => {
        const select = row.querySelector('select');
        const playerCount = document.querySelectorAll('#playerRows tr').length;
        select.innerHTML = getBustOptions(select.value, playerCount);
    });
}

function getPlayers() {
    return Array.from(document.querySelectorAll('#playerRows tr')).map(row => ({
        name: row.cells[1].textContent.trim(),
        SD: parseFloat(row.cells[2].querySelector('input').value) || 0,
        R: parseFloat(row.cells[3].querySelector('input').value) || 0,
        SA: parseFloat(row.cells[4].querySelector('input').value) || 0,
        rankBust: row.cells[5].querySelector('select').value
    }));
}

function updateChipsAndWarning() {
    const players = getPlayers();
    const totalSD = players.reduce((sum, p) => sum + p.SD, 0);
    const totalR = players.reduce((sum, p) => sum + p.R, 0);
    const totalSA = players.reduce((sum, p) => sum + p.SA, 0);
    const totalChips = totalSD + totalR;
    
    document.getElementById('chipsTotal').textContent = `Total chips en jeu : ${totalChips}`;
    
    const warning = document.getElementById('warningMsg');
    warning.textContent = totalChips !== totalSA ? 
        `⚠️ Attention : la somme des stacks d'arrivée (${totalSA}) diffère de la somme des mises (${totalChips}) (${totalSA - totalChips > 0 ? '+' : ''}${totalSA - totalChips})` : 
        '';
}

function shufflePlayers() {
    const tbody = document.getElementById('playerRows');
    const rows = Array.from(tbody.children)
        .map(row => ({
            html: row.innerHTML,
            values: Array.from(row.querySelectorAll('input, select')).map(el => el.value)
        }));
    
    for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    
    tbody.innerHTML = rows.map(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = row.html;
        Array.from(tr.querySelectorAll('input, select')).forEach((el, i) => el.value = row.values[i]);
        return tr.outerHTML;
    }).join('');
    
    updateBustRankOptions();
    updateChipsAndWarning();
}

function calculate() {
    const players = getPlayers();
    if (players.length < 2) {
        alert("Il faut au moins deux joueurs !");
        return;
    }
    
    const totalChipsSoiree = players.reduce((sum, p) => sum + p.SD + p.R, 0);
    const results = players.map(player => {
        const differentiel = player.SA - (player.SD + player.R);
        const percentChips = player.SA / totalChipsSoiree;
        const percentRecave = player.R > 0 ? 0.5 : 0;
        const malusRecave = player.R > 0 ? -250 * percentRecave : 0;
        const malusBust = player.rankBust > 0 ? -100 * (players.length - player.rankBust + 1) / players.length : 0;
        const bonusNoRecave = player.R > 0 ? 0 : 250;
        const score = differentiel + (percentChips * 1000) + malusRecave + malusBust + bonusNoRecave;
        return { ...player, score };
    });
    
    results.sort((a, b) => b.score - a.score);
    
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = results.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.score.toFixed(1)}</td>
        </tr>
    `).join('');
    
    document.getElementById('resultsSection').style.display = '';
    updateTournamentNameDisplay();
    
    const tournamentName = document.getElementById('tournamentNameInput').value.trim() || 'Tournoi';
    allTournaments.push({
        name: tournamentName,
        date: new Date().toISOString(),
        results: results.map(r => ({ name: r.name, score: r.score }))
    });
    
    updateLeaderboardWithTournament(results);
    updateTournamentSelector();
}

// === Leaderboard ===
function updateLeaderboardWithTournament(results) {
    results.forEach(p => {
        leaderboardData[p.name] = leaderboardData[p.name] || { totalScore: 0, tournamentsCount: 0 };
        leaderboardData[p.name].totalScore += p.score;
        leaderboardData[p.name].tournamentsCount++;
    });
    updateLeaderboardDisplay();
}

function updateLeaderboardDisplay() {
    const players = Object.entries(leaderboardData).map(([name, data]) => ({
        name,
        totalScore: data.totalScore,
        tournamentsCount: data.tournamentsCount,
        averageScore: data.totalScore / data.tournamentsCount
    })).sort((a, b) => b.totalScore - a.totalScore);
    
    const tbody = document.querySelector('#leaderboardTable tbody');
    tbody.innerHTML = players.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.totalScore.toFixed(1)}</td>
            <td>${p.tournamentsCount}</td>
            <td>${p.averageScore.toFixed(1)}</td>
        </tr>
    `).join('');
    
    for(let i = 0; i < 5; i++) {
        document.getElementById(`sort-${i}`).textContent = '';
    }
    document.getElementById(`sort-${leaderboardSortCol}`).textContent = leaderboardSortAsc ? '▲' : '▼';
}

function sortLeaderboard(col) {
    leaderboardSortAsc = (leaderboardSortCol === col) ? !leaderboardSortAsc : (col === 1);
    leaderboardSortCol = col;
    updateLeaderboardDisplay();
}

function updateTournamentSelector() {
    const selector = document.getElementById('tournamentSelector');
    selector.innerHTML = '<option value="">-- Sélectionner un tournoi --</option>' + 
        allTournaments.map((t, i) => `
            <option value="${i}">${t.name} (${new Date(t.date).toLocaleDateString('fr-FR')})</option>
        `).join('');
}

function loadTournamentResults() {
    const index = document.getElementById('tournamentSelector').value;
    const section = document.getElementById('tournamentResultsSection');
    if (index === "" || !allTournaments[index]) {
        section.style.display = "none";
        return;
    }
    
    const tournament = allTournaments[index];
    const sorted = [...tournament.results].sort((a, b) => b.score - a.score);
    
    document.querySelector('#tournamentResultsTable tbody').innerHTML = sorted.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.score.toFixed(1)}</td>
        </tr>
    `).join('');
    
    section.style.display = "";
}

// === Import/Export ===
function exportResultsJSON() {
    const tournamentName = document.getElementById('tournamentNameInput').value.trim() || 'Tournoi';
    const data = {
        tournamentName,
        tournamentDate: new Date().toISOString(),
        results: getPlayers()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Résultat - ${tournamentName.replace(/[\\\/:*?"<>|]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importSingleTournament(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.tournamentName || !data.results) throw new Error("Format invalide");
            
            const totalChipsSoiree = data.results.reduce((sum, p) => sum + (p.SD || 0) + (p.R || 0), 0);
            const results = data.results.map(p => {
                const differentiel = (p.SA || 0) - ((p.SD || 0) + (p.R || 0));
                const percentChips = (p.SA || 0) / totalChipsSoiree;
                const percentRecave = (p.R || 0) > 0 ? 0.5 : 0;
                const malusRecave = (p.R || 0) > 0 ? -250 * percentRecave : 0;
                const malusBust = p.rankBust > 0 ? -100 * (data.results.length - p.rankBust + 1) / data.results.length : 0;
                const bonusNoRecave = (p.R || 0) > 0 ? 0 : 250;
                return { name: p.name, score: differentiel + (percentChips * 1000) + malusRecave + malusBust + bonusNoRecave };
            });
            
            allTournaments.push({
                name: data.tournamentName,
                date: data.tournamentDate,
                results
            });
            
            results.forEach(p => {
                leaderboardData[p.name] = leaderboardData[p.name] || { totalScore: 0, tournamentsCount: 0 };
                leaderboardData[p.name].totalScore += p.score;
                leaderboardData[p.name].tournamentsCount++;
            });
            
            updateLeaderboardDisplay();
            updateTournamentSelector();
            alert("Tournoi importé avec succès !");
        } catch(err) {
            alert("Erreur lors de l'import : " + err.message);
        }
    };
    reader.readAsText(file);
}

function exportLeaderboard() {
    const data = { leaderboardData, allTournaments };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "leaderboard.json";
    a.click();
    URL.revokeObjectURL(url);
}

function importLeaderboard() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const data = JSON.parse(evt.target.result);
                if (!data.leaderboardData || !data.allTournaments) throw new Error("Format invalide");
                
                leaderboardData = data.leaderboardData;
                allTournaments = data.allTournaments;
                updateLeaderboardDisplay();
                updateTournamentSelector();
                alert("Leaderboard importé avec succès !");
            } catch(err) {
                alert("Erreur lors de l'import : " + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportAllParams() {
    const params = {
        joueurs: Array.from(document.querySelectorAll('#playersParamBody tr')).map(row => row.querySelector('input').value.trim()),
        niveaux: Array.from(document.querySelectorAll('#levelsBody tr')).map(row => {
            const type = row.querySelector('select').value;
            return type === "pause" ? 
                { type, duration: row.cells[5].querySelector('input').value } : 
                {
                    type,
                    sb: row.cells[2].querySelector('input').value,
                    bb: row.cells[3].querySelector('input').value,
                    ante: row.cells[4].querySelector('input').value,
                    duration: row.cells[5].querySelector('input').value
                };
        }),
        couleurs: {
            default: colorDefault,
            steps: Array.from(document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)')).map(row => ({
                time: row.querySelector('.time-input').value,
                color: row.querySelector('input[type="color"]').value
            }))
        },
        nomTournoi: document.getElementById('tournamentNameInput').value.trim()
    };
    
    const blob = new Blob([JSON.stringify(params, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "poker_parametres.json";
    a.click();
    URL.revokeObjectURL(url);
}

function importAllParams(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const params = JSON.parse(e.target.result);
            
            // Joueurs
            clearPlayersParam();
            params.joueurs?.forEach(name => addPlayerParamRow(name));
            
            // Niveaux
            clearLevels();
            params.niveaux?.forEach(lvl => {
                lvl.type === "pause" ? 
                    addPauseRow(lvl.duration) : 
                    addLevelRow(lvl.sb, lvl.bb, lvl.ante, lvl.duration, 'niveau');
            });
            
            // Couleurs
            document.getElementById('colorDefaultInput').value = params.couleurs?.default || "#933557";
            document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)').forEach(row => row.remove());
            params.couleurs?.steps?.forEach(step => addColorSettingRow(step.time, step.color));
            updateColorSettings();
            
            // Nom du tournoi
            document.getElementById('tournamentNameInput').value = params.nomTournoi || '';
            updateTournamentNameDisplay();
            
            alert("Paramètres importés avec succès !");
        } catch(err) {
            alert("Erreur lors de l'import : " + err.message);
        }
    };
    reader.readAsText(file);
}

// === Initialisation ===
function updateTournamentNameDisplay() {
    document.getElementById('resultTournamentName').textContent = 
        document.getElementById('tournamentNameInput').value.trim() || 'Tournoi';
}

function updateCurrentTimeSync() {
    document.getElementById('currentTime').textContent = 
        `Heure locale : ${new Date().toLocaleTimeString('fr-FR')}`;
    setTimeout(updateCurrentTimeSync, 1000 - new Date().getMilliseconds());
}



function exportSnapshot() {
    const snapshot = {
        params: {
            joueurs: Array.from(document.querySelectorAll('#playersParamBody tr')).map(row => row.querySelector('input').value.trim()),
            niveaux: Array.from(document.querySelectorAll('#levelsBody tr')).map(row => {
                const type = row.querySelector('select').value;
                return type === "pause" ? 
                    { type, duration: row.cells[5].querySelector('input').value } : 
                    {
                        type,
                        sb: row.cells[2].querySelector('input').value,
                        bb: row.cells[3].querySelector('input').value,
                        ante: row.cells[4].querySelector('input').value,
                        duration: row.cells[5].querySelector('input').value
                    };
            }),
            couleurs: {
                default: colorDefault,
                steps: Array.from(document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)')).map(row => ({
                    time: row.querySelector('.time-input').value,
                    color: row.querySelector('input[type="color"]').value
                }))
            },
            nomTournoi: document.getElementById('tournamentNameInput').value.trim()
        },
        clock: {
            currentLevelIndex,
            timeLeft,
            isPaused,
            clockRunning
        },
        leaderboardData,
        allTournaments
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "poker_snapshot.json";
    a.click();
    URL.revokeObjectURL(url);
}

function importSnapshot(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const snap = JSON.parse(e.target.result);
            // Paramètres
            clearPlayersParam();
            snap.params.joueurs?.forEach(name => addPlayerParamRow(name));
            clearLevels();
            snap.params.niveaux?.forEach(lvl => {
                lvl.type === "pause" ? 
                    addPauseRow(lvl.duration) : 
                    addLevelRow(lvl.sb, lvl.bb, lvl.ante, lvl.duration, 'niveau');
            });
            document.getElementById('colorDefaultInput').value = snap.params.couleurs?.default || "#933557";
            document.querySelectorAll('#colorSettingsBody tr:not(.color-default-row)').forEach(row => row.remove());
            snap.params.couleurs?.steps?.forEach(step => addColorSettingRow(step.time, step.color));
            updateColorSettings();
            document.getElementById('tournamentNameInput').value = snap.params.nomTournoi || '';
            updateTournamentNameDisplay();
            // Horloge
            currentLevelIndex = snap.clock.currentLevelIndex || 0;
            timeLeft = snap.clock.timeLeft || 0;
            isPaused = snap.clock.isPaused ?? true;
            clockRunning = snap.clock.clockRunning ?? false;
            updateCurrentLevelDisplay();
            updateClockDisplay(timeLeft);
            setPlayPauseIcon();
            updateClockColor(timeLeft);
            // Leaderboard
            leaderboardData = snap.leaderboardData || {};
            allTournaments = snap.allTournaments || [];
            updateLeaderboardDisplay();
            updateTournamentSelector();
            alert("Snapshot importé avec succès !");
        } catch(err) {
            alert("Erreur lors de l'import du snapshot : " + err.message);
        }
    };
    reader.readAsText(file);
}


window.onload = function() {
    // Initialisation des joueurs
    clearPlayersParam();
    addPlayerParamRow("Alice");
    addPlayerParamRow("Bob");
    syncPlayersToResults();
    
    // Initialisation des niveaux
    clearLevels();
    addLevelRow(1, 2, 0, 30);
    addLevelRow(2, 4, 0, 20);
    addLevelRow(4, 8, 0, 20);
    addLevelRow(5, 10, 0, 20);
    addLevelRow(10, 20, 0, 20);
    updateCurrentLevelDisplay();
    
    // Initialisation des couleurs
    document.getElementById('colorDefaultInput').value = "#933557";
    addColorSettingRow('30:00', '#933557');
    addColorSettingRow('10:00', '#FFA500');
    addColorSettingRow('05:00', '#FF0000');
    updateColorSettings();
    
    // Nom du tournoi
    document.getElementById('tournamentNameInput').value = `Tournoi du ${new Date().toLocaleDateString('fr-FR')}`;
    updateTournamentNameDisplay();
    
    // Événements
    document.getElementById('tournamentNameInput').addEventListener('input', updateTournamentNameDisplay);
    document.addEventListener('input', function(e) {
        if (e.target.closest('#playersParamBody')) syncPlayersToResults();
        if (e.target.classList.contains('time-input')) updateColorSettings();
    });
    document.addEventListener('change', function(e) {
        if (e.target.type === 'color') updateColorSettings();
    });
    
    updateCurrentTimeSync();
};

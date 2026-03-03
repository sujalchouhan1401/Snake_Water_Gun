// ===== CONSTANTS =====
const CHOICES = {
    snake: { emoji: '🐍', name: 'SNAKE', class: 'snake-card', value: 0 },
    water: { emoji: '💧', name: 'WATER', class: 'water-card', value: 1 },
    gun: { emoji: '🔫', name: 'GUN', class: 'gun-card', value: 2 }
};
const CHOICE_KEYS = ['snake', 'water', 'gun'];
const TIMER_DURATION = 30;
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52

// ===== GAME STATE =====
const state = {
    mode: null,          // 'cpu' or 'friend'
    playerScore: 0,
    opponentScore: 0,
    round: 1,
    isPlaying: false,
    myChoice: null,
    opponentChoice: null,
    timerInterval: null,
    timerValue: TIMER_DURATION,
    // Player profile
    nickname: localStorage.getItem('swg_nickname') || '',
    playerId: localStorage.getItem('swg_playerId') || generatePlayerId(),
    // Multiplayer
    peer: null,
    conn: null,
    isHost: false,
    roomCode: '',
    opponentName: 'CPU',
    opponentId: '',
    roundReady: false,
    totalRounds: 3,
    opponentScreenReady: false,
    playAgainReady: false,
    opponentPlayAgainReady: false
};

const peerConfig = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
        ]
    },
    debug: 0
};

function generatePlayerId() {
    const id = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('swg_playerId', id);
    return id;
}

// ===== DOM ELEMENTS =====
const $ = id => document.getElementById(id);

const els = {
    // Screens
    lobbyScreen: $('lobby-screen'),
    roomScreen: $('room-screen'),
    gameScreen: $('game-screen'),
    // Lobby
    profileId: $('profile-id'),
    nicknameInput: $('nickname-input'),
    btnCpuMode: $('btn-cpu-mode'),
    btnFriendMode: $('btn-friend-mode'),
    // Room
    roomBackBtn: $('room-back-btn'),
    createRoomCard: $('create-room-card'),
    joinRoomCard: $('join-room-card'),
    btnCreateRoom: $('btn-create-room'),
    btnJoinRoom: $('btn-join-room'),
    joinCodeInput: $('join-code-input'),
    waitingRoom: $('waiting-room'),
    waitingTitle: $('waiting-title'),
    roomCodeDisplay: $('room-code-display'),
    roomCodeValue: $('room-code-value'),
    copyCodeBtn: $('copy-code-btn'),
    connectionStatus: $('connection-status'),
    roundsInput: $('rounds-input'),
    // Game
    gameBackBtn: $('game-back-btn'),
    playerScore: $('player-score'),
    cpuScore: $('cpu-score'),
    roundNumber: $('round-number'),
    p1NameLabel: $('p1-name-label'),
    p2NameLabel: $('p2-name-label'),
    p1SideTitle: $('p1-side-title'),
    p2SideTitle: $('p2-side-title'),
    p2AvatarIcon: $('p2-avatar-icon'),
    weaponBtns: document.querySelectorAll('.weapon-btn'),
    battleBadge: $('battle-badge'),
    cpuThinking: $('cpu-thinking'),
    timerContainer: $('timer-container'),
    timerRingProgress: $('timer-ring-progress'),
    timerValueEl: $('timer-value'),
    resultOverlay: $('result-overlay'),
    resultIcon: $('result-icon'),
    resultTitle: $('result-title'),
    resultDetail: $('result-detail'),
    playAgainBtn: $('play-again-btn'),
    rulesToggle: $('rules-toggle'),
    rulesPanel: $('rules-panel'),
    canvas: $('particles-canvas')
};

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(screenId).classList.add('active');
}

// ===== INIT LOBBY =====
function initLobby() {
    els.profileId.textContent = '#' + state.playerId;
    els.nicknameInput.value = state.nickname;
    els.nicknameInput.addEventListener('input', (e) => {
        state.nickname = e.target.value.trim();
        localStorage.setItem('swg_nickname', state.nickname);
    });
}

function getDisplayName() {
    return state.nickname || 'Player#' + state.playerId;
}

// ===== PARTICLE SYSTEM =====
function initParticles() {
    const canvas = els.canvas;
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
            const colors = ['108,92,231', '0,206,201', '253,121,168', '162,155,254'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color},${this.opacity})`;
            ctx.fill();
        }
    }
    const count = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < count; i++) particles.push(new Particle());

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(108,92,231,${0.08 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }
    (function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        requestAnimationFrame(animate);
    })();
}

// ===== GAME LOGIC =====
function determineWinner(playerChoice, opponentChoice) {
    const p = CHOICES[playerChoice].value;
    const c = CHOICES[opponentChoice].value;
    if (p === c) return 'draw';
    if ((p === 0 && c === 1) || (p === 1 && c === 2) || (p === 2 && c === 0)) return 'win';
    return 'lose';
}

function getCpuChoice() {
    return CHOICE_KEYS[Math.floor(Math.random() * 3)];
}

// ===== CARD RENDERING =====
function createRevealedCard(choiceKey) {
    const choice = CHOICES[choiceKey];
    const container = document.createElement('div');
    container.className = 'card-3d-container';
    const card = document.createElement('div');
    card.className = 'card-3d revealed-card';
    const front = document.createElement('div');
    front.className = `card-revealed-front ${choice.class}`;
    const emoji = document.createElement('span');
    emoji.className = 'card-emoji';
    emoji.textContent = choice.emoji;
    const name = document.createElement('span');
    name.className = 'card-name';
    name.textContent = choice.name;
    front.appendChild(emoji);
    front.appendChild(name);
    card.appendChild(front);
    container.appendChild(card);
    return container;
}

function createWaitingCard(isCpu) {
    const container = document.createElement('div');
    container.className = 'card-3d-container';
    const card = document.createElement('div');
    card.className = `card-3d waiting-card${isCpu ? ' cpu-waiting' : ''}`;
    const front = document.createElement('div');
    front.className = 'card-face card-front';
    const q = document.createElement('span');
    q.className = 'card-question';
    q.textContent = '?';
    const hint = document.createElement('p');
    hint.className = 'card-hint';
    hint.textContent = isCpu ? 'Waiting...' : 'Choose your weapon';
    front.appendChild(q);
    front.appendChild(hint);
    card.appendChild(front);
    container.appendChild(card);
    return container;
}

// ===== CONFETTI =====
function spawnConfetti(count) {
    const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#ffeaa7', '#55efc4', '#a29bfe', '#e17055'];
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = (2 + Math.random() * 2) + 's';
        el.style.animationDelay = Math.random() * 0.5 + 's';
        el.style.width = (6 + Math.random() * 8) + 'px';
        el.style.height = (6 + Math.random() * 8) + 'px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

// ===== TIMER =====
function startTimer(onExpire) {
    state.timerValue = TIMER_DURATION;
    els.timerValueEl.textContent = TIMER_DURATION;
    els.timerContainer.style.display = 'flex';
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
        state.timerValue--;
        updateTimerDisplay();
        if (state.timerValue <= 0) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
            onExpire();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const t = state.timerValue;
    els.timerValueEl.textContent = t;
    const offset = TIMER_CIRCUMFERENCE * (1 - t / TIMER_DURATION);
    els.timerRingProgress.style.strokeDasharray = TIMER_CIRCUMFERENCE;
    els.timerRingProgress.style.strokeDashoffset = offset;

    els.timerRingProgress.classList.remove('warning', 'danger');
    if (t <= 3) els.timerRingProgress.classList.add('danger');
    else if (t <= 5) els.timerRingProgress.classList.add('warning');
}

function hideTimer() {
    els.timerContainer.style.display = 'none';
}

// ===== SETUP GAME SCREEN =====
function setupGameScreen() {
    const name1 = getDisplayName();
    const name2 = state.opponentName;
    const short1 = name1.length > 8 ? name1.substring(0, 8) : name1;
    const short2 = name2.length > 8 ? name2.substring(0, 8) : name2;
    els.p1NameLabel.textContent = short1;
    els.p2NameLabel.textContent = short2;
    els.p1SideTitle.textContent = short1.toUpperCase();
    els.p2SideTitle.textContent = short2.toUpperCase();
    els.p2AvatarIcon.textContent = state.mode === 'cpu' ? '🤖' : '🎮';

    // Reset scores
    state.playerScore = 0;
    state.opponentScore = 0;
    state.round = 1;
    state.isPlaying = false;
    state.myChoice = null;
    state.opponentChoice = null;
    els.playerScore.textContent = '0';
    els.cpuScore.textContent = '0';

    if (state.mode === 'friend') {
        els.roundNumber.textContent = `1 / ${state.totalRounds}`;
    } else {
        els.roundNumber.textContent = '1';
    }

    resetCards();
    hideTimer();
    els.resultOverlay.classList.remove('active');

    if (state.mode === 'friend') {
        els.timerContainer.style.display = 'flex';
        els.cpuThinking.querySelector('.thinking-text').textContent = 'Waiting for choice...';
    } else {
        els.cpuThinking.querySelector('.thinking-text').textContent = 'CPU is ready';
    }
}

function resetCards() {
    const pd = $('player-choice-display');
    const cd = $('cpu-choice-display');
    pd.innerHTML = '';
    cd.innerHTML = '';
    pd.appendChild(createWaitingCard(false));
    cd.appendChild(createWaitingCard(true));
    els.weaponBtns.forEach(b => b.classList.remove('disabled', 'selected'));
    els.battleBadge.classList.remove('battle-active');
}

// ===== CPU MODE =====
function playCpuRound(playerChoice) {
    if (state.isPlaying) return;
    state.isPlaying = true;
    els.weaponBtns.forEach(b => b.classList.add('disabled'));
    els.weaponBtns.forEach(b => {
        if (b.dataset.choice === playerChoice) b.classList.add('selected');
    });

    const pd = $('player-choice-display');
    pd.innerHTML = '';
    pd.appendChild(createRevealedCard(playerChoice));
    els.cpuThinking.querySelector('.thinking-text').textContent = 'CPU is thinking...';
    els.battleBadge.classList.add('battle-active');

    const cd = $('cpu-choice-display');
    let shuffleCount = 0;
    const shuffleInterval = setInterval(() => {
        const rand = CHOICE_KEYS[Math.floor(Math.random() * 3)];
        cd.innerHTML = '';
        cd.appendChild(createRevealedCard(rand));
        if (++shuffleCount > 8) clearInterval(shuffleInterval);
    }, 150);

    setTimeout(() => {
        clearInterval(shuffleInterval);
        const cpuChoice = getCpuChoice();
        const result = determineWinner(playerChoice, cpuChoice);
        cd.innerHTML = '';
        cd.appendChild(createRevealedCard(cpuChoice));
        els.cpuThinking.querySelector('.thinking-text').textContent = 'CPU chose!';
        if (result === 'win') state.playerScore++;
        else if (result === 'lose') state.opponentScore++;
        els.playerScore.textContent = state.playerScore;
        els.cpuScore.textContent = state.opponentScore;
        setTimeout(() => showResult(result, playerChoice, cpuChoice), 600);
    }, 1500);
}

// ===== MULTIPLAYER MODE =====
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function createRoom() {
    state.isHost = true;
    state.totalRounds = parseInt(els.roundsInput.value) || 3;
    state.roomCode = generateRoomCode();

    // Show waiting UI
    els.createRoomCard.style.display = 'none';
    els.joinRoomCard.style.display = 'none';
    els.waitingRoom.style.display = 'flex';
    els.roomCodeDisplay.style.display = 'flex';
    els.roomCodeValue.textContent = state.roomCode;
    els.waitingTitle.textContent = 'Waiting for opponent...';
    setConnectionStatus('connecting');

    // Create PeerJS peer with room code as ID
    const peerId = 'swg_' + state.roomCode;
    try {
        state.peer = new Peer(peerId, peerConfig);
    } catch (e) {
        setConnectionStatus('error', 'Failed to create room');
        return;
    }

    state.peer.on('open', () => {
        setConnectionStatus('connecting', 'Room created! Waiting...');
    });

    state.peer.on('connection', (conn) => {
        state.conn = conn;
        setupConnection(conn);
    });

    state.peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            setConnectionStatus('error', 'Code taken. Try again.');
            setTimeout(() => {
                state.roomCode = generateRoomCode();
                els.roomCodeValue.textContent = state.roomCode;
                if (state.peer) state.peer.destroy();
                createRoom();
            }, 1500);
        } else {
            setConnectionStatus('error', 'Connection error');
        }
    });
}

function joinRoom(autoCode = null) {
    let rawCode = typeof autoCode === 'string' ? autoCode : els.joinCodeInput.value.trim();

    // Extract room code if user pasted a full URL
    if (rawCode.includes('?room=')) {
        rawCode = rawCode.split('?room=')[1].split('&')[0];
    } else if (rawCode.includes('http')) {
        // Fallback for random URL pasting
        const parts = rawCode.split('/');
        rawCode = parts[parts.length - 1];
    }

    // Clean out invalid characters (PeerJS doesn't like special chars like '/')
    const code = rawCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (code.length < 4) {
        els.joinCodeInput.style.borderColor = '#d63031';
        setTimeout(() => els.joinCodeInput.style.borderColor = '', 1500);
        return;
    }

    state.isHost = false;
    state.roomCode = code;

    els.createRoomCard.style.display = 'none';
    els.joinRoomCard.style.display = 'none';
    els.waitingRoom.style.display = 'flex';
    els.roomCodeDisplay.style.display = 'none';
    els.waitingTitle.textContent = 'Connecting to room...';
    setConnectionStatus('connecting');

    try {
        state.peer = new Peer(undefined, peerConfig);
    } catch (e) {
        setConnectionStatus('error', 'Connection failed');
        return;
    }

    state.peer.on('open', () => {
        const peerId = 'swg_' + code;
        const conn = state.peer.connect(peerId, { reliable: true });
        state.conn = conn;
        setupConnection(conn);
    });

    state.peer.on('error', (err) => {
        setConnectionStatus('error', 'Room not found or error');
    });
}

function setupConnection(conn) {
    conn.on('open', () => {
        // Send our profile info
        conn.send({
            type: 'profile',
            name: getDisplayName(),
            id: state.playerId,
            totalRounds: state.totalRounds
        });
        setConnectionStatus('connected', 'Connected!');
    });

    conn.on('data', (data) => {
        handlePeerMessage(data);
    });

    conn.on('close', () => {
        setConnectionStatus('error', 'Opponent disconnected');
        stopTimer();
        if (state.isPlaying) {
            state.isPlaying = false;
        }
    });

    conn.on('error', () => {
        setConnectionStatus('error', 'Connection error');
    });
}

function handlePeerMessage(data) {
    switch (data.type) {
        case 'profile':
            state.opponentName = data.name || 'Player#' + data.id;
            state.opponentId = data.id;
            // Only update total rounds if we are joining the room (not the host)
            if (!state.isHost && data.totalRounds) {
                state.totalRounds = data.totalRounds;
            }
            // Both connected: start game
            setTimeout(() => {
                startMultiplayerGame();
            }, 1000);
            break;

        case 'screen-ready':
            state.opponentScreenReady = true;
            if (state.isHost && state.roundReady && state.opponentScreenReady) {
                // Both host and client screens are ready, send explicit start
                state.conn.send({ type: 'start-round' });
                startMultiplayerRound();
            }
            break;

        case 'start-round':
            if (!state.isHost) {
                startMultiplayerRound();
            }
            break;

        case 'choice':
            state.opponentChoice = data.choice;
            // Show locked indicator on opponent side
            els.cpuThinking.querySelector('.thinking-text').textContent = '✅ Choice locked!';
            // Check if both chose
            checkMultiplayerResult();
            break;

        case 'ready':
            state.roundReady = true;
            if (state.isHost && state.opponentScreenReady) {
                // For subsequent rounds
                state.conn.send({ type: 'start-round' });
                startMultiplayerRound();
            }
            break;

        case 'play-again-ready':
            state.opponentPlayAgainReady = true;
            checkPlayAgainReady();
            break;
    }
}

function startMultiplayerGame() {
    state.mode = 'friend';
    setupGameScreen();
    showScreen('game-screen');

    // Notify opponent that we are physically on the game screen now
    if (state.conn && state.conn.open) {
        state.conn.send({ type: 'screen-ready' });
    }

    state.roundReady = true;

    // If host, we already sent screen-ready, now we wait for opponent's screen-ready
    if (state.isHost && state.opponentScreenReady) {
        state.conn.send({ type: 'start-round' });
        startMultiplayerRound();
    }
}

function startMultiplayerRound() {
    if (!state.roundReady) return;
    state.myChoice = null;
    state.opponentChoice = null;
    state.isPlaying = false;

    els.roundNumber.textContent = `${state.round} / ${state.totalRounds}`;

    els.cpuThinking.querySelector('.thinking-text').textContent = 'Choosing...';
    // Start 12-second timer
    startTimer(() => {
        // Timer expired
        handleTimerExpiry();
    });
}

function handleMultiplayerChoice(choice) {
    if (state.myChoice) return; // Already chose
    state.myChoice = choice;
    state.isPlaying = true;

    els.weaponBtns.forEach(b => b.classList.add('disabled'));
    els.weaponBtns.forEach(b => {
        if (b.dataset.choice === choice) b.classList.add('selected');
    });

    // Show our card (face down for now - show a lock icon)
    const pd = $('player-choice-display');
    pd.innerHTML = '';
    const lockContainer = document.createElement('div');
    lockContainer.className = 'card-3d-container';
    const lockCard = document.createElement('div');
    lockCard.className = 'card-3d';
    const lockFront = document.createElement('div');
    lockFront.className = 'card-face card-front';
    lockFront.innerHTML = '<span class="card-question" style="font-size:3rem">🔒</span><p class="card-hint">Choice locked!</p>';
    lockCard.appendChild(lockFront);
    lockContainer.appendChild(lockCard);
    pd.appendChild(lockContainer);

    // Send choice to opponent
    if (state.conn && state.conn.open) {
        state.conn.send({ type: 'choice', choice: choice });
    }

    checkMultiplayerResult();
}

function handleTimerExpiry() {
    stopTimer();

    // Determine who didn't choose
    const iChose = state.myChoice !== null;
    const oppChose = state.opponentChoice !== null;

    if (iChose && !oppChose) {
        // I win - opponent didn't choose
        state.opponentChoice = state.myChoice; // placeholder
        revealMultiplayerCards();
        state.playerScore++;
        els.playerScore.textContent = state.playerScore;
        setTimeout(() => {
            showResultCustom('win', '🏆', 'YOU WIN!', 'Opponent ran out of time! ⏱️');
            spawnConfetti(40);
        }, 800);
    } else if (!iChose && oppChose) {
        // I lose - I didn't choose
        state.myChoice = state.opponentChoice; // placeholder
        revealMultiplayerCards();
        state.opponentScore++;
        els.cpuScore.textContent = state.opponentScore;
        setTimeout(() => {
            showResultCustom('lose', '💀', 'YOU LOSE!', 'You ran out of time! ⏱️');
        }, 800);
    } else if (!iChose && !oppChose) {
        // Both timed out - draw
        state.myChoice = 'snake';
        state.opponentChoice = 'snake';
        revealMultiplayerCards();
        setTimeout(() => {
            showResultCustom('draw', '⏱️', 'TIME OUT!', 'Neither player chose in time!');
        }, 800);
    }
    // If both chose, checkMultiplayerResult already handles it. It handles final result there or here if timeout.

    // Check if game is over
    if (state.round >= state.totalRounds) {
        els.playAgainBtn.style.display = 'none';
        setTimeout(showFinalMatchResult, 2500);
    } else {
        // if we did not reach total_rounds yet, and timer expired, we want to auto-continue if BOTH didn't answer within 3 seconds
        // If one of the players answered, they will click play again normally.
        if (!iChose && !oppChose) {
            setTimeout(() => {
                if (!state.playAgainReady) playAgain();
            }, 3000);
        }
    }
}

function checkMultiplayerResult() {
    if (!state.myChoice || !state.opponentChoice) return;

    // Both have chosen - stop timer and reveal
    stopTimer();
    const result = determineWinner(state.myChoice, state.opponentChoice);

    els.battleBadge.classList.add('battle-active');
    revealMultiplayerCards();

    if (result === 'win') state.playerScore++;
    else if (result === 'lose') state.opponentScore++;
    els.playerScore.textContent = state.playerScore;
    els.cpuScore.textContent = state.opponentScore;

    setTimeout(() => {
        showResult(result, state.myChoice, state.opponentChoice);
        if (state.round >= state.totalRounds) {
            els.playAgainBtn.style.display = 'none';
            setTimeout(showFinalMatchResult, 2500);
        }
    }, 800);
}

function showFinalMatchResult() {
    let title = "MATCH OVER!";
    let detail = "";
    let icon = "🎯";
    let type = "draw";

    if (state.playerScore > state.opponentScore) {
        title = "YOU WON THE MATCH! 🎉";
        detail = `Final Score: ${state.playerScore} - ${state.opponentScore}`;
        icon = "🏆";
        type = "win";
        spawnConfetti(100);
    } else if (state.playerScore < state.opponentScore) {
        title = "YOU LOST THE MATCH 💀";
        detail = `Final Score: ${state.playerScore} - ${state.opponentScore}`;
        icon = "💔";
        type = "lose";
    } else {
        title = "MATCH DRAWN 🤝";
        detail = `Final Score: ${state.playerScore} - ${state.opponentScore}`;
        type = "draw";
    }

    showResultCustom(type, icon, title, detail);
    els.playAgainBtn.style.display = 'flex';
    els.playAgainBtn.querySelector('.btn-text').textContent = 'MAIN MENU';
}

function revealMultiplayerCards() {
    const pd = $('player-choice-display');
    const cd = $('cpu-choice-display');
    if (state.myChoice) {
        pd.innerHTML = '';
        pd.appendChild(createRevealedCard(state.myChoice));
    }
    if (state.opponentChoice) {
        cd.innerHTML = '';
        cd.appendChild(createRevealedCard(state.opponentChoice));
    }
}

function resetMultiplayerRound() {
    if (state.round >= state.totalRounds) {
        // Matches finished, play again means back to lobby or full reset
        leaveGame();
        return;
    }

    state.round++;
    els.roundNumber.textContent = `${state.round} / ${state.totalRounds}`;
    state.myChoice = null;
    state.opponentChoice = null;
    state.isPlaying = false;
    state.roundReady = false;
    state.playAgainReady = false;
    state.opponentPlayAgainReady = false;
    els.resultOverlay.classList.remove('active');
    resetCards();
    hideTimer();

    els.cpuThinking.querySelector('.thinking-text').textContent = 'Waiting...';

    // Host initiates next round
    setTimeout(() => {
        if (state.isHost && state.conn && state.conn.open) {
            state.conn.send({ type: 'ready' });
        }
        state.roundReady = true;
        // Host waits for opponent's ready to fire state-round
        if (state.isHost && state.opponentScreenReady) {
            state.conn.send({ type: 'start-round' });
            startMultiplayerRound();
        }
    }, 500);
}

// ===== SHOW RESULT =====
function showResult(result, myChoice, oppChoice) {
    const pName = CHOICES[myChoice].name;
    const cName = CHOICES[oppChoice].name;
    const pEmoji = CHOICES[myChoice].emoji;
    const cEmoji = CHOICES[oppChoice].emoji;

    if (result === 'win') {
        showResultCustom('win', '🏆', 'YOU WIN!', `${pEmoji} ${pName} beats ${cEmoji} ${cName}`);
        spawnConfetti(40);
    } else if (result === 'lose') {
        showResultCustom('lose', '💀', 'YOU LOSE!', `${cEmoji} ${cName} beats ${pEmoji} ${pName}`);
    } else {
        showResultCustom('draw', '🤝', "IT'S A DRAW!", `Both chose ${pEmoji} ${pName}`);
    }
}

function showResultCustom(type, icon, title, detail) {
    els.resultIcon.textContent = icon;
    els.resultTitle.textContent = title;
    els.resultTitle.className = 'result-title ' + type;
    els.resultDetail.textContent = detail;
    els.resultOverlay.classList.add('active');
}

// ===== PLAY AGAIN =====
function checkPlayAgainReady() {
    if (state.playAgainReady && state.opponentPlayAgainReady) {
        els.playAgainBtn.querySelector('.btn-text').textContent = 'PLAY AGAIN';
        resetMultiplayerRound();
    }
}

function playAgain() {
    if (state.mode === 'cpu') {
        state.isPlaying = false;
        state.round++;
        els.roundNumber.textContent = state.round;
        els.resultOverlay.classList.remove('active');
        resetCards();
        els.cpuThinking.querySelector('.thinking-text').textContent = 'CPU is ready';
    } else {
        // Multiplayer: notify opponent
        if (state.round >= state.totalRounds) {
            leaveGame(); // Match over, go to lobby
        } else {
            state.playAgainReady = true;
            els.playAgainBtn.querySelector('.btn-text').textContent = 'WAITING...';
            if (state.conn && state.conn.open) {
                state.conn.send({ type: 'play-again-ready' });
            }
            checkPlayAgainReady();
        }
    }
}

// ===== LEAVE GAME =====
function leaveGame() {
    stopTimer();
    if (state.conn) {
        state.conn.close();
        state.conn = null;
    }
    if (state.peer) {
        state.peer.destroy();
        state.peer = null;
    }
    state.isPlaying = false;
    state.myChoice = null;
    state.opponentChoice = null;
    state.roundReady = false;
    state.opponentScreenReady = false;
    state.playAgainReady = false;
    state.opponentPlayAgainReady = false;
    els.resultOverlay.classList.remove('active');
    els.playAgainBtn.style.display = 'flex';
    els.playAgainBtn.querySelector('.btn-text').textContent = 'PLAY AGAIN';

    // Reset room screen UI
    els.createRoomCard.style.display = '';
    els.joinRoomCard.style.display = '';
    els.waitingRoom.style.display = 'none';

    showScreen('lobby-screen');
}

// ===== CONNECTION STATUS =====
function setConnectionStatus(type, text) {
    const cs = els.connectionStatus;
    cs.className = 'connection-status';
    if (type === 'connected') cs.classList.add('connected');
    else if (type === 'error') cs.classList.add('error');
    if (text) cs.querySelector('.conn-text').textContent = text;
}

// ===== EVENT LISTENERS =====

// Lobby: CPU Mode
els.btnCpuMode.addEventListener('click', () => {
    state.mode = 'cpu';
    state.opponentName = 'CPU';
    setupGameScreen();
    showScreen('game-screen');
    hideTimer();
});

// Lobby: Friend Mode
els.btnFriendMode.addEventListener('click', () => {
    showScreen('room-screen');
});

// Room: Back
els.roomBackBtn.addEventListener('click', () => {
    if (state.peer) { state.peer.destroy(); state.peer = null; }
    els.createRoomCard.style.display = '';
    els.joinRoomCard.style.display = '';
    els.waitingRoom.style.display = 'none';
    showScreen('lobby-screen');
});

// Room: Create
els.btnCreateRoom.addEventListener('click', createRoom);

// Room: Join
els.btnJoinRoom.addEventListener('click', joinRoom);
els.joinCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinRoom();
});

// Copy code
els.copyCodeBtn.addEventListener('click', () => {
    const code = els.roomCodeValue.textContent;
    // Generate robust URL for sharing - works in dev and prod
    const urlObj = new URL(window.location.href);
    urlObj.searchParams.set('room', code);
    const shareUrl = urlObj.toString();

    navigator.clipboard.writeText(shareUrl).then(() => {
        els.copyCodeBtn.textContent = '✅';
        els.copyCodeBtn.classList.add('copied');
        setTimeout(() => {
            els.copyCodeBtn.textContent = '📋';
            els.copyCodeBtn.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        els.copyCodeBtn.textContent = '✅';
        setTimeout(() => els.copyCodeBtn.textContent = '📋', 2000);
    });
});

// Game: Weapon selection
els.weaponBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (state.mode === 'cpu') {
            playCpuRound(btn.dataset.choice);
        } else {
            handleMultiplayerChoice(btn.dataset.choice);
        }
    });
});

// Game: Play again
els.playAgainBtn.addEventListener('click', playAgain);

// Game: Leave
els.gameBackBtn.addEventListener('click', leaveGame);

// Rules toggle
els.rulesToggle.addEventListener('click', () => {
    els.rulesPanel.classList.toggle('active');
});
document.addEventListener('click', (e) => {
    if (!e.target.closest('.game-rules')) els.rulesPanel.classList.remove('active');
});

// Keyboard shortcuts (only in game screen when not in active round for MP)
document.addEventListener('keydown', (e) => {
    if (!$('game-screen').classList.contains('active')) return;
    if (state.mode === 'cpu' && state.isPlaying) return;
    if (state.mode === 'friend' && state.myChoice) return;

    const key = e.key.toLowerCase();
    if (key === '1' || key === 's') {
        if (state.mode === 'cpu') playCpuRound('snake');
        else handleMultiplayerChoice('snake');
    }
    if (key === '2' || key === 'w') {
        if (state.mode === 'cpu') playCpuRound('water');
        else handleMultiplayerChoice('water');
    }
    if (key === '3' || key === 'g') {
        if (state.mode === 'cpu') playCpuRound('gun');
        else handleMultiplayerChoice('gun');
    }
});

// ===== INIT =====
initLobby();
initParticles();

// Check for deep link
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');
if (roomParam) {
    // Wait until peerjs loads
    setTimeout(() => {
        showScreen('room-screen');
        els.joinCodeInput.value = roomParam;
        joinRoom(roomParam);
        // Clean URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
    }, 100);
}

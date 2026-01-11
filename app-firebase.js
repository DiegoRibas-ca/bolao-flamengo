// Versão com Firebase integrado
// Substitua app.js por este arquivo após configurar o Firebase

// Estado da aplicação
let currentUser = null;
let currentGameId = null;
let championships = [];
let games = [];
let bets = [];
let users = [];
let db = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar Firebase estar disponível
    if (window.firebaseDb) {
        db = window.firebaseDb;
        const { collection, getDocs, onSnapshot } = window.firebaseFunctions;
        
        // Escutar mudanças em tempo real
        setupRealtimeListeners(collection, onSnapshot);
    }
    
    initializeApp();
    setupEventListeners();
    await loadData();
});

function initializeApp() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }
}

function setupRealtimeListeners(collection, onSnapshot) {
    // Escutar jogos em tempo real
    const gamesRef = collection(db, 'games');
    onSnapshot(gamesRef, (snapshot) => {
        games = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderGames();
    });

    // Escutar campeonatos
    const champsRef = collection(db, 'championships');
    onSnapshot(champsRef, (snapshot) => {
        championships = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderChampionships();
        updateChampionshipFilters();
    });

    // Escutar ranking
    const usersRef = collection(db, 'users');
    onSnapshot(usersRef, (snapshot) => {
        users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderRanking();
    });
}

function setupEventListeners() {
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'block';
    });

    document.getElementById('submit-login').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    document.getElementById('championship-filter').addEventListener('change', filterGames);
    document.getElementById('status-filter').addEventListener('change', filterGames);
    
    const submitBetBtn = document.getElementById('submit-bet');
    if (submitBetBtn) {
        submitBetBtn.addEventListener('click', submitBet);
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const name = document.getElementById('login-name').value;

    if (!email || !name) {
        alert('Preencha todos os campos');
        return;
    }

    const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
    currentUser = { id: userId, email, name };

    // Salvar usuário no Firestore
    if (db) {
        const { setDoc, doc } = window.firebaseFunctions;
        await setDoc(doc(db, 'users', userId), {
            name: name,
            email: email,
            points: 0
        }, { merge: true });
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUserUI();
    document.getElementById('login-modal').style.display = 'none';
    
    document.getElementById('login-email').value = '';
    document.getElementById('login-name').value = '';

    await loadUserData();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserUI();
    bets = [];
    renderBets();
}

function updateUserUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const betsSection = document.getElementById('bets-section');

    if (currentUser) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('user-name').textContent = currentUser.name;
        betsSection.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        betsSection.style.display = 'none';
    }
}

async function loadData() {
    if (!db) {
        // Modo offline - usar dados de exemplo
        loadChampionshipsOffline();
        loadGamesOffline();
        loadRankingOffline();
        return;
    }

    const { collection, getDocs } = window.firebaseFunctions;
    
    await loadChampionships(collection, getDocs);
    await loadGames(collection, getDocs);
    await loadRanking(collection, getDocs);
    
    if (currentUser) {
        await loadUserData(collection, getDocs);
    }
}

async function loadChampionships(collection, getDocs) {
    try {
        const snapshot = await getDocs(collection(db, 'championships'));
        championships = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderChampionships();
        updateChampionshipFilters();
    } catch (error) {
        console.error('Erro ao carregar campeonatos:', error);
        loadChampionshipsOffline();
    }
}

function loadChampionshipsOffline() {
    championships = [
        { id: 'brasileirao', name: 'Brasileirão', weight: 3 },
        { id: 'libertadores', name: 'Libertadores', weight: 5 },
        { id: 'copa_brasil', name: 'Copa do Brasil', weight: 4 },
        { id: 'carioca', name: 'Carioca', weight: 2 }
    ];
    renderChampionships();
    updateChampionshipFilters();
}

async function loadGames(collection, getDocs) {
    try {
        const snapshot = await getDocs(collection(db, 'games'));
        games = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
            };
        });
        renderGames();
    } catch (error) {
        console.error('Erro ao carregar jogos:', error);
        loadGamesOffline();
    }
}

function loadGamesOffline() {
    games = [
        {
            id: '1',
            championship: 'brasileirao',
            opponent: 'Palmeiras',
            date: new Date('2024-03-15T20:00:00'),
            flamengoScore: null,
            opponentScore: null,
            status: 'upcoming',
            weight: 3
        }
    ];
    renderGames();
}

async function loadUserData(collection, getDocs) {
    if (!currentUser || !db) return;

    try {
        const { query, where } = window.firebaseFunctions;
        const betsRef = collection(db, 'bets');
        const q = query(betsRef, where('userId', '==', currentUser.id));
        const snapshot = await getDocs(q);
        
        bets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderBets();
    } catch (error) {
        console.error('Erro ao carregar palpites:', error);
    }
}

async function loadRanking(collection, getDocs) {
    if (!db) {
        loadRankingOffline();
        return;
    }

    try {
        const snapshot = await getDocs(collection(db, 'users'));
        users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderRanking();
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        loadRankingOffline();
    }
}

function loadRankingOffline() {
    users = [
        { id: 'user1', name: 'João', points: 45 },
        { id: 'user2', name: 'Maria', points: 38 }
    ];
    renderRanking();
}

function renderChampionships() {
    const container = document.getElementById('championships-list');
    container.innerHTML = championships.map(champ => `
        <div class="championship-card">
            <div class="championship-name">${champ.name}</div>
            <div class="championship-weight">Peso: ${champ.weight}x</div>
        </div>
    `).join('');
}

function renderGames() {
    const container = document.getElementById('games-list');
    const filteredGames = getFilteredGames();

    if (filteredGames.length === 0) {
        container.innerHTML = '<p>Nenhum jogo encontrado.</p>';
        return;
    }

    container.innerHTML = filteredGames.map(game => {
        const champ = championships.find(c => c.id === game.championship);
        const dateStr = new Date(game.date).toLocaleString('pt-BR');
        const score = game.flamengoScore !== null 
            ? `${game.flamengoScore} x ${game.opponentScore}`
            : 'A definir';

        return `
            <div class="game-card">
                <div class="game-header">
                    <div class="game-info">
                        <div class="game-teams">Flamengo vs ${game.opponent}</div>
                        <div class="game-date">${dateStr}</div>
                        <div class="game-status status-${game.status}">
                            ${getStatusText(game.status)}
                        </div>
                        <div>${champ?.name || ''} (Peso: ${game.weight}x)</div>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <strong>Placar:</strong> ${score}
                </div>
                ${currentUser && game.status === 'upcoming' ? `
                    <div class="game-actions">
                        <button class="btn btn-primary btn-small" onclick="openBetModal('${game.id}')">
                            Fazer Palpite
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function getFilteredGames() {
    const champFilter = document.getElementById('championship-filter').value;
    const statusFilter = document.getElementById('status-filter').value;

    return games.filter(game => {
        const champMatch = !champFilter || game.championship === champFilter;
        const statusMatch = !statusFilter || game.status === statusFilter;
        return champMatch && statusMatch;
    });
}

function filterGames() {
    renderGames();
}

function updateChampionshipFilters() {
    const filter = document.getElementById('championship-filter');
    const gameFilter = document.getElementById('game-championship');
    
    const options = championships.map(champ => 
        `<option value="${champ.id}">${champ.name}</option>`
    ).join('');

    filter.innerHTML = '<option value="">Todos os campeonatos</option>' + options;
    if (gameFilter) {
        gameFilter.innerHTML = '<option value="">Selecione o campeonato</option>' + options;
    }
}

function getStatusText(status) {
    const statusMap = {
        'upcoming': 'Próximo',
        'live': 'Ao vivo',
        'finished': 'Finalizado'
    };
    return statusMap[status] || status;
}

function openBetModal(gameId) {
    if (!currentUser) {
        alert('Faça login para fazer palpites');
        return;
    }

    currentGameId = gameId;
    const game = games.find(g => g.id === gameId);
    const champ = championships.find(c => c.id === game.championship);

    document.getElementById('bet-game-info').innerHTML = `
        <strong>Flamengo vs ${game.opponent}</strong><br>
        ${champ?.name || ''} - ${new Date(game.date).toLocaleString('pt-BR')}
    `;

    const existingBet = bets.find(b => b.gameId === gameId);
    if (existingBet) {
        document.getElementById('bet-flamengo').value = existingBet.flamengoScore;
        document.getElementById('bet-opponent').value = existingBet.opponentScore;
    } else {
        document.getElementById('bet-flamengo').value = '';
        document.getElementById('bet-opponent').value = '';
    }

    document.getElementById('bet-modal').style.display = 'block';
}

async function submitBet() {
    const flamengoScore = parseInt(document.getElementById('bet-flamengo').value);
    const opponentScore = parseInt(document.getElementById('bet-opponent').value);

    if (isNaN(flamengoScore) || isNaN(opponentScore)) {
        alert('Preencha os placares corretamente');
        return;
    }

    if (!db) {
        // Modo offline
        const existingIndex = bets.findIndex(b => b.gameId === currentGameId);
        const bet = {
            gameId: currentGameId,
            flamengoScore: flamengoScore,
            opponentScore: opponentScore
        };
        if (existingIndex >= 0) {
            bets[existingIndex] = bet;
        } else {
            bets.push(bet);
        }
        renderBets();
        document.getElementById('bet-modal').style.display = 'none';
        return;
    }

    try {
        const { setDoc, doc, Timestamp } = window.firebaseFunctions;
        const betId = `${currentUser.id}_${currentGameId}`;
        
        await setDoc(doc(db, 'bets', betId), {
            userId: currentUser.id,
            gameId: currentGameId,
            flamengoScore: flamengoScore,
            opponentScore: opponentScore,
            timestamp: Timestamp.now()
        });

        // Atualizar localmente
        const existingIndex = bets.findIndex(b => b.gameId === currentGameId);
        const bet = {
            id: betId,
            gameId: currentGameId,
            flamengoScore: flamengoScore,
            opponentScore: opponentScore
        };
        if (existingIndex >= 0) {
            bets[existingIndex] = bet;
        } else {
            bets.push(bet);
        }

        renderBets();
        document.getElementById('bet-modal').style.display = 'none';
        alert('Palpite salvo com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar palpite:', error);
        alert('Erro ao salvar palpite. Tente novamente.');
    }
}

function renderBets() {
    const container = document.getElementById('bets-list');
    
    if (bets.length === 0) {
        container.innerHTML = '<p>Você ainda não fez nenhum palpite.</p>';
        return;
    }

    container.innerHTML = bets.map(bet => {
        const game = games.find(g => g.id === bet.gameId);
        if (!game) return '';

        const champ = championships.find(c => c.id === game.championship);
        const result = game.status === 'finished' 
            ? calculatePoints(bet, game)
            : null;

        return `
            <div class="bet-card">
                <div class="game-teams">Flamengo vs ${game.opponent}</div>
                <div class="game-date">${champ?.name || ''}</div>
                <div style="margin: 10px 0;">
                    <strong>Seu palpite:</strong> ${bet.flamengoScore} x ${bet.opponentScore}
                </div>
                ${game.status === 'finished' ? `
                    <div>
                        <strong>Placar real:</strong> ${game.flamengoScore} x ${game.opponentScore}
                    </div>
                    <div style="margin-top: 5px; color: ${result > 0 ? 'green' : 'red'};">
                        <strong>Pontos: ${result}</strong>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function calculatePoints(bet, game) {
    const exactMatch = bet.flamengoScore === game.flamengoScore && 
                       bet.opponentScore === game.opponentScore;
    const correctResult = (bet.flamengoScore > bet.opponentScore && 
                          game.flamengoScore > game.opponentScore) ||
                         (bet.flamengoScore < bet.opponentScore && 
                          game.flamengoScore < game.opponentScore) ||
                         (bet.flamengoScore === bet.opponentScore && 
                          game.flamengoScore === game.opponentScore);
    const correctFlamengoScore = bet.flamengoScore === game.flamengoScore;
    const correctOpponentScore = bet.opponentScore === game.opponentScore;

    let points = 0;
    if (exactMatch) {
        points = 10 * game.weight;
    } else if (correctResult && (correctFlamengoScore || correctOpponentScore)) {
        points = 5 * game.weight;
    } else if (correctResult) {
        points = 3 * game.weight;
    } else if (correctFlamengoScore || correctOpponentScore) {
        points = 1 * game.weight;
    }

    return points;
}

function renderRanking() {
    const container = document.getElementById('ranking-list');
    
    const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));

    container.innerHTML = sortedUsers.map((user, index) => `
        <div class="ranking-item">
            <div class="ranking-position">${index + 1}º</div>
            <div class="ranking-name">${user.name}</div>
            <div class="ranking-points">${user.points || 0} pts</div>
        </div>
    `).join('');
}

window.openBetModal = openBetModal;

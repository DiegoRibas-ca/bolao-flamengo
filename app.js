// Helper para obter bcryptjs
function getBcrypt() {
    // bcryptjs pode estar em diferentes lugares dependendo de como foi carregado
    // Quando carregado via CDN, geralmente está disponível como 'bcrypt' globalmente
    
    // Debug: verificar o que está disponível
    console.log('[getBcrypt] Verificando disponibilidade do bcryptjs...');
    console.log('[getBcrypt] typeof window:', typeof window);
    console.log('[getBcrypt] window.bcrypt:', typeof window !== 'undefined' ? typeof window.bcrypt : 'N/A');
    console.log('[getBcrypt] typeof bcrypt:', typeof bcrypt);
    console.log('[getBcrypt] window.dcodeIO:', typeof window !== 'undefined' && window.dcodeIO ? typeof window.dcodeIO.bcrypt : 'N/A');
    
    if (typeof window !== 'undefined' && window.bcrypt) {
        console.log('[getBcrypt] Usando window.bcrypt');
        return window.bcrypt;
    }
    // Tentar acessar diretamente (pode estar no escopo global)
    if (typeof bcrypt !== 'undefined') {
        console.log('[getBcrypt] Usando bcrypt global');
        return bcrypt;
    }
    // Se ainda não encontrou, tentar acessar via dcodeIO (algumas versões do bcryptjs)
    if (typeof window !== 'undefined' && window.dcodeIO && window.dcodeIO.bcrypt) {
        console.log('[getBcrypt] Usando window.dcodeIO.bcrypt');
        return window.dcodeIO.bcrypt;
    }
    
    console.error('[getBcrypt] bcryptjs não encontrado!');
    throw new Error('bcryptjs não está disponível. Verifique se o CDN foi carregado no index.html');
}

// Estado da aplicação
let currentUser = null;
let currentGameId = null;
let championships = [];
let games = [];
let bets = [];
let users = [];
let players = []; // Elenco do Flamengo
let config = {
    maxGoals: 20,
    weights: {
        exactScore: 10,      // Cravar placar exato
        correctResult: 3,    // Acertar vitória/empate/derrota
        correctGoals: 2,     // Acertar número de gols de um time
        correctScorers: 5    // Acertar marcadores (por gol)
    },
    championshipWeights: {   // Pesos por campeonato (controlados pelo admin)
        brasileirao: 3,
        libertadores: 5,
        copa_brasil: 4,
        mundial: 6
    }
};
let db = null;
let unsubscribeFunctions = {}; // Armazenar funções de unsubscribe

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadData();
    initBannerAnimation();
});

let isInitialized = false;

function initializeApp() {
    if (isInitialized) {
        console.warn('[initializeApp] App já foi inicializado, pulando...');
        return;
    }
    
    console.log('[initializeApp] Inicializando app...');
    isInitialized = true;
    
    // Verificar se há usuário salvo
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }

    // Verificar se Firebase está disponível
    if (window.firebaseDb) {
        db = window.firebaseDb;
        setupRealtimeListeners();
    } else {
        // Tentar novamente após um pequeno delay se Firebase ainda não estiver pronto
        setTimeout(() => {
            if (window.firebaseDb && !db) {
                db = window.firebaseDb;
                setupRealtimeListeners();
            }
        }, 500);
    }
}

function setupRealtimeListeners() {
    if (!db) {
        console.log('[setupRealtimeListeners] DB não disponível, pulando...');
        return;
    }
    
    // Limpar listeners anteriores se existirem
    const existingListeners = Object.keys(unsubscribeFunctions).length;
    if (existingListeners > 0) {
        console.log(`[setupRealtimeListeners] Limpando ${existingListeners} listeners anteriores`);
        Object.values(unsubscribeFunctions).forEach(unsubscribe => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
    }
    unsubscribeFunctions = {};
    
    console.log('[setupRealtimeListeners] Criando novos listeners...');
    
    const { collection, onSnapshot } = window.firebaseFunctions;

    // Escutar jogos
    const unsubscribeGames = onSnapshot(collection(db, 'games'), (snapshot) => {
        // Mapear documentos para jogos
        const newGames = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
        }));
        
        // Remover duplicatas por ID (manter apenas o primeiro)
        const uniqueGames = [];
        const seenIds = new Set();
        newGames.forEach(game => {
            if (!seenIds.has(game.id)) {
                seenIds.add(game.id);
                uniqueGames.push(game);
            }
        });
        
        games = uniqueGames;
        
        console.log(`[Games Listener] Total de jogos: ${games.length} (únicos: ${uniqueGames.length}, duplicatas removidas: ${newGames.length - uniqueGames.length})`);
        
        if (document.getElementById('games-view').classList.contains('active')) {
            renderGames();
        }
        if (document.getElementById('ranking-view').classList.contains('active')) {
            calculateRanking(); // Função async
        }
    });
    unsubscribeFunctions.games = unsubscribeGames;

    // Escutar campeonatos
    const unsubscribeChampionships = onSnapshot(collection(db, 'championships'), (snapshot) => {
        championships = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        updateChampionshipFilters();
        if (document.getElementById('ranking-view').classList.contains('active')) {
            calculateRanking(); // Função async
        }
    });
    unsubscribeFunctions.championships = unsubscribeChampionships;

    // Escutar usuários
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        if (document.getElementById('ranking-view').classList.contains('active')) {
            calculateRanking(); // Função async
        }
    });
    unsubscribeFunctions.users = unsubscribeUsers;

    // Escutar palpites (será recriado quando o usuário fizer login)
    if (currentUser) {
        setupBetsListener();
    }

    // Escutar jogadores
    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
        players = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => (a.number || 999) - (b.number || 999));
        if (document.getElementById('players-tab').classList.contains('active')) {
            renderPlayers();
        }
    });
    unsubscribeFunctions.players = unsubscribePlayers;

    // Escutar configurações
    const unsubscribeConfig = onSnapshot(collection(db, 'config'), (snapshot) => {
        if (!snapshot.empty) {
            const configDoc = snapshot.docs[0].data();
            config = { ...config, ...configDoc };
            if (document.getElementById('config-tab').classList.contains('active')) {
                renderConfig();
            }
        }
    });
    unsubscribeFunctions.config = unsubscribeConfig;
}

function setupBetsListener() {
    if (!db || !currentUser) {
        console.log('[setupBetsListener] DB ou usuário não disponível, pulando...');
        return;
    }
    
    // Limpar listener anterior de bets se existir
    if (unsubscribeFunctions.bets) {
        console.log('[setupBetsListener] Limpando listener anterior de bets');
        unsubscribeFunctions.bets();
        unsubscribeFunctions.bets = null;
    }
    
    console.log('[setupBetsListener] Criando novo listener de bets para usuário:', currentUser.id);
    
    const { collection, query, where, onSnapshot } = window.firebaseFunctions;
    const unsubscribeBets = onSnapshot(query(collection(db, 'bets'), where('userId', '==', currentUser.id)), (snapshot) => {
        const newBets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Remover duplicatas
        const uniqueBets = [];
        const seenBetIds = new Set();
        newBets.forEach(bet => {
            if (!seenBetIds.has(bet.id)) {
                seenBetIds.add(bet.id);
                uniqueBets.push(bet);
            }
        });
        
        bets = uniqueBets;
        console.log(`[Bets Listener] Total de palpites: ${bets.length}`);
        
        if (document.getElementById('my-bets-view').classList.contains('active')) {
            renderBets();
        }
        // Atualizar jogos para mostrar palpites atualizados
        if (document.getElementById('games-view').classList.contains('active')) {
            renderGames();
        }
    });
    unsubscribeFunctions.bets = unsubscribeBets;
}

function setupEventListeners() {
    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });

    // Login
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'block';
    });

    document.getElementById('submit-login').addEventListener('click', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Modals
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.style.display = 'none';
            
            // Destruir gráficos do participante se o modal for fechado
            if (modal.id === 'participant-charts-modal') {
                Object.values(participantChartsInstances).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
                participantChartsInstances = {};
            }
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            
            // Destruir gráficos do participante se o modal for fechado
            if (e.target.id === 'participant-charts-modal') {
                Object.values(participantChartsInstances).forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
                participantChartsInstances = {};
            }
        }
    });

    // Filtros
    document.getElementById('championship-filter')?.addEventListener('change', filterGames);
    document.getElementById('status-filter')?.addEventListener('change', filterGames);
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchAdminTab(tabName);
        });
    });

    // Admin actions
    document.getElementById('add-game-btn')?.addEventListener('click', () => openGameModal());
    document.getElementById('submit-game')?.addEventListener('click', saveGame);
    document.getElementById('add-player-btn')?.addEventListener('click', addPlayer);
    document.getElementById('send-invite-btn')?.addEventListener('click', sendInvite);
    document.getElementById('save-config')?.addEventListener('click', saveConfig);
    document.getElementById('import-games-btn')?.addEventListener('click', parseImportData);
    document.getElementById('confirm-import-btn')?.addEventListener('click', confirmImport);
    document.getElementById('cancel-import-btn')?.addEventListener('click', () => {
        document.getElementById('import-modal').style.display = 'none';
    });
    document.getElementById('import-players-btn')?.addEventListener('click', parseImportPlayersData);
    document.getElementById('confirm-import-players-btn')?.addEventListener('click', confirmImportPlayers);
    document.getElementById('cancel-import-players-btn')?.addEventListener('click', () => {
        document.getElementById('import-players-modal').style.display = 'none';
    });
    document.getElementById('add-game-scorer-btn')?.addEventListener('click', addGameScorerInput);
    document.getElementById('submit-player-edit')?.addEventListener('click', savePlayerEdit);

    // Bet
    document.getElementById('submit-bet')?.addEventListener('click', submitBet);
    document.getElementById('add-scorer-btn')?.addEventListener('click', addScorerInput);
    
    // Profile
    document.getElementById('change-password-btn')?.addEventListener('click', () => {
        document.getElementById('change-password-modal').style.display = 'block';
    });
    document.getElementById('submit-change-password')?.addEventListener('click', changePassword);
    document.getElementById('cancel-change-password')?.addEventListener('click', () => {
        document.getElementById('change-password-modal').style.display = 'none';
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('change-password-error').style.display = 'none';
    });
    
    // Admin - Reset Password
    document.getElementById('submit-reset-password')?.addEventListener('click', resetUserPassword);
    document.getElementById('cancel-reset-password')?.addEventListener('click', () => {
        document.getElementById('reset-password-modal').style.display = 'none';
        document.getElementById('reset-password-new').value = '';
        document.getElementById('reset-password-confirm').value = '';
        document.getElementById('reset-password-error').style.display = 'none';
        window.resetPasswordUserId = null;
    });
}

function switchView(viewName) {
    // Esconder todas as views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Mostrar view selecionada
    document.getElementById(`${viewName}-view`).classList.add('active');
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Carregar dados específicos
    if (viewName === 'ranking') {
        calculateRanking(); // Função async, mas não precisa await aqui
    } else if (viewName === 'games') {
        renderGames();
    } else if (viewName === 'my-bets' && currentUser) {
        loadUserBets();
        renderBets();
    } else if (viewName === 'profile' && currentUser) {
        renderProfile();
    } else if (viewName === 'admin' && currentUser?.isAdmin) {
        loadAdminData();
    }
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'config') {
        renderConfig();
    } else if (tabName === 'games') {
        renderAdminGames();
    } else if (tabName === 'players') {
        renderPlayers();
    } else if (tabName === 'invites') {
        loadInvites();
    } else if (tabName === 'users') {
        loadUsers();
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) {
        errorEl.textContent = 'Preencha todos os campos';
        errorEl.style.display = 'block';
        return;
    }

    if (db) {
        // Buscar usuário no Firestore
        const { collection, getDocs, query, where } = window.firebaseFunctions;
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            errorEl.textContent = 'Email não encontrado';
            errorEl.style.display = 'block';
            return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Verificar senha usando bcrypt
        let passwordValid = false;
        if (userData.password) {
            try {
                const bcryptLib = getBcrypt();
                console.log('[Login] bcryptjs encontrado:', !!bcryptLib);
                console.log('[Login] Tipo de senha no DB:', userData.password.startsWith('$2a$') || userData.password.startsWith('$2b$') ? 'hash' : 'texto plano');
                console.log('[Login] Primeiros caracteres do hash:', userData.password.substring(0, 20));
                
                // Verificar se a senha está em hash (começa com $2a$ ou $2b$)
                if (userData.password.startsWith('$2a$') || userData.password.startsWith('$2b$')) {
                    // Senha está em hash, comparar usando bcrypt
                    console.log('[Login] Comparando senha com hash...');
                    passwordValid = bcryptLib.compareSync(password, userData.password);
                    console.log('[Login] Resultado da comparação:', passwordValid);
                    
                    if (!passwordValid) {
                        console.warn('[Login] Senha não corresponde ao hash. Verificando se bcrypt está funcionando...');
                        // Teste de diagnóstico
                        const testHash = bcryptLib.hashSync('test', 10);
                        const testCompare = bcryptLib.compareSync('test', testHash);
                        console.log('[Login] Teste de bcrypt:', testCompare ? 'OK' : 'FALHOU');
                    }
                } else {
                    // Senha antiga em texto plano (migração gradual)
                    // Comparar diretamente e, se válida, atualizar para hash
                    console.log('[Login] Senha em texto plano, comparando diretamente...');
                    if (userData.password === password) {
                        passwordValid = true;
                        console.log('[Login] Senha correta, migrando para hash...');
                        // Atualizar para hash (opcional, pode fazer em background)
                        try {
                            const hashedPassword = bcryptLib.hashSync(password, 10);
                            const { setDoc, doc } = window.firebaseFunctions;
                            await setDoc(doc(db, 'users', userDoc.id), {
                                password: hashedPassword
                            }, { merge: true });
                            console.log('[Login] Senha migrada para hash com sucesso');
                        } catch (error) {
                            console.error('Erro ao atualizar senha para hash:', error);
                        }
                    } else {
                        console.log('[Login] Senha em texto plano não corresponde');
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar senha:', error);
                console.error('Stack trace:', error.stack);
                errorEl.textContent = 'Erro de configuração. Recarregue a página.';
                errorEl.style.display = 'block';
                return;
            }
        } else {
            console.warn('[Login] Usuário não tem senha definida');
        }
        
        if (!passwordValid) {
            errorEl.textContent = 'Senha incorreta';
            errorEl.style.display = 'block';
            return;
        }

        currentUser = {
            id: userDoc.id,
            ...userData
        };

        // Se o usuário foi convidado e ainda não aceitou, marcar como aceito agora
        if (userData.invited && !userData.acceptedAt && db) {
            try {
                const { setDoc, doc, Timestamp } = window.firebaseFunctions;
                await setDoc(doc(db, 'users', userDoc.id), {
                    acceptedAt: Timestamp.now()
                }, { merge: true });
                // Atualizar lista de convites se estiver na aba de convites
                if (document.getElementById('invites-tab')?.classList.contains('active')) {
                    setTimeout(() => loadInvites(), 500);
                }
            } catch (error) {
                console.error('Erro ao marcar convite como aceito:', error);
            }
        }
        
        // Configurar listener de palpites após login
        if (db) {
            setupBetsListener();
        }
    } else {
        // Modo offline
        currentUser = {
            id: email.replace(/[^a-zA-Z0-9]/g, '_'),
            email: email,
            name: email.split('@')[0],
            isAdmin: email === 'admin@flamengo.com'
        };
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateUserUI();
    document.getElementById('login-modal').style.display = 'none';
    errorEl.style.display = 'none';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';

    if (currentUser && db) {
        await loadUserBets();
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Limpar listener de bets ao fazer logout
    if (unsubscribeFunctions.bets) {
        unsubscribeFunctions.bets();
        unsubscribeFunctions.bets = null;
    }
    
    bets = []; // Limpar palpites locais
    
    updateUserUI();
    switchView('ranking');
    
    // Atualizar visualização de jogos para remover seção de palpite
    if (document.getElementById('games-view').classList.contains('active')) {
        renderGames();
    }
}

function updateUserUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const myBetsNav = document.getElementById('my-bets-nav');
    const profileNav = document.getElementById('profile-nav');
    const adminNav = document.getElementById('admin-nav');

    if (currentUser) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';
        document.getElementById('user-name').textContent = currentUser.name;
        myBetsNav.style.display = 'block';
        profileNav.style.display = 'block';
        
        if (currentUser.isAdmin) {
            adminNav.style.display = 'block';
        }
        
        // Atualizar informações do perfil se estiver na view de perfil
        if (document.getElementById('profile-view')?.classList.contains('active')) {
            renderProfile();
        }
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        myBetsNav.style.display = 'none';
        profileNav.style.display = 'none';
        adminNav.style.display = 'none';
    }
}

async function loadData() {
    if (db) {
        // Dados serão carregados via listeners em tempo real
        return;
    }

    // Dados offline para teste
    loadOfflineData();
}

function loadOfflineData() {
    championships = [
        { id: 'brasileirao', name: 'Brasileirão Série A', weight: 3 },
        { id: 'libertadores', name: 'Libertadores', weight: 5 },
        { id: 'copa_brasil', name: 'Copa do Brasil', weight: 4 },
        { id: 'mundial', name: 'Mundial', weight: 6 }
    ];

    games = [
        {
            id: '1',
            championship: 'brasileirao',
            opponent: 'Palmeiras',
            date: new Date('2026-03-15T20:00:00'),
            flamengoScore: null,
            opponentScore: null,
            status: 'upcoming',
            scorers: []
        }
    ];

    players = [
        { id: '1', name: 'Gabigol', number: 10 },
        { id: '2', name: 'Pedro', number: 9 },
        { id: '3', name: 'Arrascaeta', number: 14 }
    ];

    updateChampionshipFilters();
    renderGames();
    calculateRanking();
}

function updateChampionshipFilters() {
    const filter = document.getElementById('championship-filter');
    const gameFilter = document.getElementById('game-championship');
    
    // Coletar todos os campeonatos (da lista + dos jogos)
    const allChampIds = new Set();
    championships.forEach(c => allChampIds.add(c.id));
    games.forEach(g => {
        if (g.championship) allChampIds.add(g.championship);
    });
    
    // Criar lista completa de campeonatos
    const allChampionships = [...championships];
    allChampIds.forEach(champId => {
        if (!championships.find(c => c.id === champId)) {
            allChampionships.push({
                id: champId,
                name: champId.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
            });
        }
    });
    
    const options = allChampionships.map(champ => 
        `<option value="${champ.id}">${champ.name}</option>`
    ).join('');

    if (filter) {
        filter.innerHTML = '<option value="">Todos os campeonatos</option>' + options;
    }
    if (gameFilter) {
        gameFilter.innerHTML = '<option value="">Selecione o campeonato</option>' + options;
    }
}

async function renderGames() {
    const container = document.getElementById('games-list');
    
    // Verificar duplicatas antes de filtrar
    const gameIds = games.map(g => g.id);
    const duplicateIds = gameIds.filter((id, index) => gameIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        console.warn('[renderGames] Duplicatas detectadas:', duplicateIds);
        // Remover duplicatas mantendo apenas o primeiro
        const seen = new Set();
        games = games.filter(game => {
            if (seen.has(game.id)) {
                return false;
            }
            seen.add(game.id);
            return true;
        });
    }
    
    const filteredGames = getFilteredGames();
    
    console.log(`[renderGames] Total de jogos no array: ${games.length}, Filtrados: ${filteredGames.length}`);

    if (filteredGames.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Nenhum jogo encontrado.</p>';
        return;
    }

    // Garantir que não há duplicatas nos jogos filtrados
    const seenFilteredIds = new Set();
    const uniqueFilteredGames = filteredGames.filter(game => {
        if (seenFilteredIds.has(game.id)) {
            console.warn(`[renderGames] Duplicata removida no filtro: ${game.id}`);
            return false;
        }
        seenFilteredIds.add(game.id);
        return true;
    });
    
    console.log(`[renderGames] Renderizando ${uniqueFilteredGames.length} jogos únicos`);

    // Buscar todos os palpites de jogos que estão ao vivo ou finalizados
    const liveOrFinishedGames = uniqueFilteredGames.filter(g => g.status === 'live' || g.status === 'finished');
    const allBetsMap = {}; // Mapa: gameId -> array de palpites
    
    if (liveOrFinishedGames.length > 0 && db) {
        try {
            const { collection, getDocs } = window.firebaseFunctions;
            // Buscar todos os palpites de uma vez
            const allBetsSnapshot = await getDocs(collection(db, 'bets'));
            const allBetsData = allBetsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Agrupar palpites por gameId
            liveOrFinishedGames.forEach(game => {
                allBetsMap[game.id] = allBetsData.filter(b => b.gameId === game.id);
            });
        } catch (error) {
            console.error('Erro ao buscar palpites:', error);
        }
    }

    container.innerHTML = uniqueFilteredGames.map(game => {
        const champ = championships.find(c => c.id === game.championship);
        const gameDate = game.date?.toDate ? game.date.toDate() : new Date(game.date);
        const dateStr = gameDate.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        const timeStr = gameDate.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const score = game.flamengoScore !== null 
            ? `${game.flamengoScore} x ${game.opponentScore}`
            : 'A definir';

        // Buscar palpite do usuário atual para este jogo
        const userBet = currentUser ? bets.find(b => b.gameId === game.id && b.userId === currentUser.id) : null;
        const canEditBet = currentUser && game.status === 'upcoming' && !(game.status === 'live' || game.status === 'finished');
        const canMakeBet = currentUser && game.status === 'upcoming' && !userBet;

        // Buscar todos os palpites deste jogo se estiver ao vivo ou finalizado
        const allGameBets = (game.status === 'live' || game.status === 'finished') 
            ? (allBetsMap[game.id] || [])
            : [];

        // Formatar marcadores do palpite do usuário
        let betScorersText = '';
        if (userBet && userBet.scorers && userBet.scorers.length > 0) {
            const scorerNames = userBet.scorers.map(sId => {
                const player = players.find(p => p.id === sId);
                return player ? (player.abbreviation || player.name) : '?';
            });
            betScorersText = scorerNames.join(', ');
        }

        // Função helper para formatar marcadores de qualquer palpite
        const formatScorers = (scorers) => {
            if (!scorers || scorers.length === 0) return '';
            return scorers.map(sId => {
                const player = players.find(p => p.id === sId);
                return player ? (player.abbreviation || player.name) : '?';
            }).join(', ');
        };

        return `
            <div class="game-card">
                <div class="game-card-header">
                    <div class="game-teams-container">
                        <span class="game-team home-team">Flamengo</span>
                        <span class="game-vs">vs</span>
                        <span class="game-team away-team">${game.opponent}</span>
                    </div>
                    <div class="game-status status-${game.status}">
                        ${getStatusText(game.status)}
                    </div>
                </div>
                
                <div class="game-details">
                    <div class="game-detail-item">
                        <span class="game-detail-label">📅 Data:</span>
                        <span class="game-detail-value">${dateStr}</span>
                    </div>
                    <div class="game-detail-item">
                        <span class="game-detail-label">🕐 Hora:</span>
                        <span class="game-detail-value">${timeStr}</span>
                    </div>
                    <div class="game-detail-item">
                        <span class="game-detail-label">🏆 Campeonato:</span>
                        <span class="game-detail-value">${champ?.name || 'N/A'}</span>
                    </div>
                    <div class="game-detail-item">
                        <span class="game-detail-label">⚽ Placar:</span>
                        <span class="game-detail-value game-score">${score}</span>
                    </div>
                </div>

                ${game.status === 'upcoming' ? `
                    ${currentUser ? `
                        <div class="game-bet-display ${userBet ? 'has-bet' : 'no-bet'}">
                            ${userBet ? `
                                <div class="game-bet-header">
                                    <span class="game-bet-label">🎯 Seu Palpite:</span>
                                    <span class="game-bet-score">${userBet.flamengoScore} x ${userBet.opponentScore}</span>
                                </div>
                                ${betScorersText ? `
                                    <div class="game-bet-scorers">
                                        <span class="game-bet-scorers-label">Marcadores:</span>
                                        <span class="game-bet-scorers-value">${betScorersText}</span>
                                    </div>
                                ` : ''}
                            ` : `
                                <div class="game-bet-empty">
                                    <span class="game-bet-empty-icon">📝</span>
                                    <span class="game-bet-empty-text">Ainda não foi feito palpite para este jogo</span>
                                </div>
                            `}
                        </div>
                    ` : ''}
                ` : `
                    <div class="all-bets-section">
                        <div class="all-bets-header">
                            <h3>${game.status === 'live' ? '🔴 Palpites dos Participantes' : '📊 Palpites dos Participantes'}</h3>
                            <span class="bets-count">${allGameBets.length} palpite${allGameBets.length !== 1 ? 's' : ''}</span>
                        </div>
                        ${allGameBets.length > 0 ? `
                            <div class="all-bets-list">
                                ${allGameBets
                                    .sort((a, b) => {
                                        // Seu próprio palpite sempre primeiro
                                        if (currentUser) {
                                            if (a.userId === currentUser.id) return -1;
                                            if (b.userId === currentUser.id) return 1;
                                        }
                                        // Se o jogo está finalizado, ordenar por pontos (mais pontos primeiro)
                                        if (game.status === 'finished' && game.flamengoScore !== null) {
                                            const pointsA = calculatePoints(a, game).points;
                                            const pointsB = calculatePoints(b, game).points;
                                            if (pointsB !== pointsA) return pointsB - pointsA;
                                        }
                                        // Caso contrário, ordenar por nome
                                        const userA = users.find(u => u.id === a.userId);
                                        const userB = users.find(u => u.id === b.userId);
                                        const nameA = userA ? userA.name : '';
                                        const nameB = userB ? userB.name : '';
                                        return nameA.localeCompare(nameB);
                                    })
                                    .map(bet => {
                                    const betUser = users.find(u => u.id === bet.userId);
                                    const userName = betUser ? betUser.name : 'Participante';
                                    const isCurrentUser = currentUser && bet.userId === currentUser.id;
                                    const betScorers = formatScorers(bet.scorers);
                                    
                                    // Calcular pontos se o jogo estiver finalizado
                                    let pointsInfo = '';
                                    if (game.status === 'finished' && game.flamengoScore !== null) {
                                        const result = calculatePoints(bet, game);
                                        pointsInfo = `
                                            <div class="bet-points ${result.points > 0 ? 'points-positive' : 'points-zero'}">
                                                <span class="points-label">Pontos:</span>
                                                <span class="points-value">${result.points.toFixed(1)}</span>
                                                ${result.points > 0 ? `<span class="points-breakdown">(${result.breakdown})</span>` : ''}
                                            </div>
                                        `;
                                    }
                                    
                                    return `
                                        <div class="participant-bet-card ${isCurrentUser ? 'current-user-bet' : ''}">
                                            <div class="participant-bet-header">
                                                <span class="participant-name ${isCurrentUser ? 'you-label' : ''}">
                                                    ${isCurrentUser ? '👤 Você' : `👤 ${userName}`}
                                                </span>
                                                <span class="participant-bet-score">${bet.flamengoScore} x ${bet.opponentScore}</span>
                                            </div>
                                            ${betScorers ? `
                                                <div class="participant-bet-scorers">
                                                    <span class="scorers-label">Marcadores:</span>
                                                    <span class="scorers-value">${betScorers}</span>
                                                </div>
                                            ` : ''}
                                            ${pointsInfo}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : `
                            <div class="no-bets-message">
                                <p>Nenhum participante fez palpite para este jogo ainda.</p>
                            </div>
                        `}
                    </div>
                `}

                <div class="game-actions">
                    ${canMakeBet ? `
                        <button class="btn btn-primary btn-small" onclick="openBetModal('${game.id}')">
                            Fazer Palpite
                        </button>
                    ` : ''}
                    ${userBet && canEditBet ? `
                        <button class="btn btn-secondary btn-small" onclick="openBetModal('${game.id}')">
                            Editar Palpite
                        </button>
                    ` : ''}
                    ${userBet && (game.status === 'live' || game.status === 'finished') ? `
                        <button class="btn btn-secondary btn-small" disabled style="opacity: 0.6; cursor: not-allowed;">
                            ${game.status === 'live' ? 'Jogo ao vivo - Palpite bloqueado' : 'Jogo finalizado'}
                        </button>
                    ` : ''}
                    ${currentUser?.isAdmin ? `
                        <button class="btn btn-secondary btn-small" onclick="openGameModal('${game.id}')">
                            Editar Jogo
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getFilteredGames() {
    const champFilter = document.getElementById('championship-filter')?.value || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';

    // Filtrar jogos
    let filtered = games.filter(game => {
        const champMatch = !champFilter || game.championship === champFilter;
        
        // Por padrão, não mostrar jogos finalizados (só mostrar se o filtro estiver selecionado)
        let statusMatch;
        if (statusFilter) {
            // Se há filtro selecionado, mostrar apenas os jogos com esse status
            statusMatch = game.status === statusFilter;
        } else {
            // Se não há filtro, ocultar jogos finalizados
            statusMatch = game.status !== 'finished';
        }
        
        return champMatch && statusMatch;
    });

    // Ordenar por data crescente (mais antigos primeiro)
    filtered.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
    });

    return filtered;
}

function filterGames() {
    renderGames();
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
    
    // Verificar se o jogo está ao vivo ou finalizado
    if (game && (game.status === 'live' || game.status === 'finished')) {
        alert('Este jogo está ' + (game.status === 'live' ? 'ao vivo' : 'finalizado') + '. Não é possível fazer ou alterar palpites.');
        return;
    }
    
    const champ = championships.find(c => c.id === game.championship);

    document.getElementById('bet-game-info').innerHTML = `
        <strong>Flamengo vs ${game.opponent}</strong><br>
        ${champ?.name || ''} - ${new Date(game.date).toLocaleString('pt-BR')}
    `;

    // Limitar gols
    const maxGoals = config.maxGoals || 20;
    document.getElementById('bet-flamengo').max = maxGoals;
    document.getElementById('bet-opponent').max = maxGoals;

    // Carregar palpite existente
    const existingBet = bets.find(b => b.gameId === gameId);
    if (existingBet) {
        document.getElementById('bet-flamengo').value = existingBet.flamengoScore;
        document.getElementById('bet-opponent').value = existingBet.opponentScore;
        renderScorers(existingBet.scorers || []);
    } else {
        document.getElementById('bet-flamengo').value = '';
        document.getElementById('bet-opponent').value = '';
        document.getElementById('scorers-list').innerHTML = '';
    }

    document.getElementById('bet-modal').style.display = 'block';
}

// Armazenar instâncias do Choices.js para poder destruir quando necessário
let choicesInstances = new Map();

function addScorerInput() {
    const container = document.getElementById('scorers-list');
    const scorerDiv = document.createElement('div');
    scorerDiv.className = 'scorer-item';
    scorerDiv.setAttribute('data-scorer-id', Date.now().toString());
    
    const select = document.createElement('select');
    select.className = 'player-select';
    select.innerHTML = '<option value="">Digite para buscar jogador...</option>' +
        players.map(p => `<option value="${p.id}">${p.number ? `${p.number} - ` : ''}${p.name}${p.abbreviation ? ` (${p.abbreviation})` : ''}</option>`).join('');
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-small';
    removeBtn.textContent = 'Remover';
    removeBtn.onclick = () => {
        const scorerId = scorerDiv.getAttribute('data-scorer-id');
        if (choicesInstances.has(scorerId)) {
            choicesInstances.get(scorerId).destroy();
            choicesInstances.delete(scorerId);
        }
        scorerDiv.remove();
    };
    
    scorerDiv.appendChild(select);
    scorerDiv.appendChild(removeBtn);
    container.appendChild(scorerDiv);
    
    // Inicializar Choices.js após o elemento ser adicionado ao DOM
    setTimeout(() => {
        if (typeof Choices !== 'undefined') {
            const scorerId = scorerDiv.getAttribute('data-scorer-id');
            const choices = new Choices(select, {
                searchEnabled: true,
                searchChoices: true,
                searchFields: ['label', 'value'],
                placeholder: true,
                placeholderValue: 'Digite para buscar jogador...',
                searchPlaceholderValue: 'Buscar por nome, número ou abreviação...',
                itemSelectText: '',
                shouldSort: true,
                fuseOptions: {
                    threshold: 0.3,
                    keys: ['label']
                }
            });
            choicesInstances.set(scorerId, choices);
        }
    }, 100);
}

function renderScorers(scorers) {
    const container = document.getElementById('scorers-list');
    container.innerHTML = '';
    
    // Limpar instâncias antigas
    choicesInstances.forEach(choice => choice.destroy());
    choicesInstances.clear();
    
    scorers.forEach(scorerId => {
        const scorerDiv = document.createElement('div');
        scorerDiv.className = 'scorer-item';
        scorerDiv.setAttribute('data-scorer-id', Date.now().toString() + Math.random());
        
        const select = document.createElement('select');
        select.className = 'player-select';
        select.innerHTML = '<option value="">Digite para buscar jogador...</option>' +
            players.map(p => `<option value="${p.id}" ${p.id === scorerId ? 'selected' : ''}>${p.number ? `${p.number} - ` : ''}${p.name}${p.abbreviation ? ` (${p.abbreviation})` : ''}</option>`).join('');
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.textContent = 'Remover';
        removeBtn.onclick = () => {
            const scorerIdAttr = scorerDiv.getAttribute('data-scorer-id');
            if (choicesInstances.has(scorerIdAttr)) {
                choicesInstances.get(scorerIdAttr).destroy();
                choicesInstances.delete(scorerIdAttr);
            }
            scorerDiv.remove();
        };
        
        scorerDiv.appendChild(select);
        scorerDiv.appendChild(removeBtn);
        container.appendChild(scorerDiv);
        
        // Inicializar Choices.js após o elemento ser adicionado ao DOM
        setTimeout(() => {
            if (typeof Choices !== 'undefined') {
                const scorerIdAttr = scorerDiv.getAttribute('data-scorer-id');
                const choices = new Choices(select, {
                    searchEnabled: true,
                    searchChoices: true,
                    searchFields: ['label', 'value'],
                    placeholder: true,
                    placeholderValue: 'Digite para buscar jogador...',
                    searchPlaceholderValue: 'Buscar por nome, número ou abreviação...',
                    itemSelectText: '',
                    shouldSort: true,
                    fuseOptions: {
                        threshold: 0.3,
                        keys: ['label']
                    }
                });
                // Definir valor selecionado
                if (scorerId) {
                    choices.setChoiceByValue(scorerId);
                }
                choicesInstances.set(scorerIdAttr, choices);
            }
        }, 100);
    });
}

async function submitBet() {
    const flamengoScore = parseInt(document.getElementById('bet-flamengo').value);
    const opponentScore = parseInt(document.getElementById('bet-opponent').value);

    if (isNaN(flamengoScore) || isNaN(opponentScore)) {
        alert('Preencha os placares corretamente');
        return;
    }

    // Coletar marcadores (compatível com Choices.js)
    const scorerSelects = document.querySelectorAll('#scorers-list select');
    const scorers = Array.from(scorerSelects)
        .map(select => {
            // Se Choices.js está sendo usado, pegar o valor do Choices
            const choicesInstance = Array.from(choicesInstances.values()).find(c => c.passedElement.element === select);
            if (choicesInstance) {
                return choicesInstance.getValue(true); // true = retorna apenas valores
            }
            return select.value;
        })
        .filter(id => id);

    // Validar número de marcadores
    if (scorers.length > flamengoScore) {
        alert(`Você selecionou ${scorers.length} marcadores, mas o Flamengo tem apenas ${flamengoScore} gols no seu palpite.`);
        return;
    }

    const betData = {
        userId: currentUser.id,
        gameId: currentGameId,
        flamengoScore: flamengoScore,
        opponentScore: opponentScore,
        scorers: scorers,
        timestamp: new Date()
    };

    if (db) {
        try {
            const { setDoc, doc, Timestamp } = window.firebaseFunctions;
            const betId = `${currentUser.id}_${currentGameId}`;
            
            await setDoc(doc(db, 'bets', betId), {
                ...betData,
                timestamp: Timestamp.now()
            });

            // Atualizar lista local de palpites
            const existingIndex = bets.findIndex(b => b.gameId === currentGameId);
            if (existingIndex >= 0) {
                bets[existingIndex] = { ...betData, id: betId };
            } else {
                bets.push({ ...betData, id: betId });
            }

            alert('Palpite salvo com sucesso!');
            document.getElementById('bet-modal').style.display = 'none';
            
            // Atualizar visualização dos jogos para mostrar o palpite
            renderGames();
        } catch (error) {
            console.error('Erro ao salvar palpite:', error);
            alert('Erro ao salvar palpite. Tente novamente.');
        }
    } else {
        // Modo offline
        const existingIndex = bets.findIndex(b => b.gameId === currentGameId);
        if (existingIndex >= 0) {
            bets[existingIndex] = betData;
        } else {
            bets.push(betData);
        }
        alert('Palpite salvo!');
        document.getElementById('bet-modal').style.display = 'none';
        
        // Atualizar visualização dos jogos para mostrar o palpite
        renderGames();
    }
}

async function loadUserBets() {
    if (!currentUser || !db) return;

    try {
        const { collection, getDocs, query, where } = window.firebaseFunctions;
        const betsRef = collection(db, 'bets');
        const q = query(betsRef, where('userId', '==', currentUser.id));
        const snapshot = await getDocs(q);
        
        bets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Erro ao carregar palpites:', error);
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

        const scorersText = bet.scorers && bet.scorers.length > 0
            ? bet.scorers.map(sId => {
                const player = players.find(p => p.id === sId);
                return player ? player.name : 'Desconhecido';
            }).join(', ')
            : 'Nenhum marcador selecionado';

        return `
            <div class="bet-card">
                <div class="bet-card-header">
                    <div>
                        <strong>Flamengo vs ${game.opponent}</strong><br>
                        <small>${champ?.name || ''} - ${new Date(game.date).toLocaleString('pt-BR')}</small>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <strong>Seu palpite:</strong> ${bet.flamengoScore} x ${bet.opponentScore}
                </div>
                <div class="bet-scorers-list">
                    <strong>Marcadores:</strong> ${scorersText}
                </div>
                ${game.status === 'finished' ? `
                    <div style="margin-top: 10px;">
                        <strong>Placar real:</strong> ${game.flamengoScore} x ${game.opponentScore}
                    </div>
                    <div style="margin-top: 5px; color: ${result.points > 0 ? 'green' : 'red'}; font-weight: bold;">
                        Pontos: ${result.points} (${result.breakdown})
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function calculatePoints(bet, game) {
    const champId = game.championship;
    const champWeight = config.championshipWeights[champId] || 1;
    const weights = config.weights;

    let points = 0;
    const breakdown = [];
    let hasScoredMainCriteria = false; // Flag para indicar se já pontuou por um dos 3 critérios principais

    // 1. Cravar resultado (placar exato) - PRIORIDADE MÁXIMA
    // Se acertou o placar exato, NÃO pode pontuar por resultado ou gols de um time
    if (bet.flamengoScore === game.flamengoScore && bet.opponentScore === game.opponentScore) {
        points += weights.exactScore * champWeight;
        breakdown.push('Placar exato');
        hasScoredMainCriteria = true; // Já pontuou, não pode pontuar pelos outros critérios
    }

    // 2. Acertar resultado (vitória/empate/derrota)
    // Só pontua se NÃO acertou placar exato
    if (!hasScoredMainCriteria) {
        const betResult = bet.flamengoScore > bet.opponentScore ? 'win' : 
                         bet.flamengoScore < bet.opponentScore ? 'loss' : 'draw';
        const gameResult = game.flamengoScore > game.opponentScore ? 'win' : 
                          game.flamengoScore < game.opponentScore ? 'loss' : 'draw';
        
        if (betResult === gameResult) {
            points += weights.correctResult * champWeight;
            breakdown.push('Resultado');
            hasScoredMainCriteria = true; // Já pontuou, não pode pontuar por gols de um time
        }
    }

    // 3. Acertar número de gols de um dos times
    // Só pontua se NÃO acertou placar exato E NÃO acertou resultado
    if (!hasScoredMainCriteria) {
        let goalsPoints = 0;
        if (bet.flamengoScore === game.flamengoScore) {
            goalsPoints += weights.correctGoals * champWeight;
        }
        if (bet.opponentScore === game.opponentScore) {
            goalsPoints += weights.correctGoals * champWeight;
        }
        if (goalsPoints > 0) {
            points += goalsPoints;
            breakdown.push('Gols de um time');
            hasScoredMainCriteria = true;
        }
    }

    // 4. Acertar marcadores - SEMPRE CUMULATIVO (pode somar com qualquer um dos 3 critérios acima)
    // Pontuação por marcadores é independente e sempre somada
    if (game.scorers && game.scorers.length > 0 && bet.scorers && bet.scorers.length > 0) {
        const correctScorers = bet.scorers.filter(sId => game.scorers.includes(sId)).length;
        if (correctScorers > 0) {
            const scorersPoints = correctScorers * weights.correctScorers * champWeight;
            points += scorersPoints;
            breakdown.push(`${correctScorers} marcador(es)`);
        }
    }

    return {
        points: points,
        breakdown: breakdown.join(', ') || 'Nenhum ponto'
    };
}

async function calculateRanking() {
    // Calcular pontos de todos os usuários
    const userPoints = {};

    users.forEach(user => {
        userPoints[user.id] = {
            user: user,
            championships: {},
            total: 0,
            cravudinhas: 0
        };
    });

    // Buscar todos os palpites se estiver online
    let allBets = bets;
    if (db && games.some(g => g.status === 'finished')) {
        try {
            const { collection, getDocs } = window.firebaseFunctions;
            const snapshot = await getDocs(collection(db, 'bets'));
            allBets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao carregar palpites:', error);
        }
    }

    // Processar todos os jogos finalizados
    games.filter(g => g.status === 'finished').forEach(game => {
        // Buscar todos os palpites deste jogo
        const gameBets = allBets.filter(b => b.gameId === game.id);

        gameBets.forEach(bet => {
            if (!userPoints[bet.userId]) return;

            const result = calculatePoints(bet, game);
            const champ = championships.find(c => c.id === game.championship);
            const champId = champ?.id || 'other';

            if (!userPoints[bet.userId].championships[champId]) {
                userPoints[bet.userId].championships[champId] = 0;
            }

            userPoints[bet.userId].championships[champId] += result.points;
            userPoints[bet.userId].total += result.points;

            // Contar cravudinhas (placar exato) - verificação direta e precisa
            // Verificar se o placar do palpite é EXATAMENTE igual ao placar do jogo
            if (bet.flamengoScore === game.flamengoScore && 
                bet.opponentScore === game.opponentScore &&
                game.flamengoScore !== null && 
                game.opponentScore !== null) {
                userPoints[bet.userId].cravudinhas++;
            }
        });
    });

    // Converter para array e ordenar
    const ranking = Object.values(userPoints)
        .sort((a, b) => b.total - a.total);

    // Atualizar headers antes de renderizar
    const allChampIds = new Set();
    games.forEach(game => {
        if (game.championship) {
            allChampIds.add(game.championship);
        }
    });
    
    const allChampionships = [...championships];
    allChampIds.forEach(champId => {
        if (!championships.find(c => c.id === champId)) {
            allChampionships.push({
                id: champId,
                name: champId.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
            });
        }
    });
    
    updateRankingTableHeaders(allChampionships);
    renderRanking(ranking);
}

function renderRanking(ranking) {
    const tbody = document.getElementById('ranking-tbody');

    // Coletar todos os campeonatos que têm jogos (não só os da lista de championships)
    const allChampIds = new Set();
    games.forEach(game => {
        if (game.championship) {
            allChampIds.add(game.championship);
        }
    });
    
    // Combinar campeonatos da lista com campeonatos dos jogos
    const allChampionships = [...championships];
    allChampIds.forEach(champId => {
        if (!championships.find(c => c.id === champId)) {
            // Adicionar campeonato que não está na lista mas tem jogos
            allChampionships.push({
                id: champId,
                name: champId.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
            });
        }
    });

    tbody.innerHTML = ranking.map((item, index) => {
        const champScores = allChampionships.map(champ => {
            const score = item.championships[champ.id] || 0;
            return `<td class="score-cell ${getScoreClass(score, ranking, champ.id)}" onclick="openParticipantCharts('${item.user.id}')" title="Clique para ver gráficos">${score.toFixed(2)}</td>`;
        }).join('');

        return `
            <tr>
                <td class="rank-cell">${index + 1}º</td>
                <td class="player-name-cell">${item.user.name}</td>
                <td class="trophy-cell">${'🏆'.repeat(item.cravudinhas)}</td>
                ${champScores}
                <td class="score-cell ${getScoreClass(item.total, ranking, 'total')}" onclick="openParticipantCharts('${item.user.id}')" title="Clique para ver gráficos">${item.total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    // Renderizar gráfico de evolução após renderizar a tabela
    setTimeout(() => {
        renderEvolutionChart(ranking);
    }, 100);
}

function updateRankingTableHeaders(allChampionships) {
    // Atualizar o thead da tabela com todos os campeonatos
    const theadRow = document.querySelector('#ranking-table thead tr');
    if (!theadRow) return;

    // Manter as primeiras 3 colunas (#, Participante, 🏆)
    const firstHeaders = `
        <th>#</th>
        <th>Participante</th>
        <th id="cravudinhas-header">🏆</th>
    `;

    // Criar headers para cada campeonato
    const champHeaders = allChampionships.map(champ => {
        const headerId = `${champ.id}-header`;
        return `<th id="${headerId}">${champ.name}</th>`;
    }).join('');

    // Header do Total
    const totalHeader = '<th id="total-header">Total</th>';

    theadRow.innerHTML = firstHeaders + champHeaders + totalHeader;
}

function getScoreClass(score, ranking, champId) {
    if (ranking.length === 0) return '';
    
    const scores = ranking.map(r => 
        champId === 'total' ? r.total : (r.championships[champId] || 0)
    );
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const range = max - min;
    
    if (range === 0) return 'medium';
    
    const percentile = (score - min) / range;
    if (percentile >= 0.7) return 'high';
    if (percentile >= 0.3) return 'medium';
    return 'low';
}


// Variáveis para armazenar instâncias dos gráficos
let evolutionChartInstance = null;
let participantChartsInstances = {};

// Função para renderizar gráfico de evolução geral
function renderEvolutionChart(ranking) {
    const canvas = document.getElementById('evolution-chart');
    const placeholder = document.getElementById('evolution-placeholder');
    
    if (!canvas) return;
    
    // Verificar se há dados suficientes (pelo menos 2 jogos finalizados)
    const finishedGames = games.filter(g => g.status === 'finished').sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
    });
    
    if (finishedGames.length < 2) {
        canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    if (placeholder) placeholder.style.display = 'none';
    canvas.style.display = 'block';
    
    // Destruir gráfico anterior se existir
    if (evolutionChartInstance) {
        evolutionChartInstance.destroy();
    }
    
    // Preparar dados de evolução
    const labels = [];
    const datasets = [];
    
    // Criar dataset para cada participante (máximo 10 para não poluir)
    const topParticipants = ranking.slice(0, 10);
    
    topParticipants.forEach((item, index) => {
        const userEvolution = [];
        let cumulativePoints = 0;
        
        finishedGames.forEach(game => {
            const gameBets = bets.filter(b => b.gameId === game.id && b.userId === item.user.id);
            if (gameBets.length > 0) {
                const result = calculatePoints(gameBets[0], game);
                cumulativePoints += result.points;
            }
            userEvolution.push(cumulativePoints);
        });
        
        if (userEvolution.length > 0) {
            datasets.push({
                label: item.user.name,
                data: userEvolution,
                borderColor: index === 0 ? '#c8102e' : (index === 1 ? '#000000' : getColorForIndex(index)),
                backgroundColor: index === 0 ? 'rgba(200, 16, 46, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                borderWidth: index < 3 ? 3 : 2,
                tension: 0.4,
                fill: false
            });
        }
    });
    
    // Criar labels com datas dos jogos
    finishedGames.forEach(game => {
        const gameDate = game.date?.toDate ? game.date.toDate() : new Date(game.date);
        labels.push(gameDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    });
    
    if (labels.length === 0) {
        canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    evolutionChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#666'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '600'
                        },
                        color: '#666',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Função para obter cor baseada no índice
function getColorForIndex(index) {
    const colors = [
        '#c8102e', '#000000', '#1a1a1a', '#333333', '#4a4a4a',
        '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc'
    ];
    return colors[index % colors.length];
}

// Função para abrir modal de gráficos do participante
async function openParticipantCharts(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('participant-charts-title').textContent = `Análise: ${user.name}`;
    document.getElementById('participant-charts-modal').style.display = 'block';
    
    // Renderizar gráficos do participante
    await renderParticipantCharts(userId);
}

// Função para renderizar gráficos individuais do participante
async function renderParticipantCharts(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Buscar todos os palpites do usuário
    let userBets = bets.filter(b => b.userId === userId);
    if (db) {
        try {
            const { collection, getDocs, query, where } = window.firebaseFunctions;
            const snapshot = await getDocs(query(collection(db, 'bets'), where('userId', '==', userId)));
            userBets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao carregar palpites do usuário:', error);
        }
    }
    
    // Filtrar apenas jogos finalizados
    const finishedGames = games.filter(g => g.status === 'finished').sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
    });
    
    // Gráfico 1: Evolução de Pontos
    renderParticipantEvolutionChart(userId, userBets, finishedGames);
    
    // Gráfico 2: Pontos por Campeonato
    renderParticipantChampionshipsChart(userId, userBets, finishedGames);
    
    // Gráfico 3: Desempenho por Tipo de Acerto
    renderParticipantBreakdownChart(userId, userBets, finishedGames);
}

// Gráfico de evolução individual
function renderParticipantEvolutionChart(userId, userBets, finishedGames) {
    const canvas = document.getElementById('participant-evolution-chart');
    const placeholder = document.getElementById('participant-evolution-placeholder');
    
    if (finishedGames.length < 2) {
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    if (placeholder) placeholder.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    if (participantChartsInstances.evolution) {
        participantChartsInstances.evolution.destroy();
    }
    
    const labels = [];
    const points = [];
    let cumulativePoints = 0;
    
    finishedGames.forEach(game => {
        const bet = userBets.find(b => b.gameId === game.id);
        if (bet) {
            const result = calculatePoints(bet, game);
            cumulativePoints += result.points;
        }
        points.push(cumulativePoints);
        const gameDate = game.date?.toDate ? game.date.toDate() : new Date(game.date);
        labels.push(gameDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    });
    
    if (points.length === 0) {
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    participantChartsInstances.evolution = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pontos Acumulados',
                data: points,
                borderColor: '#c8102e',
                backgroundColor: 'rgba(200, 16, 46, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#c8102e',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Gráfico de pontos por campeonato
function renderParticipantChampionshipsChart(userId, userBets, finishedGames) {
    const canvas = document.getElementById('participant-championships-chart');
    const placeholder = document.getElementById('participant-championships-placeholder');
    
    const champPoints = {};
    
    finishedGames.forEach(game => {
        const bet = userBets.find(b => b.gameId === game.id);
        if (bet) {
            const result = calculatePoints(bet, game);
            const champ = championships.find(c => c.id === game.championship);
            const champName = champ?.name || game.championship;
            if (!champPoints[champName]) {
                champPoints[champName] = 0;
            }
            champPoints[champName] += result.points;
        }
    });
    
    if (Object.keys(champPoints).length === 0) {
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    if (placeholder) placeholder.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    if (participantChartsInstances.championships) {
        participantChartsInstances.championships.destroy();
    }
    
    const labels = Object.keys(champPoints);
    const data = Object.values(champPoints);
    
    participantChartsInstances.championships = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pontos',
                data: data,
                backgroundColor: labels.map((_, i) => i === 0 ? '#c8102e' : '#000000'),
                borderColor: labels.map((_, i) => i === 0 ? '#8b0000' : '#333333'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Gráfico de breakdown por tipo de acerto
function renderParticipantBreakdownChart(userId, userBets, finishedGames) {
    const canvas = document.getElementById('participant-breakdown-chart');
    const placeholder = document.getElementById('participant-breakdown-placeholder');
    
    const breakdown = {
        'Placar Exato': 0,
        'Resultado': 0,
        'Gols de um Time': 0,
        'Marcadores': 0
    };
    
    finishedGames.forEach(game => {
        const bet = userBets.find(b => b.gameId === game.id);
        if (bet) {
            const result = calculatePoints(bet, game);
            const breakdownStr = result.breakdown || '';
            const breakdownParts = breakdownStr.split(', ').filter(p => p);
            breakdownParts.forEach(type => {
                if (type.includes('Placar exato')) breakdown['Placar Exato']++;
                else if (type.includes('Resultado')) breakdown['Resultado']++;
                else if (type.includes('Gols de um time')) breakdown['Gols de um Time']++;
                else if (type.includes('marcador')) breakdown['Marcadores']++;
            });
        }
    });
    
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    if (total === 0) {
        if (canvas) canvas.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }
    
    if (placeholder) placeholder.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    
    if (participantChartsInstances.breakdown) {
        participantChartsInstances.breakdown.destroy();
    }
    
    const labels = Object.keys(breakdown);
    const data = Object.values(breakdown);
    
    participantChartsInstances.breakdown = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#c8102e',
                    '#000000',
                    '#333333',
                    '#666666'
                ],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Admin functions
function loadAdminData() {
    if (!currentUser?.isAdmin) return;
    
    renderConfig();
    renderAdminGames();
    renderPlayers();
    loadInvites();
}

function renderConfig() {
    const container = document.getElementById('scoring-weights-config');
    
    container.innerHTML = `
        <div class="config-section">
            <h3>⚙️ Configurações Gerais</h3>
            <div class="config-item">
                <label>
                    <strong>Máximo de gols por time</strong><br>
                    <small>Limite de gols de um dos times (não o somatório da partida)</small>
                </label>
                <input type="number" id="config-max-goals" value="${config.maxGoals}" min="5" max="50">
            </div>
        </div>

        <div class="config-section">
            <h3>📊 Pesos de Pontuação Base</h3>
            <p class="config-description">Estes são os pesos base que serão multiplicados pelo peso do campeonato</p>
            <div class="config-item">
                <label>
                    <strong>Placar Exato</strong><br>
                    <small>Acertar o placar completo (ex: 2x1)</small>
                </label>
                <input type="number" id="config-exact-score" value="${config.weights.exactScore}" min="1">
            </div>
            <div class="config-item">
                <label>
                    <strong>Resultado</strong><br>
                    <small>Acertar vitória, empate ou derrota do Flamengo</small>
                </label>
                <input type="number" id="config-correct-result" value="${config.weights.correctResult}" min="1">
            </div>
            <div class="config-item">
                <label>
                    <strong>Gols de um Time</strong><br>
                    <small>Acertar número de gols do Flamengo OU do adversário</small>
                </label>
                <input type="number" id="config-correct-goals" value="${config.weights.correctGoals}" min="1">
            </div>
            <div class="config-item">
                <label>
                    <strong>Marcador (por gol)</strong><br>
                    <small>Pontos por cada marcador de gol acertado</small>
                </label>
                <input type="number" id="config-correct-scorers" value="${config.weights.correctScorers}" min="1">
            </div>
        </div>

        <div class="config-section">
            <h3>🏆 Pesos por Campeonato</h3>
            <p class="config-description">Multiplicador aplicado aos pesos base acima</p>
            ${championships.map(champ => `
                <div class="config-item">
                    <label>${champ.name}:</label>
                    <input type="number" id="config-champ-${champ.id}" value="${config.championshipWeights[champ.id] || 1}" min="1" step="0.5">
                </div>
            `).join('')}
        </div>
    `;
}

async function saveConfig() {
    // Coletar pesos dos campeonatos
    const championshipWeights = {};
    championships.forEach(champ => {
        const weight = parseFloat(document.getElementById(`config-champ-${champ.id}`).value);
        championshipWeights[champ.id] = weight;
    });

    const newConfig = {
        maxGoals: parseInt(document.getElementById('config-max-goals').value),
        weights: {
            exactScore: parseInt(document.getElementById('config-exact-score').value),
            correctResult: parseInt(document.getElementById('config-correct-result').value),
            correctGoals: parseInt(document.getElementById('config-correct-goals').value),
            correctScorers: parseInt(document.getElementById('config-correct-scorers').value)
        },
        championshipWeights: championshipWeights
    };

    config = { ...config, ...newConfig };

    if (db) {
        try {
            const { setDoc, doc } = window.firebaseFunctions;
            await setDoc(doc(db, 'config', 'main'), newConfig);
            alert('✅ Configurações salvas com sucesso!');
            renderConfig(); // Recarregar para mostrar valores atualizados
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            alert('❌ Erro ao salvar configurações.');
        }
    } else {
        alert('✅ Configurações salvas!');
        renderConfig();
    }
}

function renderAdminGames() {
    const container = document.getElementById('admin-games-list');
    
    // Ordenar jogos por data crescente (mais antigos primeiro)
    const sortedGames = [...games].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateA - dateB;
    });
    
    if (sortedGames.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Nenhum jogo cadastrado ainda.</p>';
        return;
    }
    
    container.innerHTML = sortedGames.map(game => {
        const champ = championships.find(c => c.id === game.championship);
        const gameDate = game.date?.toDate ? game.date.toDate() : new Date(game.date);
        const score = game.flamengoScore !== null 
            ? `${game.flamengoScore} x ${game.opponentScore}`
            : 'A definir';
        return `
            <div class="game-card">
                <div class="game-header">
                    <div>
                        <strong>Flamengo vs ${game.opponent}</strong><br>
                        <small>${champ?.name || ''} - ${gameDate.toLocaleString('pt-BR')}</small>
                        ${game.flamengoScore !== null ? `<br><small>Placar: ${score}</small>` : ''}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary btn-small" onclick="openGameModal('${game.id}')">
                            Editar
                        </button>
                        <button class="btn btn-danger btn-small" onclick="removeGame('${game.id}')">
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openGameModal(gameId = null) {
    currentGameId = gameId; // Definir o ID do jogo atual
    const game = gameId ? games.find(g => g.id === gameId) : null;
    
    document.getElementById('game-modal-title').textContent = game ? 'Editar Jogo' : 'Adicionar Jogo';
    
    // Mostrar/ocultar campo de status apenas para admins
    const statusSection = document.getElementById('game-status-section');
    if (currentUser?.isAdmin) {
        statusSection.style.display = 'block';
    } else {
        statusSection.style.display = 'none';
    }
    
    if (game) {
        document.getElementById('game-championship').value = game.championship;
        document.getElementById('game-opponent').value = game.opponent;
        document.getElementById('game-date').value = new Date(game.date).toISOString().slice(0, 16);
        document.getElementById('game-flamengo-score').value = game.flamengoScore || '';
        document.getElementById('game-opponent-score').value = game.opponentScore || '';
        if (currentUser?.isAdmin) {
            document.getElementById('game-status').value = game.status;
        }
        
        // Carregar marcadores do jogo
        renderGameScorers(game.scorers || []);
    } else {
        document.getElementById('game-championship').value = '';
        document.getElementById('game-opponent').value = '';
        document.getElementById('game-date').value = '';
        document.getElementById('game-flamengo-score').value = '';
        document.getElementById('game-opponent-score').value = '';
        if (currentUser?.isAdmin) {
            document.getElementById('game-status').value = 'upcoming';
        }
        document.getElementById('game-scorers-list').innerHTML = '';
    }
    
    document.getElementById('game-modal').style.display = 'block';
}

// Armazenar instâncias do Choices.js para marcadores de jogos
let gameChoicesInstances = new Map();

function addGameScorerInput() {
    const container = document.getElementById('game-scorers-list');
    const scorerDiv = document.createElement('div');
    scorerDiv.className = 'scorer-item';
    scorerDiv.setAttribute('data-game-scorer-id', Date.now().toString());
    
    const select = document.createElement('select');
    select.className = 'player-select';
    select.innerHTML = '<option value="">Digite para buscar jogador...</option>' +
        players.map(p => `<option value="${p.id}">${p.number ? `${p.number} - ` : ''}${p.name}${p.abbreviation ? ` (${p.abbreviation})` : ''}</option>`).join('');
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-small';
    removeBtn.textContent = 'Remover';
    removeBtn.onclick = () => {
        const scorerId = scorerDiv.getAttribute('data-game-scorer-id');
        if (gameChoicesInstances.has(scorerId)) {
            gameChoicesInstances.get(scorerId).destroy();
            gameChoicesInstances.delete(scorerId);
        }
        scorerDiv.remove();
    };
    
    scorerDiv.appendChild(select);
    scorerDiv.appendChild(removeBtn);
    container.appendChild(scorerDiv);
    
    // Inicializar Choices.js após o elemento ser adicionado ao DOM
    setTimeout(() => {
        if (typeof Choices !== 'undefined') {
            const scorerId = scorerDiv.getAttribute('data-game-scorer-id');
            const choices = new Choices(select, {
                searchEnabled: true,
                searchChoices: true,
                searchFields: ['label', 'value'],
                placeholder: true,
                placeholderValue: 'Digite para buscar jogador...',
                searchPlaceholderValue: 'Buscar por nome, número ou abreviação...',
                itemSelectText: '',
                shouldSort: true,
                fuseOptions: {
                    threshold: 0.3,
                    keys: ['label']
                }
            });
            gameChoicesInstances.set(scorerId, choices);
        }
    }, 100);
}

function renderGameScorers(scorers) {
    const container = document.getElementById('game-scorers-list');
    container.innerHTML = '';
    
    // Limpar instâncias antigas
    gameChoicesInstances.forEach(choice => choice.destroy());
    gameChoicesInstances.clear();
    
    scorers.forEach(scorerId => {
        const scorerDiv = document.createElement('div');
        scorerDiv.className = 'scorer-item';
        scorerDiv.setAttribute('data-game-scorer-id', Date.now().toString() + Math.random());
        
        const select = document.createElement('select');
        select.className = 'player-select';
        select.innerHTML = '<option value="">Digite para buscar jogador...</option>' +
            players.map(p => `<option value="${p.id}" ${p.id === scorerId ? 'selected' : ''}>${p.number ? `${p.number} - ` : ''}${p.name}${p.abbreviation ? ` (${p.abbreviation})` : ''}</option>`).join('');
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.textContent = 'Remover';
        removeBtn.onclick = () => {
            const scorerIdAttr = scorerDiv.getAttribute('data-game-scorer-id');
            if (gameChoicesInstances.has(scorerIdAttr)) {
                gameChoicesInstances.get(scorerIdAttr).destroy();
                gameChoicesInstances.delete(scorerIdAttr);
            }
            scorerDiv.remove();
        };
        
        scorerDiv.appendChild(select);
        scorerDiv.appendChild(removeBtn);
        container.appendChild(scorerDiv);
        
        // Inicializar Choices.js após o elemento ser adicionado ao DOM
        setTimeout(() => {
            if (typeof Choices !== 'undefined') {
                const scorerIdAttr = scorerDiv.getAttribute('data-game-scorer-id');
                const choices = new Choices(select, {
                    searchEnabled: true,
                    searchChoices: true,
                    searchFields: ['label', 'value'],
                    placeholder: true,
                    placeholderValue: 'Digite para buscar jogador...',
                    searchPlaceholderValue: 'Buscar por nome, número ou abreviação...',
                    itemSelectText: '',
                    shouldSort: true,
                    fuseOptions: {
                        threshold: 0.3,
                        keys: ['label']
                    }
                });
                // Definir valor selecionado
                if (scorerId) {
                    choices.setChoiceByValue(scorerId);
                }
                gameChoicesInstances.set(scorerIdAttr, choices);
            }
        }, 100);
    });
}

async function saveGame() {
    const championship = document.getElementById('game-championship').value;
    const opponent = document.getElementById('game-opponent').value;
    const date = document.getElementById('game-date').value;
    const flamengoScore = document.getElementById('game-flamengo-score').value;
    const opponentScore = document.getElementById('game-opponent-score').value;
    
    // Status só pode ser alterado por admin
    let status = 'upcoming';
    if (currentUser?.isAdmin) {
        status = document.getElementById('game-status').value;
    } else {
        // Se não é admin, manter o status atual do jogo
        const game = currentGameId ? games.find(g => g.id === currentGameId) : null;
        if (game) {
            status = game.status;
        }
    }

    if (!championship || !opponent || !date) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }

    // Coletar marcadores de gols (compatível com Choices.js)
    const scorerSelects = document.querySelectorAll('#game-scorers-list select');
    const scorers = Array.from(scorerSelects)
        .map(select => {
            // Se Choices.js está sendo usado, pegar o valor do Choices
            const choicesInstance = Array.from(gameChoicesInstances.values()).find(c => c.passedElement.element === select);
            if (choicesInstance) {
                return choicesInstance.getValue(true); // true = retorna apenas valores
            }
            return select.value;
        })
        .filter(id => id);

    // Validar número de marcadores
    if (flamengoScore && parseInt(flamengoScore) > 0 && scorers.length > parseInt(flamengoScore)) {
        alert(`Você selecionou ${scorers.length} marcadores, mas o Flamengo tem apenas ${flamengoScore} gols.`);
        return;
    }

    const gameData = {
        championship,
        opponent,
        date: new Date(date),
        status,
        flamengoScore: flamengoScore ? parseInt(flamengoScore) : null,
        opponentScore: opponentScore ? parseInt(opponentScore) : null,
        scorers: scorers
    };

    if (db) {
        try {
            const { setDoc, doc, addDoc, collection, Timestamp } = window.firebaseFunctions;
            
            if (currentGameId) {
                await setDoc(doc(db, 'games', currentGameId), {
                    ...gameData,
                    date: Timestamp.fromDate(gameData.date)
                });
            } else {
                await addDoc(collection(db, 'games'), {
                    ...gameData,
                    date: Timestamp.fromDate(gameData.date)
                });
            }

            alert('Jogo salvo!');
            document.getElementById('game-modal').style.display = 'none';
            currentGameId = null;
        } catch (error) {
            console.error('Erro ao salvar jogo:', error);
            alert('Erro ao salvar jogo.');
        }
    } else {
        if (currentGameId) {
            const index = games.findIndex(g => g.id === currentGameId);
            if (index >= 0) {
                games[index] = { ...games[index], ...gameData };
            }
        } else {
            games.push({ id: Date.now().toString(), ...gameData });
        }
        alert('Jogo salvo!');
        document.getElementById('game-modal').style.display = 'none';
        renderAdminGames();
    }
}

function renderPlayers() {
    const container = document.getElementById('players-list');
    container.innerHTML = players.map(player => `
        <div class="player-card">
            <div>
                <strong>${player.number ? `${player.number} - ` : ''}${player.name}</strong>
                ${player.abbreviation ? `<span style="color: #666; font-size: 0.9em; margin-left: 8px;">(${player.abbreviation})</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-small" onclick="openPlayerModal('${player.id}')">Editar</button>
                <button class="btn btn-danger btn-small" onclick="removePlayer('${player.id}')">Remover</button>
            </div>
        </div>
    `).join('');
}

async function addPlayer() {
    const name = document.getElementById('new-player-name').value;
    const number = document.getElementById('new-player-number').value;
    const abbreviation = document.getElementById('new-player-abbreviation').value.toUpperCase();

    if (!name) {
        alert('Digite o nome do jogador');
        return;
    }

    if (abbreviation && abbreviation.length !== 2) {
        alert('A abreviação deve ter exatamente 2 letras');
        return;
    }

    const playerData = {
        name: name,
        number: number ? parseInt(number) : null,
        abbreviation: abbreviation || null
    };

    if (db) {
        try {
            const { addDoc, collection } = window.firebaseFunctions;
            await addDoc(collection(db, 'players'), playerData);
            document.getElementById('new-player-name').value = '';
            document.getElementById('new-player-number').value = '';
            document.getElementById('new-player-abbreviation').value = '';
            alert('Jogador adicionado!');
        } catch (error) {
            console.error('Erro ao adicionar jogador:', error);
            console.error('Código do erro:', error.code);
            console.error('Mensagem:', error.message);
            
            let errorMsg = 'Erro ao adicionar jogador.';
            if (error.code === 'permission-denied') {
                errorMsg = '❌ Permissão negada! Verifique as regras de segurança do Firestore e certifique-se de estar logado como admin.';
            } else if (error.code === 'not-found') {
                errorMsg = '❌ Coleção não encontrada! Certifique-se de que a coleção "players" existe no Firestore.';
            } else {
                errorMsg = `❌ Erro: ${error.message || error.code || 'Erro desconhecido'}. Verifique o console (F12) para mais detalhes.`;
            }
            alert(errorMsg);
        }
    } else {
        players.push({ id: Date.now().toString(), ...playerData });
        document.getElementById('new-player-name').value = '';
        document.getElementById('new-player-number').value = '';
        document.getElementById('new-player-abbreviation').value = '';
        renderPlayers();
    }
}

async function removePlayer(playerId) {
    if (!confirm('Tem certeza que deseja remover este jogador?')) return;

    if (db) {
        try {
            const { deleteDoc, doc } = window.firebaseFunctions;
            await deleteDoc(doc(db, 'players', playerId));
            alert('Jogador removido!');
        } catch (error) {
            console.error('Erro ao remover jogador:', error);
            alert('Erro ao remover jogador.');
        }
    } else {
        players = players.filter(p => p.id !== playerId);
        renderPlayers();
    }
}

async function removeGame(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) {
        alert('Jogo não encontrado');
        return;
    }

    const gameDate = game.date?.toDate ? game.date.toDate() : new Date(game.date);
    const champ = championships.find(c => c.id === game.championship);
    const confirmMessage = `Tem certeza que deseja remover este jogo?\n\nFlamengo vs ${game.opponent}\n${champ?.name || ''} - ${gameDate.toLocaleString('pt-BR')}\n\n⚠️ Esta ação não pode ser desfeita!`;
    
    if (!confirm(confirmMessage)) return;

    if (db) {
        try {
            const { deleteDoc, doc } = window.firebaseFunctions;
            await deleteDoc(doc(db, 'games', gameId));
            
            // Remover da lista local
            games = games.filter(g => g.id !== gameId);
            
            alert('Jogo removido com sucesso!');
            renderAdminGames();
            
            // Atualizar outras views se necessário
            if (document.getElementById('games-view').classList.contains('active')) {
                renderGames();
            }
            if (document.getElementById('ranking-view').classList.contains('active')) {
                calculateRanking();
            }
        } catch (error) {
            console.error('Erro ao remover jogo:', error);
            alert('Erro ao remover jogo. Verifique o console para mais detalhes.');
        }
    } else {
        // Modo offline
        games = games.filter(g => g.id !== gameId);
        alert('Jogo removido!');
        renderAdminGames();
        
        // Atualizar outras views se necessário
        if (document.getElementById('games-view').classList.contains('active')) {
            renderGames();
        }
        if (document.getElementById('ranking-view').classList.contains('active')) {
            calculateRanking();
        }
    }
}

async function sendInvite() {
    const email = document.getElementById('invite-email').value;
    const name = document.getElementById('invite-name').value;
    const password = document.getElementById('invite-password').value;
    const role = document.getElementById('invite-role').value;

    if (!email || !name || !password) {
        alert('Preencha todos os campos');
        return;
    }

    // Hash da senha usando bcrypt
    let hashedPassword;
    try {
        const bcryptLib = getBcrypt();
        hashedPassword = bcryptLib.hashSync(password, 10);
    } catch (error) {
        console.error('Erro ao fazer hash da senha:', error);
        alert('Erro ao processar senha. Verifique se bcryptjs foi carregado e recarregue a página.');
        return;
    }

    const userData = {
        email: email,
        name: name,
        password: hashedPassword, // Senha em hash
        isAdmin: role === 'admin',
        invited: true,
        acceptedAt: null, // Será preenchido quando o usuário fizer login pela primeira vez
        createdAt: new Date()
    };

    if (db) {
        try {
            const { setDoc, doc, Timestamp } = window.firebaseFunctions;
            const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
            userData.createdAt = Timestamp.now();
            await setDoc(doc(db, 'users', userId), userData);
            
            document.getElementById('invite-email').value = '';
            document.getElementById('invite-name').value = '';
            document.getElementById('invite-password').value = '';
            document.getElementById('invite-role').value = 'participant';
            alert('Convite enviado!');
            loadInvites();
        } catch (error) {
            console.error('Erro ao enviar convite:', error);
            alert('Erro ao enviar convite.');
        }
    } else {
        alert('Convite criado (modo offline)');
    }
}

async function loadInvites() {
    if (!db) return;
    
    try {
        const { collection, getDocs, query, where } = window.firebaseFunctions;
        const snapshot = await getDocs(query(collection(db, 'users'), where('invited', '==', true)));
        
        const invites = snapshot.docs.map(doc => {
            const data = doc.data();
            let acceptedAt = null;
            if (data.acceptedAt) {
                // Firestore Timestamp tem método toDate()
                if (data.acceptedAt.toDate) {
                    acceptedAt = data.acceptedAt.toDate();
                } else if (data.acceptedAt instanceof Date) {
                    acceptedAt = data.acceptedAt;
                } else if (data.acceptedAt.seconds) {
                    // Timestamp como objeto com seconds
                    acceptedAt = new Date(data.acceptedAt.seconds * 1000);
                } else {
                    acceptedAt = new Date(data.acceptedAt);
                }
            }
            return {
                id: doc.id,
                ...data,
                acceptedAt: acceptedAt
            };
        });

        // Ordenar: não aceitos primeiro, depois aceitos
        invites.sort((a, b) => {
            if (!a.acceptedAt && b.acceptedAt) return -1;
            if (a.acceptedAt && !b.acceptedAt) return 1;
            if (a.acceptedAt && b.acceptedAt) {
                return b.acceptedAt - a.acceptedAt; // Mais recentes primeiro
            }
            return 0;
        });

        const container = document.getElementById('invites-list');
        if (invites.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Nenhum convite enviado ainda.</p>';
            return;
        }

        container.innerHTML = invites.map(invite => {
            const isAccepted = invite.acceptedAt !== null;
            const acceptedDate = isAccepted ? invite.acceptedAt.toLocaleString('pt-BR') : null;
            const roleBadge = invite.isAdmin 
                ? '<span class="role-badge admin-badge">👑 Admin</span>' 
                : '<span class="role-badge participant-badge">👤 Participante</span>';
            const statusBadge = isAccepted 
                ? `<span class="status-badge accepted-badge">✅ Aceito em ${acceptedDate}</span>` 
                : '<span class="status-badge pending-badge">⏳ Aguardando aceitação</span>';

            return `
                <div class="invite-card ${isAccepted ? 'accepted' : 'pending'}">
                    <div class="invite-card-content">
                        <div class="invite-card-header">
                            <strong>${invite.name}</strong>
                            ${roleBadge}
                        </div>
                        <div class="invite-card-body">
                            <small class="invite-email">${invite.email}</small>
                            ${statusBadge}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar convites:', error);
    }
}

// Mapeamento de competições da planilha para IDs do sistema
const championshipMapping = {
    'Carioca': 'carioca',
    'Brasileirão': 'brasileirao',
    'Brasileirao': 'brasileirao',
    'Supercopa Rei': 'supercopa',
    'Supercopa': 'supercopa',
    'Recopa': 'recopa',
    'Libertadores': 'libertadores',
    'Copa do Brasil': 'copa_brasil',
    'Copa Betano do Brasil': 'copa_brasil',
    'Mundial': 'mundial',
    'Mundial de Clubes': 'mundial',
    'Club World Cup': 'mundial'
};

let gamesToImport = [];
let playersToImport = [];
let isImportingPlayers = false;

function parseImportData() {
    const text = document.getElementById('import-games-text').value.trim();
    if (!text) {
        alert('Por favor, cole os dados da planilha');
        return;
    }

    // Parsear dados (pode ser CSV, TSV ou separado por múltiplos espaços)
    const lines = text.split('\n').filter(line => line.trim());
    const parsedGames = [];

    lines.forEach((line, index) => {
        // Tentar diferentes separadores
        let parts = line.split('\t'); // Tabulação (mais comum do Google Sheets)
        if (parts.length < 5) {
            parts = line.split(','); // CSV
        }
        if (parts.length < 5) {
            parts = line.split(/\s{2,}/); // Múltiplos espaços
        }

        if (parts.length < 5) {
            console.warn(`Linha ${index + 1} ignorada (formato inválido):`, line);
            return;
        }

        // Mapear colunas (assumindo: Data, Hora, Competição, Mandante, Visitante)
        const dateStr = parts[0]?.trim();
        const timeStr = parts[1]?.trim();
        const competition = parts[2]?.trim();
        const homeTeam = parts[3]?.trim();
        const awayTeam = parts[4]?.trim();

        if (!dateStr || !competition) {
            console.warn(`Linha ${index + 1} ignorada (dados incompletos):`, line);
            return;
        }

        // Parsear data (formato DD/MM/YYYY)
        const [day, month, year] = dateStr.split('/');
        if (!day || !month || !year) {
            console.warn(`Linha ${index + 1} ignorada (data inválida):`, dateStr);
            return;
        }

        // Parsear hora (formato HH:MM ou "A definir")
        let hour = 20; // Default
        let minute = 0;
        if (timeStr && timeStr !== 'A definir' && timeStr !== 'a definir') {
            const timeParts = timeStr.split(':');
            if (timeParts.length >= 2) {
                hour = parseInt(timeParts[0]) || 20;
                minute = parseInt(timeParts[1]) || 0;
            }
        }

        // Criar data
        const gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, minute);

        // Determinar adversário (sempre Flamengo vs X ou X vs Flamengo)
        let opponent = '';
        if (homeTeam && homeTeam.toLowerCase().includes('flamengo')) {
            opponent = awayTeam;
        } else if (awayTeam && awayTeam.toLowerCase().includes('flamengo')) {
            opponent = homeTeam;
        } else {
            // Se Flamengo não estiver explícito, assumir que é o primeiro time diferente
            opponent = homeTeam !== 'Flamengo' ? homeTeam : awayTeam;
        }

        // Mapear competição
        const champId = championshipMapping[competition] || competition.toLowerCase().replace(/\s+/g, '_');

        parsedGames.push({
            date: gameDate,
            championship: champId,
            championshipName: competition, // Nome original para criar competição
            opponent: opponent || 'Adversário',
            status: 'upcoming',
            flamengoScore: null,
            opponentScore: null,
            scorers: [],
            originalData: line // Para debug
        });
    });

    if (parsedGames.length === 0) {
        alert('Nenhum jogo válido encontrado. Verifique o formato dos dados.');
        return;
    }

    gamesToImport = parsedGames;
    showImportPreview(parsedGames);
}

function showImportPreview(games) {
    const container = document.getElementById('import-preview');
    
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>${games.length} jogos encontrados para importar:</strong></p>
        </div>
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                        <th style="padding: 10px; text-align: left;">Data/Hora</th>
                        <th style="padding: 10px; text-align: left;">Competição</th>
                        <th style="padding: 10px; text-align: left;">Adversário</th>
                    </tr>
                </thead>
                <tbody>
                    ${games.map(game => {
                        const champ = championships.find(c => c.id === game.championship);
                        return `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">${game.date.toLocaleString('pt-BR')}</td>
                                <td style="padding: 8px;">${champ?.name || game.championship}</td>
                                <td style="padding: 8px;">${game.opponent}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
            <strong>⚠️ Atenção:</strong> Jogos com a mesma data e adversário serão atualizados. Novos jogos serão adicionados.
        </div>
    `;

    document.getElementById('import-modal').style.display = 'block';
}

let isImporting = false;

async function confirmImport() {
    if (isImporting) {
        return; // Evitar múltiplos cliques
    }

    if (gamesToImport.length === 0) {
        alert('Nenhum jogo para importar');
        return;
    }

    // Desabilitar botão e fechar modal imediatamente
    isImporting = true;
    const confirmBtn = document.getElementById('confirm-import-btn');
    const cancelBtn = document.getElementById('cancel-import-btn');
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner"></span> Importando...';
    }
    if (cancelBtn) {
        cancelBtn.disabled = true;
    }

    // Fechar modal de preview
    document.getElementById('import-modal').style.display = 'none';

    // Mostrar mensagem na seção de importação
    const statusEl = document.getElementById('import-status');
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
        <div style="padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404; border-left: 4px solid #ffc107;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #856404; border-top-color: transparent;"></div>
                <strong>Importando ${gamesToImport.length} jogos...</strong>
            </div>
            <p style="margin-top: 10px; margin-bottom: 0;">Por favor, aguarde. Não feche esta página.</p>
        </div>
    `;

    let imported = 0;
    let updated = 0;
    let errors = 0;

    if (db) {
        try {
            const { addDoc, collection, getDocs, query, where, setDoc, doc, Timestamp } = window.firebaseFunctions;
            
            // Verificar e criar competições que não existem
            const champIds = [...new Set(gamesToImport.map(g => g.championship))];
            const existingChamps = championships.map(c => c.id);
            const missingChamps = champIds.filter(id => !existingChamps.includes(id));
            
            for (const champId of missingChamps) {
                // Criar competição automaticamente
                const gameWithChamp = gamesToImport.find(g => g.championship === champId);
                const displayName = gameWithChamp?.championshipName || 
                    champId.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ');
                
                await setDoc(doc(db, 'championships', champId), {
                    id: champId,
                    name: displayName
                });
                
                // Adicionar à lista local
                championships.push({ id: champId, name: displayName });
            }
            
            if (missingChamps.length > 0) {
                console.log(`Criadas ${missingChamps.length} competições automaticamente`);
            }
            
            for (const game of gamesToImport) {
                try {
                    // Verificar se já existe um jogo com mesma data e adversário
                    const gamesRef = collection(db, 'games');
                    const q = query(
                        gamesRef,
                        where('opponent', '==', game.opponent),
                        where('championship', '==', game.championship)
                    );
                    const snapshot = await getDocs(q);

                    // Remover campos temporários antes de salvar
                    const { championshipName, originalData, ...gameData } = game;
                    gameData.date = Timestamp.fromDate(game.date);

                    if (!snapshot.empty) {
                        // Atualizar jogo existente (pegar o primeiro)
                        const existingDoc = snapshot.docs[0];
                        await setDoc(doc(db, 'games', existingDoc.id), gameData, { merge: true });
                        updated++;
                    } else {
                        // Adicionar novo jogo
                        await addDoc(collection(db, 'games'), gameData);
                        imported++;
                    }
                } catch (error) {
                    console.error('Erro ao importar jogo:', game, error);
                    errors++;
                }
            }

            statusEl.innerHTML = `
                <div style="padding: 20px; background: #d4edda; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                    <strong>✅ Importação concluída com sucesso!</strong><br>
                    <div style="margin-top: 10px;">
                        <strong>${imported}</strong> jogos adicionados<br>
                        <strong>${updated}</strong> jogos atualizados<br>
                        ${errors > 0 ? `<strong style="color: #721c24;">${errors}</strong> erros` : ''}
                    </div>
                </div>
            `;

            // Limpar campos
            document.getElementById('import-games-text').value = '';
            gamesToImport = [];
            
            // Reabilitar botões
            isImporting = false;
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirmar Importação';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }

            // Recarregar lista de jogos e atualizar filtros
            setTimeout(() => {
                renderAdminGames();
                updateChampionshipFilters();
                calculateRanking(); // Atualizar ranking com novos campeonatos
            }, 1000);

        } catch (error) {
            console.error('Erro na importação:', error);
            statusEl.innerHTML = `
                <div style="padding: 20px; background: #f8d7da; border-radius: 8px; color: #721c24; border-left: 4px solid #dc3545;">
                    <strong>❌ Erro na importação:</strong><br>
                    ${error.message}
                </div>
            `;
            isImporting = false;
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirmar Importação';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }
        }
    } else {
        // Modo offline
        gamesToImport.forEach(game => {
            const existing = games.find(g => 
                g.opponent === game.opponent && 
                g.championship === game.championship &&
                Math.abs(new Date(g.date) - game.date) < 86400000 // Mesmo dia
            );

            if (existing) {
                Object.assign(existing, game);
                updated++;
            } else {
                games.push({ id: Date.now().toString() + Math.random(), ...game });
                imported++;
            }
        });

        statusEl.innerHTML = `
            <div style="padding: 20px; background: #d4edda; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                <strong>✅ Importação concluída (modo offline)!</strong><br>
                <div style="margin-top: 10px;">
                    <strong>${imported}</strong> jogos adicionados<br>
                    <strong>${updated}</strong> jogos atualizados
                </div>
            </div>
        `;

        document.getElementById('import-games-text').value = '';
        gamesToImport = [];
        document.getElementById('import-modal').style.display = 'none';
        isImporting = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar Importação';
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
        renderAdminGames();
        updateChampionshipFilters();
        calculateRanking();
    }
}

// Importação de Jogadores
function parseImportPlayersData() {
    const text = document.getElementById('import-players-text').value.trim();
    if (!text) {
        alert('Por favor, cole os dados da planilha');
        return;
    }

    const lines = text.split('\n').filter(line => line.trim());
    const parsedPlayers = [];

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Tentar diferentes separadores
        let parts = trimmedLine.split('\t'); // Tabulação
        if (parts.length < 2) {
            parts = trimmedLine.split(','); // CSV
        }
        if (parts.length < 2) {
            // Tentar separar por espaços (formato: número nome abreviação)
            parts = trimmedLine.split(/\s+/);
        }

        if (parts.length < 2) {
            console.warn(`Linha ${index + 1} ignorada (formato inválido):`, line);
            return;
        }

        // Mapear colunas: Número, Nome, Abreviação (opcional)
        // Formato esperado: "29 Allan AA" ou "29\tAllan\tAA"
        let numberStr = parts[0]?.trim();
        let name = '';
        let abbreviation = null;

        // Se o primeiro campo é numérico, é o número
        if (numberStr && /^\d+$/.test(numberStr)) {
            // Temos número, nome e possivelmente abreviação
            name = parts[1]?.trim() || '';
            abbreviation = parts[2]?.trim()?.toUpperCase() || null;
        } else {
            // Não tem número, primeiro campo é o nome
            numberStr = null;
            name = parts[0]?.trim() || '';
            abbreviation = parts[1]?.trim()?.toUpperCase() || null;
        }

        if (!name) {
            console.warn(`Linha ${index + 1} ignorada (nome vazio):`, line);
            return;
        }

        // Validar abreviação se fornecida
        if (abbreviation) {
            if (abbreviation.length !== 2 || !/^[A-Z]{2}$/.test(abbreviation)) {
                console.warn(`Linha ${index + 1}: abreviação inválida "${abbreviation}", será ignorada`);
                abbreviation = null;
            }
        }

        parsedPlayers.push({
            number: numberStr ? parseInt(numberStr) : null,
            name: name,
            abbreviation: abbreviation
        });
    });

    if (parsedPlayers.length === 0) {
        alert('Nenhum jogador válido encontrado. Verifique o formato dos dados.');
        return;
    }

    playersToImport = parsedPlayers;
    showImportPlayersPreview(parsedPlayers);
}

function showImportPlayersPreview(players) {
    const container = document.getElementById('import-players-preview');
    
    container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>${players.length} jogadores encontrados para importar:</strong></p>
        </div>
        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">
                        <th style="padding: 10px; text-align: left;">Número</th>
                        <th style="padding: 10px; text-align: left;">Nome</th>
                        <th style="padding: 10px; text-align: left;">Abreviação</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map(player => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 8px;">${player.number || '-'}</td>
                            <td style="padding: 8px;">${player.name}</td>
                            <td style="padding: 8px;">${player.abbreviation || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 8px; color: #856404;">
            <strong>⚠️ Atenção:</strong> Jogadores com o mesmo número serão atualizados. Novos jogadores serão adicionados.
        </div>
    `;

    document.getElementById('import-players-modal').style.display = 'block';
}

async function confirmImportPlayers() {
    if (isImportingPlayers) {
        return;
    }

    if (playersToImport.length === 0) {
        alert('Nenhum jogador para importar');
        return;
    }

    isImportingPlayers = true;
    const confirmBtn = document.getElementById('confirm-import-players-btn');
    const cancelBtn = document.getElementById('cancel-import-players-btn');
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner"></span> Importando...';
    }
    if (cancelBtn) {
        cancelBtn.disabled = true;
    }

    document.getElementById('import-players-modal').style.display = 'none';

    const statusEl = document.getElementById('import-players-status');
    statusEl.style.display = 'block';
    statusEl.innerHTML = `
        <div style="padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404; border-left: 4px solid #ffc107;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="spinner" style="width: 20px; height: 20px; border: 3px solid #856404; border-top-color: transparent;"></div>
                <strong>Importando ${playersToImport.length} jogadores...</strong>
            </div>
            <p style="margin-top: 10px; margin-bottom: 0;">Por favor, aguarde. Não feche esta página.</p>
        </div>
    `;

    let imported = 0;
    let updated = 0;
    let errors = 0;

    if (db) {
        try {
            const { addDoc, collection, getDocs, query, where, setDoc, doc } = window.firebaseFunctions;
            
            const errorDetails = [];
            
            for (let i = 0; i < playersToImport.length; i++) {
                const player = playersToImport[i];
                try {
                    // Verificar se já existe jogador com mesmo número OU mesmo nome
                    let existingDoc = null;
                    const playersRef = collection(db, 'players');
                    
                    // Primeiro, tentar encontrar por número (se houver)
                    if (player.number) {
                        try {
                            const qByNumber = query(playersRef, where('number', '==', player.number));
                            const snapshotByNumber = await getDocs(qByNumber);
                            if (!snapshotByNumber.empty) {
                                existingDoc = snapshotByNumber.docs[0];
                            }
                        } catch (queryError) {
                            console.warn(`Erro ao buscar por número para jogador ${i + 1}:`, queryError);
                        }
                    }
                    
                    // Se não encontrou por número, tentar por nome (case-insensitive)
                    if (!existingDoc && player.name) {
                        try {
                            const allPlayersSnapshot = await getDocs(playersRef);
                            const matchingDoc = allPlayersSnapshot.docs.find(doc => {
                                const data = doc.data();
                                return data.name && data.name.toLowerCase() === player.name.toLowerCase();
                            });
                            if (matchingDoc) {
                                existingDoc = matchingDoc;
                            }
                        } catch (queryError) {
                            console.warn(`Erro ao buscar por nome para jogador ${i + 1}:`, queryError);
                        }
                    }

                    if (existingDoc) {
                        // Atualizar jogador existente
                        await setDoc(doc(db, 'players', existingDoc.id), player, { merge: true });
                        updated++;
                    } else {
                        // Adicionar novo jogador
                        await addDoc(collection(db, 'players'), player);
                        imported++;
                    }
                } catch (error) {
                    const errorMsg = `Jogador ${i + 1} (${player.name || 'sem nome'}): ${error.message || error.code || 'Erro desconhecido'}`;
                    console.error('Erro ao importar jogador:', player, error);
                    console.error('Código do erro:', error.code);
                    console.error('Mensagem:', error.message);
                    errorDetails.push(errorMsg);
                    errors++;
                }
            }
            
            // Se houver erros, mostrar detalhes
            if (errors > 0 && errorDetails.length > 0) {
                console.error('Detalhes dos erros:', errorDetails);
            }

            let statusMessage = '';
            if (errors === 0) {
                statusMessage = `
                    <div style="padding: 20px; background: #d4edda; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                        <strong>✅ Importação concluída com sucesso!</strong><br>
                        <div style="margin-top: 10px;">
                            <strong>${imported}</strong> jogadores adicionados<br>
                            <strong>${updated}</strong> jogadores atualizados
                        </div>
                    </div>
                `;
            } else {
                statusMessage = `
                    <div style="padding: 20px; background: #fff3cd; border-radius: 8px; color: #856404; border-left: 4px solid #ffc107;">
                        <strong>⚠️ Importação concluída com erros</strong><br>
                        <div style="margin-top: 10px;">
                            <strong>${imported}</strong> jogadores adicionados<br>
                            <strong>${updated}</strong> jogadores atualizados<br>
                            <strong style="color: #721c24;">${errors}</strong> erros
                        </div>
                        <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border-radius: 6px; font-size: 12px;">
                            <strong>Possíveis causas:</strong><br>
                            • Verifique as regras de segurança do Firestore<br>
                            • Certifique-se de que a coleção "players" existe<br>
                            • Verifique o console do navegador (F12) para mais detalhes
                        </div>
                    </div>
                `;
            }
            
            statusEl.innerHTML = statusMessage;

            document.getElementById('import-players-text').value = '';
            playersToImport = [];
            isImportingPlayers = false;
            
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirmar Importação';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }

        } catch (error) {
            console.error('Erro na importação:', error);
            statusEl.innerHTML = `
                <div style="padding: 20px; background: #f8d7da; border-radius: 8px; color: #721c24; border-left: 4px solid #dc3545;">
                    <strong>❌ Erro na importação:</strong><br>
                    ${error.message}
                </div>
            `;
            isImportingPlayers = false;
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Confirmar Importação';
            }
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }
        }
    } else {
        // Modo offline
        playersToImport.forEach(player => {
            const existing = players.find(p => p.number === player.number);
            if (existing) {
                Object.assign(existing, player);
                updated++;
            } else {
                players.push({ id: Date.now().toString() + Math.random(), ...player });
                imported++;
            }
        });

        statusEl.innerHTML = `
            <div style="padding: 20px; background: #d4edda; border-radius: 8px; color: #155724; border-left: 4px solid #28a745;">
                <strong>✅ Importação concluída (modo offline)!</strong><br>
                <div style="margin-top: 10px;">
                    <strong>${imported}</strong> jogadores adicionados<br>
                    <strong>${updated}</strong> jogadores atualizados
                </div>
            </div>
        `;

        document.getElementById('import-players-text').value = '';
        playersToImport = [];
        isImportingPlayers = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirmar Importação';
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
        renderPlayers();
    }
}

let currentPlayerId = null;

function openPlayerModal(playerId = null) {
    currentPlayerId = playerId;
    const player = playerId ? players.find(p => p.id === playerId) : null;
    
    document.getElementById('player-modal-title').textContent = player ? 'Editar Jogador' : 'Adicionar Jogador';
    
    if (player) {
        document.getElementById('edit-player-number').value = player.number || '';
        document.getElementById('edit-player-name').value = player.name || '';
        document.getElementById('edit-player-abbreviation').value = player.abbreviation || '';
    } else {
        document.getElementById('edit-player-number').value = '';
        document.getElementById('edit-player-name').value = '';
        document.getElementById('edit-player-abbreviation').value = '';
    }
    
    document.getElementById('player-modal').style.display = 'block';
}

async function savePlayerEdit() {
    const number = document.getElementById('edit-player-number').value;
    const name = document.getElementById('edit-player-name').value;
    const abbreviation = document.getElementById('edit-player-abbreviation').value.toUpperCase();

    if (!name) {
        alert('Digite o nome do jogador');
        return;
    }

    if (abbreviation && abbreviation.length !== 2) {
        alert('A abreviação deve ter exatamente 2 letras');
        return;
    }

    const playerData = {
        name: name,
        number: number ? parseInt(number) : null,
        abbreviation: abbreviation || null
    };

    if (db) {
        try {
            const { setDoc, doc, addDoc, collection } = window.firebaseFunctions;
            
            if (currentPlayerId) {
                await setDoc(doc(db, 'players', currentPlayerId), playerData, { merge: true });
                alert('Jogador atualizado!');
            } else {
                await addDoc(collection(db, 'players'), playerData);
                alert('Jogador adicionado!');
            }
            
            document.getElementById('player-modal').style.display = 'none';
            currentPlayerId = null;
        } catch (error) {
            console.error('Erro ao salvar jogador:', error);
            alert('Erro ao salvar jogador.');
        }
    } else {
        if (currentPlayerId) {
            const index = players.findIndex(p => p.id === currentPlayerId);
            if (index >= 0) {
                players[index] = { ...players[index], ...playerData };
            }
        } else {
            players.push({ id: Date.now().toString(), ...playerData });
        }
        document.getElementById('player-modal').style.display = 'none';
        currentPlayerId = null;
        renderPlayers();
    }
}

// Animação moderna do banner
let bannerAnimation = null;
let bannerAnimationFrame = null;

function initBannerAnimation() {
    const canvas = document.getElementById('banner-animation');
    if (!canvas) return;
    
    const header = document.querySelector('header');
    if (!header) return;
    
    // Configurar canvas
    const resizeCanvas = () => {
        canvas.width = header.offsetWidth;
        canvas.height = header.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Partículas para animação
    class Particle {
        constructor() {
            this.reset();
        }
        
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.3 + 0.1;
            this.life = Math.random() * 100 + 50;
            this.maxLife = this.life;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life--;
            
            // Resetar se sair da tela ou vida acabou
            if (this.x < 0 || this.x > canvas.width || 
                this.y < 0 || this.y > canvas.height || 
                this.life <= 0) {
                this.reset();
            }
        }
        
        draw() {
            ctx.save();
            ctx.globalAlpha = this.opacity * (this.life / this.maxLife);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Brilho suave
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Ondas para efeito de movimento
    class Wave {
        constructor(amplitude, frequency, speed, yOffset) {
            this.amplitude = amplitude;
            this.frequency = frequency;
            this.speed = speed;
            this.yOffset = yOffset;
            this.time = 0;
        }
        
        update() {
            this.time += this.speed;
        }
        
        draw() {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, 0.015)`; // Reduzida de 0.05 para 0.015
            ctx.lineWidth = 1; // Reduzida de 2 para 1
            ctx.beginPath();
            
            for (let x = 0; x < canvas.width; x += 2) {
                const y = this.yOffset + Math.sin((x * this.frequency + this.time) * 0.01) * this.amplitude;
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
            ctx.restore();
        }
    }
    
    // Criar partículas
    const particles = [];
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    // Criar ondas
    const waves = [
        new Wave(15, 0.02, 0.5, canvas.height * 0.3),
        new Wave(20, 0.015, -0.3, canvas.height * 0.7),
        new Wave(10, 0.025, 0.4, canvas.height * 0.5)
    ];
    
    // Função de animação
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar ondas
        waves.forEach(wave => {
            wave.update();
            wave.draw();
        });
        
        // Atualizar e desenhar partículas
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Conectar partículas próximas
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.globalAlpha = (1 - distance / 100) * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
        
        bannerAnimationFrame = requestAnimationFrame(animate);
    }
    
    // Iniciar animação
    animate();
    
    // Limpar animação quando necessário
    bannerAnimation = {
        stop: () => {
            if (bannerAnimationFrame) {
                cancelAnimationFrame(bannerAnimationFrame);
            }
        }
    };
}

// Funções de Perfil
function renderProfile() {
    if (!currentUser) return;
    
    document.getElementById('profile-name').textContent = currentUser.name || 'N/A';
    document.getElementById('profile-email').textContent = currentUser.email || 'N/A';
    document.getElementById('profile-role').textContent = currentUser.isAdmin ? '👑 Administrador' : '👤 Participante';
}

async function changePassword() {
    if (!currentUser || !db) {
        alert('Erro: usuário não autenticado');
        return;
    }
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('change-password-error');
    
    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
        errorEl.textContent = 'Preencha todos os campos';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'As senhas não coincidem';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPassword.length < 4) {
        errorEl.textContent = 'A nova senha deve ter pelo menos 4 caracteres';
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        const { collection, getDocs, query, where, setDoc, doc } = window.firebaseFunctions;
        
        // Buscar usuário atual no Firestore para verificar senha atual
        const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
        if (userDoc.empty) {
            errorEl.textContent = 'Usuário não encontrado';
            errorEl.style.display = 'block';
            return;
        }
        
        const userData = userDoc.docs[0].data();
        const userId = userDoc.docs[0].id;
        
        // Verificar senha atual
        const bcryptLib = getBcrypt();
        let passwordValid = false;
        
        if (userData.password) {
            if (userData.password.startsWith('$2a$') || userData.password.startsWith('$2b$')) {
                passwordValid = bcryptLib.compareSync(currentPassword, userData.password);
            } else {
                // Senha antiga em texto plano
                passwordValid = userData.password === currentPassword;
            }
        }
        
        if (!passwordValid) {
            errorEl.textContent = 'Senha atual incorreta';
            errorEl.style.display = 'block';
            return;
        }
        
        // Hash da nova senha
        const hashedPassword = bcryptLib.hashSync(newPassword, 10);
        
        // Atualizar senha no Firestore
        await setDoc(doc(db, 'users', userId), {
            password: hashedPassword
        }, { merge: true });
        
        alert('✅ Senha alterada com sucesso!');
        document.getElementById('change-password-modal').style.display = 'none';
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        errorEl.style.display = 'none';
        
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        errorEl.textContent = 'Erro ao alterar senha. Tente novamente.';
        errorEl.style.display = 'block';
    }
}

// Funções de Admin - Gerenciar Usuários
async function loadUsers() {
    if (!db || !currentUser?.isAdmin) return;
    
    try {
        const { collection, getDocs } = window.firebaseFunctions;
        const snapshot = await getDocs(collection(db, 'users'));
        
        const usersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Ordenar: admins primeiro, depois por nome
        usersList.sort((a, b) => {
            if (a.isAdmin && !b.isAdmin) return -1;
            if (!a.isAdmin && b.isAdmin) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
        
        const container = document.getElementById('users-list');
        if (usersList.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Nenhum usuário encontrado.</p>';
            return;
        }
        
        container.innerHTML = usersList.map(user => {
            const roleBadge = user.isAdmin 
                ? '<span class="role-badge admin-badge">👑 Admin</span>' 
                : '<span class="role-badge participant-badge">👤 Participante</span>';
            
            const acceptedBadge = user.acceptedAt 
                ? `<span class="status-badge accepted-badge">✅ Aceito</span>` 
                : '<span class="status-badge pending-badge">⏳ Pendente</span>';
            
            return `
                <div class="invite-card ${user.acceptedAt ? 'accepted' : 'pending'}" style="margin-bottom: 15px;">
                    <div class="invite-card-content">
                        <div class="invite-card-header">
                            <strong>${user.name || 'Sem nome'}</strong>
                            ${roleBadge}
                        </div>
                        <div class="invite-card-body">
                            <small class="invite-email">${user.email || 'Sem email'}</small>
                            ${acceptedBadge}
                        </div>
                        <div style="margin-top: 10px;">
                            <button class="btn btn-secondary btn-small" onclick="window.openResetPasswordModal('${user.id}', '${user.name || user.email}')">
                                🔑 Resetar Senha
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('users-list').innerHTML = '<p style="color: red;">Erro ao carregar usuários.</p>';
    }
}

window.resetPasswordUserId = null;

function openResetPasswordModal(userId, userName) {
    window.resetPasswordUserId = userId;
    document.getElementById('reset-password-title').textContent = `Resetar Senha - ${userName}`;
    document.getElementById('reset-password-info').textContent = `Defina uma nova senha temporária para ${userName}. O usuário poderá alterá-la depois no seu perfil.`;
    document.getElementById('reset-password-new').value = '';
    document.getElementById('reset-password-confirm').value = '';
    document.getElementById('reset-password-error').style.display = 'none';
    document.getElementById('reset-password-modal').style.display = 'block';
}

async function resetUserPassword() {
    if (!currentUser?.isAdmin || !db || !window.resetPasswordUserId) {
        alert('Erro: operação não autorizada');
        return;
    }
    
    const newPassword = document.getElementById('reset-password-new').value;
    const confirmPassword = document.getElementById('reset-password-confirm').value;
    const errorEl = document.getElementById('reset-password-error');
    
    // Validações
    if (!newPassword || !confirmPassword) {
        errorEl.textContent = 'Preencha todos os campos';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        errorEl.textContent = 'As senhas não coincidem';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPassword.length < 4) {
        errorEl.textContent = 'A senha deve ter pelo menos 4 caracteres';
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        const bcryptLib = getBcrypt();
        const hashedPassword = bcryptLib.hashSync(newPassword, 10);
        
        const { setDoc, doc } = window.firebaseFunctions;
        await setDoc(doc(db, 'users', window.resetPasswordUserId), {
            password: hashedPassword
        }, { merge: true });
        
        alert('✅ Senha resetada com sucesso!');
        document.getElementById('reset-password-modal').style.display = 'none';
        document.getElementById('reset-password-new').value = '';
        document.getElementById('reset-password-confirm').value = '';
        errorEl.style.display = 'none';
        window.resetPasswordUserId = null;
        
        // Recarregar lista de usuários
        loadUsers();
        
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        errorEl.textContent = 'Erro ao resetar senha. Tente novamente.';
        errorEl.style.display = 'block';
    }
}

// Expor funções globalmente
window.openBetModal = openBetModal;
window.openGameModal = openGameModal;
window.removePlayer = removePlayer;
window.openPlayerModal = openPlayerModal;
window.removeGame = removeGame;
window.openParticipantCharts = openParticipantCharts;
window.openResetPasswordModal = openResetPasswordModal;
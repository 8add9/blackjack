const API_BASE_URL = "https://reed-unhyphenated-su.ngrok-free.dev"; 


const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let dealerHand = [];
let playerHands = []; 
let currentHandIndex = 0;
let balance = 0;
let isGameOver = true;
let currentUser = null;
let isRegisterMode = false;

const elAuthView = document.getElementById('auth-view');
const elGameView = document.getElementById('game-view');
const elAuthForm = document.getElementById('auth-form');
const inpUsername = document.getElementById('username');
const inpPassword = document.getElementById('password');
const inpConfirmPassword = document.getElementById('confirm-password');
const elConfirmGroup = document.getElementById('confirm-password-group');
const btnSubmitAuth = document.getElementById('btn-submit-auth');
const btnToggleMode = document.getElementById('btn-toggle-mode');
const elAuthMessage = document.getElementById('auth-message');
const elDisplayUsername = document.getElementById('display-username');

const elBalance = document.getElementById('balance');
const elBetAmount = document.getElementById('bet-amount');
const elMessage = document.getElementById('message-area');
const elDealerHand = document.getElementById('dealer-hand');
const elPlayerArea = document.getElementById('player-area');
const elDealerScore = document.getElementById('dealer-score');


const btnHit = document.getElementById('btn-hit');
const btnStand = document.getElementById('btn-stand');
const btnDouble = document.getElementById('btn-double');
const btnSplit = document.getElementById('btn-split');
const divBettingControls = document.getElementById('betting-controls');
const divGameControls = document.getElementById('game-controls');
const divRestartControls = document.getElementById('restart-controls');
const btnLogout = document.getElementById('btn-logout');


window.onload = () => {
    btnToggleMode.onclick = toggleAuthMode;
    btnSubmitAuth.onclick = handleAuthSubmit;
    btnLogout.onclick = logout;
    document.getElementById('btn-deal').onclick = startGame;
    btnHit.onclick = hit;
    btnStand.onclick = stand;
    btnDouble.onclick = doubleBet;
    btnSplit.onclick = splitHand;
    document.getElementById('btn-next-round').onclick = resetTable;
};

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    elAuthMessage.classList.add('d-none');
    
    if (isRegisterMode) {
        elConfirmGroup.classList.remove('d-none');
        btnSubmitAuth.innerText = "註冊並登入";
        btnSubmitAuth.classList.remove('btn-primary');
        btnSubmitAuth.classList.add('btn-success');
        btnToggleMode.innerText = "已有帳號？點此登入";
        inpConfirmPassword.required = true;
    } else {
        elConfirmGroup.classList.add('d-none');
        btnSubmitAuth.innerText = "登入";
        btnSubmitAuth.classList.remove('btn-success');
        btnSubmitAuth.classList.add('btn-primary');
        btnToggleMode.innerText = "沒有帳號？點此註冊";
        inpConfirmPassword.required = false;
    }
}

async function handleAuthSubmit() {
    const username = inpUsername.value.trim();
    const password = inpPassword.value.trim();
    
    if (!username || !password) {
        showAuthMessage("請輸入帳號與密碼");
        return;
    }

    if (isRegisterMode) {
        const confirmPwd = inpConfirmPassword.value.trim();
        if (password !== confirmPwd) {
            showAuthMessage("兩次密碼輸入不一致");
            return;
        }
        await performRegister(username, password);
    } else {
        await performLogin(username, password);
    }
}

async function performLogin(username, password) {
    try {
        btnSubmitAuth.disabled = true;
        btnSubmitAuth.innerText = "連線中...";
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.username;
            balance = data.balance;
            enterGameView();
        } else {
            showAuthMessage(data.message || "登入失敗");
        }
    } catch (error) {
        console.error(error);
        showAuthMessage("連線錯誤，請檢查 API 網址或網路狀態");
    } finally {
        resetAuthBtnState();
    }
}

async function performRegister(username, password) {
    try {
        btnSubmitAuth.disabled = true;
        btnSubmitAuth.innerText = "註冊中...";

        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 註冊成功後直接登入 (或要求使用者重新登入，這裡選擇直接登入)
            currentUser = data.username;
            balance = data.balance; // 通常新帳號是預設值 (e.g. 1000)
            enterGameView();
        } else {
            showAuthMessage(data.message || "註冊失敗");
        }
    } catch (error) {
        console.error(error);
        showAuthMessage("無法連線至伺服器");
    } finally {
        resetAuthBtnState();
    }
}

function enterGameView() {
    elAuthView.classList.add('d-none');
    elGameView.classList.remove('d-none');
    elDisplayUsername.innerText = currentUser;
    updateUI();
    showGameMessage(`歡迎回來，${currentUser}！`);
}

function logout() {
    currentUser = null;
    balance = 0;
    inpPassword.value = "";
    inpConfirmPassword.value = "";
    elGameView.classList.add('d-none');
    elAuthView.classList.remove('d-none');
    showAuthMessage(""); // Clear messages
}

function showAuthMessage(msg) {
    elAuthMessage.innerText = msg;
    elAuthMessage.classList.remove('d-none');
}

function resetAuthBtnState() {
    btnSubmitAuth.disabled = false;
    btnSubmitAuth.innerText = isRegisterMode ? "註冊並登入" : "登入";
}
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function startGame() {
    const bet = parseInt(elBetAmount.value);
    if (isNaN(bet) || bet <= 0) return showGameMessage("金額無效", "danger");
    if (bet > balance) return showGameMessage("餘額不足", "danger");
    balance -= bet;
    updateUI();

    isGameOver = false;
    createDeck();
    shuffleDeck();
    dealerHand = [];
    playerHands = [];
    currentHandIndex = 0;

    playerHands.push({
        cards: [],
        bet: bet,
        isDone: false,
        isBust: false,
        isDoubled: false
    });
    
    playerHands[0].cards.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHands[0].cards.push(deck.pop());
    dealerHand.push(deck.pop());

    renderTable(false);
    
    divBettingControls.classList.add('d-none');
    divGameControls.classList.remove('d-none');
    divRestartControls.classList.add('d-none');
    showGameMessage("遊戲開始", "info");

    checkButtonsState();

    const pScore = calculateScore(playerHands[0].cards);
    if (pScore === 21) {
        stand(); 
    }
}

function checkButtonsState() {
    const currentHand = playerHands[currentHandIndex];
    if (balance >= currentHand.bet && currentHand.cards.length === 2) {
        btnDouble.disabled = false;
    } else {
        btnDouble.disabled = true;
    }
    const card1Value = getCardValue(currentHand.cards[0]);
    const card2Value = getCardValue(currentHand.cards[1]);
    
    if (balance >= currentHand.bet && 
        currentHand.cards.length === 2 && 
        card1Value === card2Value && 
        playerHands.length < 2) {
        btnSplit.disabled = false;
    } else {
        btnSplit.disabled = true;
    }
}

function hit() {
    if (isGameOver) return;
    const hand = playerHands[currentHandIndex];
    
    hand.cards.push(deck.pop());
    renderTable(false);
    
    const score = calculateScore(hand.cards);
    if (score > 21) {
        hand.isBust = true;
        showGameMessage("爆牌！", "danger");
        stand();
    } else if (score === 21) {
        stand();
    } else {
        btnDouble.disabled = true;
        btnSplit.disabled = true;
    }
}

function stand() {
    if (isGameOver) return;
    
    playerHands[currentHandIndex].isDone = true;
    
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
        showGameMessage(`請操作第 ${currentHandIndex + 1} 副牌`, "info");
        checkButtonsState();
        renderTable(false);
    } else {
        dealerTurn();
    }
}

function doubleBet() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return showGameMessage("餘額不足", "danger");

    balance -= hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;
    updateUI();

    showGameMessage(`雙倍下注！總注額: $${hand.bet}`, "warning");
    
    hand.cards.push(deck.pop());
    
    const score = calculateScore(hand.cards);
    if (score > 21) hand.isBust = true;
    
    stand();
}

function splitHand() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return showGameMessage("餘額不足", "danger");

    balance -= hand.bet;
    updateUI();

    showGameMessage("分牌！", "info");
    const cardToMove = hand.cards.pop();
    playerHands.push({
        cards: [cardToMove],
        bet: hand.bet,
        isDone: false,
        isBust: false,
        isDoubled: false
    });
    hand.cards.push(deck.pop());
    playerHands[1].cards.push(deck.pop());
    checkButtonsState();
    renderTable(false);
}

function dealerTurn() {
    const allBust = playerHands.every(h => h.isBust);
    if (!allBust) {
        renderTable(true);
        while (calculateScore(dealerHand) < 17) {
            dealerHand.push(deck.pop());
            renderTable(true);
        }
    } else {
        renderTable(true);
    }
    
    settleGame();
}

async function settleGame() {
    isGameOver = true;
    const dScore = calculateScore(dealerHand);
    let totalWin = 0;
    let totalBet = 0;
    
    playerHands.forEach((hand) => {
        const pScore = calculateScore(hand.cards);
        let resultMsg = "";
        totalBet += hand.bet;
        
        if (hand.isBust) {
            resultMsg = "爆牌";
        } else if (dScore > 21) {
            resultMsg = "莊家爆牌(贏)";
            totalWin += hand.bet * 2;
        } else if (pScore > dScore) {
            resultMsg = "你贏了";
            totalWin += hand.bet * 2;
        } else if (pScore < dScore) {
            resultMsg = "你輸了";
        } else {
            resultMsg = "平手";
            totalWin += hand.bet;
        }
        
        hand.resultText = resultMsg;
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/game_result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUser,
                bet: totalBet,
                payout: totalWin
            })
        });

        if (response.ok) {
            const data = await response.json();
            balance = data.new_balance;
        } else {
            console.error("結算同步失敗");
            balance += totalWin; 
        }
    } catch (e) {
        console.error("連線錯誤", e);
        balance += totalWin;
    }

    updateUI();
    
    if (totalWin > totalBet) {
        showGameMessage(`你贏了！本局淨賺 $${totalWin - totalBet}`, "success");
    } else if (totalWin < totalBet) {
        showGameMessage("你又輸！", "danger");
    } else {
        showGameMessage("平手", "warning");
    }

    divGameControls.classList.add('d-none');
    divRestartControls.classList.remove('d-none');
    renderTable(true);
}

function renderTable(showDealerFull) {
    elDealerHand.innerHTML = '';
    dealerHand.forEach((card, index) => {
        if (index === 0 && !showDealerFull) {
            elDealerHand.innerHTML += `<div class="playing-card card-back"></div>`;
        } else {
            elDealerHand.innerHTML += createCardHTML(card);
        }
    });
    elDealerScore.innerText = showDealerFull ? calculateScore(dealerHand) : "?";

    elPlayerArea.innerHTML = '';
    
    playerHands.forEach((hand, index) => {
        const isActive = (index === currentHandIndex && !isGameOver);
        const activeClass = isActive ? 'hand-active' : 'hand-inactive';
        const score = calculateScore(hand.cards);
        const colClass = playerHands.length > 1 ? 'col-6' : 'col-12';
        
        let html = `
            <div class="${colClass} text-center">
                <div class="player-hand-container ${activeClass} position-relative">
                    <div class="d-flex justify-content-center align-items-center gap-2 mb-2">
                         <h5 class="m-0">手牌 ${index + 1}</h5>
                         <span class="badge ${hand.isBust ? 'bg-danger' : 'bg-primary'} rounded-pill">${score}</span>
                    </div>
                    <div class="d-flex justify-content-center gap-2 flex-wrap" style="min-height: 100px;">
                        ${hand.cards.map(createCardHTML).join('')}
                    </div>
                    <div class="mt-2 text-warning small">下注: $${hand.bet}</div>
                    ${hand.resultText ? `<div class="result-badge badge bg-light text-dark shadow">${hand.resultText}</div>` : ''}
                </div>
            </div>
        `;
        elPlayerArea.innerHTML += html;
    });
}

function calculateScore(cards) {
    let score = 0;
    let aceCount = 0;
    for (let card of cards) {
        if (['J', 'Q', 'K'].includes(card.value)) score += 10;
        else if (card.value === 'A') { aceCount++; score += 11; }
        else score += parseInt(card.value);
    }
    while (score > 21 && aceCount > 0) { score -= 10; aceCount--; }
    return score;
}

function createCardHTML(card) {
    const isRed = (card.suit === '♥' || card.suit === '♦');
    return `<div class="playing-card ${isRed ? 'suit-red' : 'suit-black'}"><div>${card.value}</div><div>${card.suit}</div></div>`;
}

function resetTable() {
    divRestartControls.classList.add('d-none');
    divBettingControls.classList.remove('d-none');
    elDealerHand.innerHTML = '';
    elPlayerArea.innerHTML = '';
    elDealerScore.innerText = '?';
    showGameMessage("請下注", "info");
}

function updateUI() {
    elBalance.innerText = balance;
}

function showGameMessage(msg, type = "info") {
    elMessage.className = `alert alert-${type} text-center`;
    elMessage.innerText = msg;
    elMessage.classList.remove('d-none');
}
const API_BASE_URL = "https://reed-unhyphenated-su.ngrok-free.dev"; 


let dealerHand = [];
let playerHands = []; 
let currentHandIndex = 0;
let balance = 0; 
let isGameOver = true;
let currentUser = null;     
let isRegisterMode = false; 

const elAuthView = document.getElementById('auth-view');
const elGameView = document.getElementById('game-view');
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

async function fetchCard(role, currentScore) {
    try {
        const response = await fetch(`${API_BASE_URL}/game/draw_card`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                username: currentUser,
                role: role,
                current_score: currentScore
            })
        });
        return await response.json();
    } catch (e) {
        console.error("發牌失敗", e);
        return { suit: '♠', value: '2' }; 
    }
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    elAuthMessage.classList.add('d-none');
    if (isRegisterMode) {
        elConfirmGroup.classList.remove('d-none');
        btnSubmitAuth.innerText = "註冊並登入";
        btnSubmitAuth.className = "btn btn-success btn-lg shadow-sm";
        btnToggleMode.innerText = "已有帳號？點此登入";
    } else {
        elConfirmGroup.classList.add('d-none');
        btnSubmitAuth.innerText = "登入";
        btnSubmitAuth.className = "btn btn-primary btn-lg shadow-sm";
        btnToggleMode.innerText = "沒有帳號？點此註冊";
    }
}

async function handleAuthSubmit() {
    const username = inpUsername.value.trim();
    const password = inpPassword.value.trim();
    if (!username || !password) return showAuthMessage("請輸入帳號密碼");

    const endpoint = isRegisterMode ? '/register' : '/login';
    
    try {
        btnSubmitAuth.disabled = true;
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = data.username;
            balance = data.balance;
            enterGameView();
        } else {
            showAuthMessage(data.message || "失敗");
        }
    } catch (e) { showAuthMessage("連線錯誤"); } 
    finally { btnSubmitAuth.disabled = false; }
}

function enterGameView() {
    elAuthView.classList.add('d-none');
    elGameView.classList.remove('d-none');
    elDisplayUsername.innerText = currentUser;
    updateUI();
}

function logout() {
    currentUser = null;
    location.reload();
}

function showAuthMessage(msg) {
    elAuthMessage.innerText = msg;
    elAuthMessage.classList.remove('d-none');
}


function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

async function startGame() {
    const bet = parseInt(elBetAmount.value);
    if (isNaN(bet) || bet <= 0) return showGameMessage("金額無效", "danger");
    if (bet > balance) return showGameMessage("餘額不足", "danger");

    balance -= bet;
    updateUI();

    isGameOver = false;
    dealerHand = [];
    playerHands = [];
    currentHandIndex = 0;
    playerHands.push({ cards: [], bet: bet, isDone: false, isBust: false, isDoubled: false });
    
    let c1 = await fetchCard('player', 0); c1.isNew = true; // 標記新牌
    playerHands[0].cards.push(c1);

    let d1 = await fetchCard('dealer', 0); d1.isNew = true; // 標記新牌
    dealerHand.push(d1);

    let c2 = await fetchCard('player', getCardValue(playerHands[0].cards[0])); c2.isNew = true; // 標記新牌
    playerHands[0].cards.push(c2);

    let d2 = await fetchCard('dealer', getCardValue(dealerHand[0])); d2.isNew = true; // 標記新牌
    dealerHand.push(d2);

    renderTable(false);
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

async function hit() {
    if (isGameOver) return;
    const hand = playerHands[currentHandIndex];
    const currentScore = calculateScore(hand.cards);
    const newCard = await fetchCard('player', currentScore);
    newCard.isNew = true;
    hand.cards.push(newCard);
    renderTable(false);
    
    const score = calculateScore(hand.cards);
    if (score > 21) {
        hand.isBust = true;
        showGameMessage("爆牌！", "danger");
        stand();
    } else if (score === 21) {
        stand();
    } else {
        checkButtonsState();
        btnDouble.disabled = true;
        btnSplit.disabled = true;
    }
}

async function stand() {
    if (isGameOver) return;
    playerHands[currentHandIndex].isDone = true;
    
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
        showGameMessage(`請操作第 ${currentHandIndex + 1} 副牌`, "info");
        checkButtonsState();
        renderTable(false);
    } else {
        await dealerTurn(); 
    }
}

async function doubleBet() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return showGameMessage("餘額不足", "danger");

    balance -= hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;
    updateUI();
    showGameMessage(`雙倍下注！總注額: $${hand.bet}`, "warning");
    
    const currentScore = calculateScore(hand.cards);
    const newCard = await fetchCard('player', currentScore);
    newCard.isNew = true;
    hand.cards.push(newCard);
    
    const score = calculateScore(hand.cards);
    if (score > 21) hand.isBust = true;
    
    stand();
}

async function splitHand() {
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
    const score1 = getCardValue(hand.cards[0]);
        let c1 = await fetchCard('player', score1);
        c1.isNew = true; // ✅ 標記新牌
        hand.cards.push(c1);

        const score2 = getCardValue(playerHands[1].cards[0]);
        let c2 = await fetchCard('player', score2);
        c2.isNew = true; // ✅ 標記新牌
        playerHands[1].cards.push(c2);

        checkButtonsState();
        renderTable(false);
    }

async function dealerTurn() {
    const allBust = playerHands.every(h => h.isBust);
    
    if (!allBust) {
        renderTable(true);
        // 原本的 while 條件保留當作雙重保險
        while (calculateScore(dealerHand) < 17) {
            await new Promise(r => setTimeout(r, 800));
            
            const currentScore = calculateScore(dealerHand);
            const newCard = await fetchCard('dealer', currentScore);
            
            // ✅ 新增這段：如果後端說 "stop": true，就立刻停止
            if (newCard.stop) {
                console.log("莊家達到 17 點或爆牌，後端強制停止");
                break; 
            }
            
            newCard.isNew = true;
            dealerHand.push(newCard);
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
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ username: currentUser, bet: totalBet, payout: totalWin })
        });
        if (response.ok) {
            const data = await response.json();
            balance = data.new_balance;
        } else {
            balance += totalWin; 
        }
    } catch (e) { balance += totalWin; }

    updateUI();
    
    if (totalWin > totalBet) showGameMessage(`恭喜！本局淨賺 $${totalWin - totalBet}`, "success");
    else if (totalWin < totalBet) showGameMessage("你又輸！", "danger");
    else showGameMessage("平手", "warning");

    divGameControls.classList.add('d-none');
    divRestartControls.classList.remove('d-none');
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
            </div>`;
        elPlayerArea.innerHTML += html;
    });
    setTimeout(() => {
        dealerHand.forEach(c => c.isNew = false);
        playerHands.forEach(hand => {
            hand.cards.forEach(c => c.isNew = false);
        });
    }, 600);
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
    const animClass = card.isNew ? 'deal-anim' : '';
    
    return `
        <div class="playing-card ${isRed ? 'suit-red' : 'suit-black'} ${animClass}">
            <div>${card.value}</div>
            <div>${card.suit}</div>
        </div>
    `;
}

function resetTable() {
    divRestartControls.classList.add('d-none');
    divBettingControls.classList.remove('d-none');
    elDealerHand.innerHTML = '';
    elPlayerArea.innerHTML = '';
    elDealerScore.innerText = '?';
    showGameMessage("請下注", "info");
}

function checkButtonsState() {
    const currentHand = playerHands[currentHandIndex];
    if (balance >= currentHand.bet && currentHand.cards.length === 2) btnDouble.disabled = false;
    else btnDouble.disabled = true;

    const card1Value = getCardValue(currentHand.cards[0]);
    const card2Value = getCardValue(currentHand.cards[1]);
    if (balance >= currentHand.bet && currentHand.cards.length === 2 && card1Value === card2Value && playerHands.length < 2) btnSplit.disabled = false;
    else btnSplit.disabled = true;
}

function updateUI() { elBalance.innerText = balance; }
function showGameMessage(msg, type = "info") {
    elMessage.className = `alert alert-${type} text-center`;
    elMessage.innerText = msg;
    elMessage.classList.remove('d-none');
}

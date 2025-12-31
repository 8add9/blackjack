const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let dealerHand = [];
let playerHands = []; 
let currentHandIndex = 0;
let balance = 10000;
let isGameOver = true;

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

window.onload = () => {
    const savedBalance = localStorage.getItem('bj_balance');
    if (savedBalance !== null) balance = parseInt(savedBalance);
    updateUI();
    
    document.getElementById('btn-deal').onclick = startGame;
    btnHit.onclick = hit;
    btnStand.onclick = stand;
    btnDouble.onclick = doubleBet;
    btnSplit.onclick = splitHand;
    document.getElementById('btn-next-round').onclick = resetTable;
    document.getElementById('btn-reset').onclick = resetMoney;
};

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
    if (isNaN(bet) || bet <= 0) return showMessage("金額無效", "danger");
    if (bet > balance) return showMessage("餘額不足", "danger");

    balance -= bet;
    localStorage.setItem('bj_balance', balance);
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
    showMessage("遊戲開始", "info");

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
        showMessage("爆牌！", "danger");
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
        showMessage(`請操作第 ${currentHandIndex + 1} 副牌`, "info");
        checkButtonsState();
        renderTable(false);
    } else {
        dealerTurn();
    }
}

function doubleBet() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return;

    balance -= hand.bet;
    hand.bet *= 2;
    hand.isDoubled = true;
    localStorage.setItem('bj_balance', balance);
    updateUI();

    showMessage(`雙倍下注！總注額: $${hand.bet}`, "warning");
    
    hand.cards.push(deck.pop());
    
    const score = calculateScore(hand.cards);
    if (score > 21) hand.isBust = true;
    
    stand();
}

function splitHand() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return;

    balance -= hand.bet;
    localStorage.setItem('bj_balance', balance);
    updateUI();

    showMessage("分牌！", "info");

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

function settleGame() {
    isGameOver = true;
    const dScore = calculateScore(dealerHand);
    let totalWin = 0;
    
    playerHands.forEach((hand, index) => {
        const pScore = calculateScore(hand.cards);
        let resultMsg = "";
        
        if (hand.isBust) {
            resultMsg = "爆牌";
        } else if (dScore > 21) {
            resultMsg = "莊家爆牌(贏)";
            totalWin += hand.bet * 2;
            balance += hand.bet * 2;
        } else if (pScore > dScore) {
            resultMsg = "你贏了";
            totalWin += hand.bet * 2;
            balance += hand.bet * 2;
        } else if (pScore < dScore) {
            resultMsg = "你輸了";
        } else {
            resultMsg = "平手";
            totalWin += hand.bet;
            balance += hand.bet;
        }
        
        hand.resultText = resultMsg;
    });

    localStorage.setItem('bj_balance', balance);
    updateUI();
    
    if (totalWin > 0) {
        showMessage(`你贏了，獲得 $${totalWin}`, "success");
    } else {
        showMessage("你又輸", "danger");
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
    showMessage("請下注", "info");
}

function resetMoney() {
    if (confirm("確定要重置資金嗎？")) {
        balance = 1000000;
        localStorage.setItem('bj_balance', balance);
        updateUI();
    }
}

function updateUI() {
    elBalance.innerText = balance;
}

function showMessage(msg, type) {
    elMessage.className = `alert alert-${type} text-center`;
    elMessage.innerText = msg;
    elMessage.classList.remove('d-none');
}

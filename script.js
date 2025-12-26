// --- 1. 遊戲變數 ---
const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let dealerHand = [];
// 玩家手牌改為陣列，每個元素包含：{ cards: [], bet: 0, isDone: false, isBust: false, isDoubled: false }
let playerHands = []; 
let currentHandIndex = 0; // 目前正在操作哪一副牌
let balance = 10000;
let isGameOver = true;

// --- 2. DOM 元素 ---
const elBalance = document.getElementById('balance');
const elBetAmount = document.getElementById('bet-amount');
const elMessage = document.getElementById('message-area');
const elDealerHand = document.getElementById('dealer-hand');
const elPlayerArea = document.getElementById('player-area'); // 玩家區域容器
const elDealerScore = document.getElementById('dealer-score');

// 按鈕
const btnHit = document.getElementById('btn-hit');
const btnStand = document.getElementById('btn-stand');
const btnDouble = document.getElementById('btn-double');
const btnSplit = document.getElementById('btn-split');
const divBettingControls = document.getElementById('betting-controls');
const divGameControls = document.getElementById('game-controls');
const divRestartControls = document.getElementById('restart-controls');

// --- 3. 初始化 ---
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

// --- 4. 牌組功能 ---
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

// --- 5. 遊戲流程 ---

function startGame() {
    const bet = parseInt(elBetAmount.value);
    if (isNaN(bet) || bet <= 0) return showMessage("金額無效", "danger");
    if (bet > balance) return showMessage("餘額不足", "danger");

    // 扣除初始下注
    balance -= bet;
    localStorage.setItem('bj_balance', balance);
    updateUI();

    // 初始化
    isGameOver = false;
    createDeck();
    shuffleDeck();
    dealerHand = [];
    playerHands = [];
    currentHandIndex = 0;

    // 建立玩家第一副手牌
    playerHands.push({
        cards: [],
        bet: bet,
        isDone: false, // 是否結束操作
        isBust: false, // 是否爆牌
        isDoubled: false // 是否雙倍過
    });
    
    // 發牌
    playerHands[0].cards.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHands[0].cards.push(deck.pop());
    dealerHand.push(deck.pop());

    renderTable(false);
    
    // 介面切換
    divBettingControls.classList.add('d-none');
    divGameControls.classList.remove('d-none');
    divRestartControls.classList.add('d-none');
    showMessage("遊戲開始", "info");

    checkButtonsState(); // 檢查雙倍/分牌按鈕是否可用

    // 檢查起手 BlackJack
    const pScore = calculateScore(playerHands[0].cards);
    if (pScore === 21) {
        stand(); 
    }
}

// 檢查按鈕狀態 (分牌/雙倍規則)
function checkButtonsState() {
    const currentHand = playerHands[currentHandIndex];
    
    // 1. 雙倍：餘額足夠 && 只有兩張牌
    if (balance >= currentHand.bet && currentHand.cards.length === 2) {
        btnDouble.disabled = false;
    } else {
        btnDouble.disabled = true;
    }

    // 2. 分牌：餘額足夠 && 只有兩張牌 && 點數相同(或面額相同) && 還沒分過牌(簡單起見限制一次)
    const card1Value = getCardValue(currentHand.cards[0]); // 這裡簡化：只要點數一樣就能分 (如 J 和 K 算 10 點)
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
        stand(); // 自動停牌換下一手
    } else if (score === 21) {
        stand(); // 21點自動停牌
    } else {
        // 如果沒爆，取消雙倍和分牌權利 (因為已經要過牌了)
        btnDouble.disabled = true;
        btnSplit.disabled = true;
    }
}

function stand() {
    if (isGameOver) return;
    
    playerHands[currentHandIndex].isDone = true;
    
    // 如果還有下一副牌 (分牌情況)，切換過去
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
        showMessage(`請操作第 ${currentHandIndex + 1} 副牌`, "info");
        checkButtonsState(); // 重新檢查新牌的按鈕狀態
        renderTable(false);
    } else {
        // 所有牌都操作完，換莊家
        dealerTurn();
    }
}

function doubleBet() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return; // 二次檢查

    // 扣錢
    balance -= hand.bet;
    hand.bet *= 2; // 下注翻倍
    hand.isDoubled = true;
    localStorage.setItem('bj_balance', balance);
    updateUI();

    showMessage(`雙倍下注！總注額: $${hand.bet}`, "warning");
    
    // 發一張牌，然後強制停牌
    hand.cards.push(deck.pop());
    
    const score = calculateScore(hand.cards);
    if (score > 21) hand.isBust = true;
    
    stand();
}

function splitHand() {
    const hand = playerHands[currentHandIndex];
    if (balance < hand.bet) return;

    // 扣第二副牌的錢
    balance -= hand.bet;
    localStorage.setItem('bj_balance', balance);
    updateUI();

    showMessage("分牌！", "info");

    // 拆分卡牌
    const cardToMove = hand.cards.pop();
    
    // 建立第二副手牌
    playerHands.push({
        cards: [cardToMove],
        bet: hand.bet,
        isDone: false,
        isBust: false,
        isDoubled: false
    });

    // 兩副牌各補一張
    hand.cards.push(deck.pop());
    playerHands[1].cards.push(deck.pop());

    // 保持 index 為 0，先玩第一副
    checkButtonsState();
    renderTable(false);
}

function dealerTurn() {
    // 如果玩家所有手牌都爆了，莊家不用做事
    const allBust = playerHands.every(h => h.isBust);
    
    if (!allBust) {
        renderTable(true); // 翻開莊家暗牌
        while (calculateScore(dealerHand) < 17) {
            dealerHand.push(deck.pop());
            renderTable(true); // 為了即時更新
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
    
    // 逐一結算每副手牌
    playerHands.forEach((hand, index) => {
        const pScore = calculateScore(hand.cards);
        let resultMsg = "";
        
        // 結算邏輯
        if (hand.isBust) {
            resultMsg = "爆牌";
        } else if (dScore > 21) {
            resultMsg = "莊家爆牌(贏)";
            totalWin += hand.bet * 2;
            balance += hand.bet * 2;
        } else if (pScore > dScore) {
            resultMsg = "你贏了";
            // BlackJack 3:2 賠率通常只適用於首兩張，這裡簡化統一 1:1
            totalWin += hand.bet * 2;
            balance += hand.bet * 2;
        } else if (pScore < dScore) {
            resultMsg = "你輸了";
        } else {
            resultMsg = "平手";
            totalWin += hand.bet;
            balance += hand.bet; // 退回本金
        }
        
        // 在該手牌上顯示結果 (視覺效果)
        hand.resultText = resultMsg;
    });

    localStorage.setItem('bj_balance', balance);
    updateUI();
    
    // 顯示總結
    if (totalWin > 0) {
        showMessage(`你贏了，獲得 $${totalWin}`, "success");
    } else {
        showMessage("你又輸", "danger");
    }

    divGameControls.classList.add('d-none');
    divRestartControls.classList.remove('d-none');
    renderTable(true); // 重新渲染以顯示結果文字
}

// --- 6. 渲染與輔助 ---

function renderTable(showDealerFull) {
    // 渲染莊家
    elDealerHand.innerHTML = '';
    dealerHand.forEach((card, index) => {
        if (index === 0 && !showDealerFull) {
            elDealerHand.innerHTML += `<div class="playing-card card-back"></div>`;
        } else {
            elDealerHand.innerHTML += createCardHTML(card);
        }
    });
    elDealerScore.innerText = showDealerFull ? calculateScore(dealerHand) : "?";

    // 渲染玩家 (支援多手牌)
    elPlayerArea.innerHTML = '';
    
    playerHands.forEach((hand, index) => {
        const isActive = (index === currentHandIndex && !isGameOver);
        const activeClass = isActive ? 'hand-active' : 'hand-inactive';
        const score = calculateScore(hand.cards);
        
        // 如果只有一副牌，用 col-12，如果有兩副，用 col-6
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
        balance = 1000;
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

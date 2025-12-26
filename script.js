// --- 1. 遊戲變數設定 ---
const suits = ['♠', '♥', '♦', '♣'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let currentBet = 0;
let isGameOver = true;

// --- 2. DOM 元素快取 (方便後續使用) ---
const elBalance = document.getElementById('balance');
const elBetAmount = document.getElementById('bet-amount');
const elMessage = document.getElementById('message-area');
const elDealerHand = document.getElementById('dealer-hand');
const elPlayerHand = document.getElementById('player-hand');
const elDealerScore = document.getElementById('dealer-score');
const elPlayerScore = document.getElementById('player-score');

// 按鈕群組
const divBettingControls = document.getElementById('betting-controls');
const divGameControls = document.getElementById('game-controls');
const divRestartControls = document.getElementById('restart-controls');

// --- 3. 初始化 ---
window.onload = () => {
    // 讀取歷史餘額
    const savedBalance = localStorage.getItem('bj_balance');
    if (savedBalance !== null) {
        balance = parseInt(savedBalance);
    }
    updateUI();
    
    // 綁定按鈕事件
    document.getElementById('btn-deal').onclick = startGame;
    document.getElementById('btn-hit').onclick = hit;
    document.getElementById('btn-stand').onclick = stand;
    document.getElementById('btn-next-round').onclick = resetTable;
    document.getElementById('btn-reset').onclick = resetMoney;
};

// --- 4. 核心遊戲邏輯 ---

// 建立一副新牌
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ suit, value });
        }
    }
}

// 洗牌 (Fisher-Yates 演算法)
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// 開始新局 (下注與發牌)
function startGame() {
    const bet = parseInt(elBetAmount.value);

    // 驗證下注金額
    if (isNaN(bet) || bet <= 0) {
        showMessage("請輸入有效的下注金額", "danger");
        return;
    }
    if (bet > balance) {
        showMessage("餘額不足！請重置資金或降低下注。", "danger");
        return;
    }

    // 扣除籌碼
    currentBet = bet;
    balance -= currentBet;
    localStorage.setItem('bj_balance', balance); // 即時存檔
    updateUI();

    // 初始化狀態
    isGameOver = false;
    createDeck();
    shuffleDeck();
    playerHand = [];
    dealerHand = [];
    
    // 發牌：玩家兩張，莊家兩張 (莊家一張暗牌)
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());
    playerHand.push(deck.pop());
    dealerHand.push(deck.pop());

    renderTable(false); // false 代表不顯示莊家暗牌
    
    // 切換介面
    divBettingControls.classList.add('d-none');
    divGameControls.classList.remove('d-none');
    divRestartControls.classList.add('d-none');
    showMessage("遊戲開始！選擇要牌或停牌...", "info");

    // 檢查是否起手 BlackJack (21點)
    const pScore = calculateScore(playerHand);
    if (pScore === 21) {
        stand(); // 直接進入結算
    }
}

// 玩家要牌
function hit() {
    if (isGameOver) return;
    
    playerHand.push(deck.pop());
    renderTable(false);
    
    const score = calculateScore(playerHand);
    if (score > 21) {
        endRound('bust'); // 爆牌
    }
}

// 玩家停牌 (換莊家行動)
function stand() {
    if (isGameOver) return;
    
    // 莊家 AI：點數小於 17 必須補牌
    while (calculateScore(dealerHand) < 17) {
        dealerHand.push(deck.pop());
    }
    
    renderTable(true); // true 代表翻開莊家暗牌
    determineWinner();
}

// 判定勝負
function determineWinner() {
    const pScore = calculateScore(playerHand);
    const dScore = calculateScore(dealerHand);
    
    if (dScore > 21) {
        endRound('dealer_bust'); // 莊家爆牌
    } else if (pScore > dScore) {
        endRound('win');
    } else if (pScore < dScore) {
        endRound('lose');
    } else {
        endRound('push'); // 平手
    }
}

// 結算處理
function endRound(result) {
    isGameOver = true;
    let msg = "";
    let msgType = "";

    switch (result) {
        case 'bust':
            msg = "爆牌了！你輸了。";
            msgType = "danger";
            break;
        case 'dealer_bust':
            msg = "莊家爆牌！你贏了！";
            msgType = "success";
            balance += currentBet * 2;
            break;
        case 'win':
            msg = "恭喜！你的點數較大，你贏了！";
            msgType = "success";
            balance += currentBet * 2;
            break;
        case 'lose':
            msg = "莊家點數較大，你輸了。";
            msgType = "danger";
            break;
        case 'push':
            msg = "平手 (Push)，退回賭注。";
            msgType = "warning";
            balance += currentBet;
            break;
    }

    localStorage.setItem('bj_balance', balance); // 存檔
    updateUI();
    showMessage(msg, msgType);
    
    // 切換按鈕顯示
    divGameControls.classList.add('d-none');
    divRestartControls.classList.remove('d-none');
    
    // 如果是最終顯示，強制全開莊家牌
    if(result === 'bust') renderTable(true);
}

// 重置桌面準備下一局
function resetTable() {
    divRestartControls.classList.add('d-none');
    divBettingControls.classList.remove('d-none');
    showMessage("請下注", "info");
    
    // 清空桌面視覺
    elDealerHand.innerHTML = '';
    elPlayerHand.innerHTML = '';
    elDealerScore.innerText = '?';
    elPlayerScore.innerText = '0';
}

// 重置資金 (作弊按鈕)
function resetMoney() {
    if (confirm("確定要將資金重置為 $1000 嗎？")) {
        balance = 1000;
        localStorage.setItem('bj_balance', balance);
        updateUI();
        showMessage("資金已重置", "warning");
    }
}

// --- 5. 輔助函式 ---

// 計算點數 (處理 A)
function calculateScore(hand) {
    let score = 0;
    let aceCount = 0;

    for (let card of hand) {
        if (['J', 'Q', 'K'].includes(card.value)) {
            score += 10;
        } else if (card.value === 'A') {
            aceCount++;
            score += 11;
        } else {
            score += parseInt(card.value);
        }
    }

    // 如果爆牌且有 A，將 A 視為 1
    while (score > 21 && aceCount > 0) {
        score -= 10;
        aceCount--;
    }
    
    return score;
}

// 渲染畫面
function renderTable(showDealerFull) {
    // 渲染玩家手牌
    elPlayerHand.innerHTML = '';
    playerHand.forEach(card => {
        elPlayerHand.innerHTML += createCardHTML(card);
    });
    elPlayerScore.innerText = calculateScore(playerHand);

    // 渲染莊家手牌
    elDealerHand.innerHTML = '';
    dealerHand.forEach((card, index) => {
        // 如果還沒結束且是第一張牌 -> 顯示背面 (暗牌)
        if (index === 0 && !showDealerFull) {
            elDealerHand.innerHTML += `<div class="playing-card card-back"></div>`;
        } else {
            elDealerHand.innerHTML += createCardHTML(card);
        }
    });

    // 莊家分數顯示
    if (showDealerFull) {
        elDealerScore.innerText = calculateScore(dealerHand);
    } else {
        // 暗牌狀態下，只顯示亮牌的分數 (其實稍微不準確，但為了簡單先顯示?)
        // 嚴格來說，21點通常此時不顯示莊家分數，或只顯示第二張牌的分數
        // 這裡我們簡單處理：顯示 "?"
        elDealerScore.innerText = "?";
    }
}

// 產生卡牌 HTML 字串
function createCardHTML(card) {
    const isRed = (card.suit === '♥' || card.suit === '♦');
    const colorClass = isRed ? 'suit-red' : 'suit-black';
    return `
        <div class="playing-card ${colorClass}">
            <div style="font-size: 0.8em;">${card.value}</div>
            <div>${card.suit}</div>
        </div>
    `;
}

// 顯示訊息
function showMessage(msg, type) {
    elMessage.className = `alert alert-${type} text-center`;
    elMessage.innerText = msg;
    elMessage.classList.remove('d-none');
}

// 更新介面數值
function updateUI() {
    elBalance.innerText = balance;
}

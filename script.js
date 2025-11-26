// --- CONFIG ---

const STARTING_BANKROLL = 100;

const RACERS = [
  { id: "grim", name: "Grim Jim", odds: 2.0, icon: "💀" },   // favourite
  { id: "shade", name: "Shadow Nell", odds: 3.0, icon: "🕱" },
  { id: "bones", name: "Boney Tony", odds: 4.0, icon: "☠️" },
  { id: "wisp", name: "Wisp Wanda", odds: 5.0, icon: "💫" },
  { id: "crypt", name: "Crypt Chris", odds: 6.0, icon: "🪦" },
  { id: "spectre", name: "Spectre Sal", odds: 7.0, icon: "👻" }
];

// --- STATE ---

let bankroll = STARTING_BANKROLL;
let raceNumber = 1;
let currentBet = null;       // { racerId, amount }
let raceRunning = false;
let racerStates = [];        // filled when race starts

// DOM
const bankrollEl = document.getElementById("bankroll");
const raceNumberEl = document.getElementById("raceNumber");
const oddsListEl = document.getElementById("oddsList");
const racerSelectEl = document.getElementById("racerSelect");
const betAmountEl = document.getElementById("betAmount");
const placeBetBtn = document.getElementById("placeBetBtn");
const startRaceBtn = document.getElementById("startRaceBtn");
const nextRaceBtn = document.getElementById("nextRaceBtn");
const currentBetInfoEl = document.getElementById("currentBetInfo");
const trackEl = document.getElementById("track");
const raceStatusEl = document.getElementById("raceStatus");
const logEl = document.getElementById("log");

// --- INIT ---

function init() {
  bankroll = STARTING_BANKROLL;
  raceNumber = 1;
  updateBankrollDisplay();
  updateRaceNumberDisplay();
  renderOddsList();
  populateRacerSelect();
  renderTrack();
  attachEvents();
}

function updateBankrollDisplay() {
  bankrollEl.textContent = bankroll.toString();
}

function updateRaceNumberDisplay() {
  raceNumberEl.textContent = raceNumber.toString();
}

function renderOddsList() {
  oddsListEl.innerHTML = "";
  RACERS.forEach(racer => {
    const li = document.createElement("li");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = racer.name;

    const oddsSpan = document.createElement("span");
    oddsSpan.textContent = `${racer.odds.toFixed(1)}x`;

    li.appendChild(nameSpan);
    li.appendChild(oddsSpan);
    oddsListEl.appendChild(li);
  });
}

function populateRacerSelect() {
  racerSelectEl.innerHTML = "";
  RACERS.forEach(racer => {
    const opt = document.createElement("option");
    opt.value = racer.id;
    opt.textContent = racer.name;
    racerSelectEl.appendChild(opt);
  });
}

function renderTrack() {
  trackEl.innerHTML = "";

  RACERS.forEach((racer, index) => {
    const lane = document.createElement("div");
    lane.className = "lane";
    lane.dataset.racerId = racer.id;

    const label = document.createElement("div");
    label.className = "lane-label";
    label.textContent = `${index + 1}. ${racer.name}`;

    const finish = document.createElement("div");
    finish.className = "finish-line";

    const icon = document.createElement("div");
    icon.className = "racer-icon";
    icon.textContent = racer.icon;

    lane.appendChild(label);
    lane.appendChild(finish);
    lane.appendChild(icon);
    trackEl.appendChild(lane);
  });
}

// --- EVENTS ---

function attachEvents() {
  placeBetBtn.addEventListener("click", onPlaceBet);
  startRaceBtn.addEventListener("click", onStartRace);
  nextRaceBtn.addEventListener("click", onNextRace);
}

function onPlaceBet() {
  if (raceRunning) return;

  const racerId = racerSelectEl.value;
  const amount = parseInt(betAmountEl.value, 10);

  if (!racerId) {
    alert("Select a racer.");
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid bet amount.");
    return;
  }
  if (amount > bankroll) {
    alert("You can't bet more than your bankroll.");
    return;
  }

  currentBet = { racerId, amount };
  const racer = RACERS.find(r => r.id === racerId);

  currentBetInfoEl.innerHTML =
    `Current bet: <strong>${amount}</strong> on <strong>${racer.name}</strong>`;

  startRaceBtn.disabled = false;
}

function onStartRace() {
  if (!currentBet || raceRunning) return;

  raceRunning = true;
  placeBetBtn.disabled = true;
  startRaceBtn.disabled = true;
  nextRaceBtn.disabled = true;
  racerSelectEl.disabled = true;
  betAmountEl.disabled = true;

  raceStatusEl.textContent = "Race in progress...";

  resetRacerPositions();

  const finishOrder = getWeightedFinishOrder();

  startRaceAnimation(finishOrder, winnerId => {
    raceRunning = false;
    handlePayout(winnerId, finishOrder);
    nextRaceBtn.disabled = false;
  });
}

function onNextRace() {
  currentBet = null;
  currentBetInfoEl.textContent = "";
  raceStatusEl.textContent = "";

  raceNumber += 1;
  updateRaceNumberDisplay();

  racerSelectEl.disabled = false;
  betAmountEl.disabled = false;
  placeBetBtn.disabled = bankroll <= 0;
  startRaceBtn.disabled = true;
  nextRaceBtn.disabled = true;

  if (bankroll <= 0) {
    raceStatusEl.textContent = "Bankroll is zero. Game over!";
    placeBetBtn.disabled = true;
  }
}

// --- RACE LOGIC ---

function resetRacerPositions() {
  const icons = trackEl.querySelectorAll(".racer-icon");
  icons.forEach(icon => {
    icon.style.left = "8%";            // starting point
  });
}

function getWeightedFinishOrder() {
  const remaining = RACERS.map(r => ({
    id: r.id,
    name: r.name,
    odds: r.odds,
    weight: 1 / r.odds
  }));

  const order = [];

  while (remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, r) => sum + r.weight, 0);
    let rnd = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      rnd -= remaining[i].weight;
      if (rnd <= 0) {
        chosenIndex = i;
        break;
      }
    }

    const chosen = remaining.splice(chosenIndex, 1)[0];
    order.push(chosen);
  }

  return order;
}

function startRaceAnimation(finishOrder, onComplete) {
  const baseTime = 5500; // ms winner
  const gap = 400;       // ms extra per position

  const startPercent = 8;   // must match CSS
  const endPercent = 88;    // just before finish line

  racerStates = finishOrder.map((entry, index) => {
    const lane = trackEl.querySelector(`.lane[data-racer-id="${entry.id}"]`);
    const icon = lane.querySelector(".racer-icon");
    const finishTime = baseTime + index * gap;
    return {
      id: entry.id,
      icon,
      finishTime,
      progress: 0
    };
  });

  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    let allFinished = true;

    racerStates.forEach(state => {
      const t = Math.min(elapsed / state.finishTime, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      state.progress = eased;

      const percent = startPercent + eased * (endPercent - startPercent);
      state.icon.style.left = `${percent}%`;

      if (t < 1) {
        allFinished = false;
      }
    });

    if (!allFinished) {
      requestAnimationFrame(step);
    } else {
      const winnerId = finishOrder[0].id;
      raceStatusEl.textContent = `Race finished! Winner: ${
        RACERS.find(r => r.id === winnerId).name
      }`;
      onComplete(winnerId);
    }
  }

  requestAnimationFrame(step);
}

function handlePayout(winnerId, finishOrder) {
  const winner = RACERS.find(r => r.id === winnerId);
  const positionMap = {};
  finishOrder.forEach((entry, index) => {
    positionMap[entry.id] = index + 1;
  });

  const bet = currentBet;
  let payoutText = "";
  let delta = 0;

  if (!bet) {
    payoutText = "No bet placed.";
  } else {
    if (bet.racerId === winnerId) {
      const winAmount = Math.round(bet.amount * winner.odds);
      bankroll += winAmount;
      payoutText = `WIN! You bet ${bet.amount} on ${winner.name} at ${winner.odds.toFixed(
        1
      )}x and won ${winAmount}.`;
      delta = winAmount;
    } else {
      bankroll -= bet.amount;
      const lostRacer = RACERS.find(r => r.id === bet.racerId);
      payoutText = `LOSS. You bet ${bet.amount} on ${lostRacer.name}, who finished ${positionMap[bet.racerId]}th.`;
      delta = -bet.amount;
    }
  }

  updateBankrollDisplay();
  addLogEntry(winner, finishOrder, payoutText, delta);

  placeBetBtn.disabled = bankroll <= 0;
}

// --- LOG ---

function addLogEntry(winner, finishOrder, payoutText, delta) {
  const entry = document.createElement("div");
  entry.className = "log-entry";

  const header = document.createElement("div");
  header.innerHTML = `<strong>Race ${raceNumber}</strong> — Winner: ${winner.name}`;

  const positions = document.createElement("div");
  const orderText = finishOrder
    .map((r, i) => `${i + 1}. ${r.name}`)
    .join("  ·  ");
  positions.textContent = orderText;

  const payout = document.createElement("div");
  payout.textContent = payoutText;
  payout.className =
    delta > 0 ? "payout-win" : delta < 0 ? "payout-loss" : "";

  entry.appendChild(header);
  entry.appendChild(positions);
  entry.appendChild(payout);

  logEl.prepend(entry);
}

// --- START ---

init();

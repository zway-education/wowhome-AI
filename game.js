// 貓咪咖啡廳 - 簡易網頁小遊戲
(function () {
  const CAT_EMOJIS = ["🐱", "😺", "😸", "😻", "🐈", "🐈‍⬛"];

  const ALL_INGREDIENTS = [
    { id: "milk", name: "牛奶", emoji: "🥛", unlockLevel: 1 },
    { id: "coffee", name: "咖啡", emoji: "☕", unlockLevel: 1 },
    { id: "sugar", name: "糖", emoji: "🍬", unlockLevel: 1 },
    { id: "fish", name: "魚乾", emoji: "🐟", unlockLevel: 2 },
    { id: "honey", name: "蜂蜜", emoji: "🍯", unlockLevel: 2 },
    { id: "mint", name: "薄荷", emoji: "🌿", unlockLevel: 3 },
    { id: "berry", name: "莓果", emoji: "🍓", unlockLevel: 3 },
    { id: "cream", name: "奶油", emoji: "🍦", unlockLevel: 4 },
  ];

  const state = {
    coins: 0,
    level: 1,
    reputation: 0,
    xp: 0,
    xpToLevel: 20,
    maxSlots: 3,
    patienceTime: 18, // seconds
    customers: [],
    selectedCustomerId: null,
    currentDrink: [],
    nextCustomerId: 1,
    maxCustomers: 3,
    spawnCooldown: 0,
  };

  const els = {
    coins: document.getElementById("coins"),
    level: document.getElementById("level"),
    reputation: document.getElementById("reputation"),
    customers: document.getElementById("customers"),
    ingredients: document.getElementById("ingredients"),
    orderHint: document.getElementById("order-hint"),
    drinkSlots: document.getElementById("drink-slots"),
    serveBtn: document.getElementById("serve-btn"),
    resetBtn: document.getElementById("reset-btn"),
    shop: document.getElementById("shop"),
    toast: document.getElementById("toast"),
  };

  function unlockedIngredients() {
    return ALL_INGREDIENTS.filter((i) => i.unlockLevel <= state.level);
  }

  function randomOrder() {
    const pool = unlockedIngredients();
    const size = Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(3, state.maxSlots)));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.max(1, size)).map((i) => i.id);
  }

  function spawnCustomer() {
    if (state.customers.length >= state.maxCustomers) return;
    const order = randomOrder();
    state.customers.push({
      id: state.nextCustomerId++,
      emoji: CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)],
      order,
      patience: state.patienceTime,
      maxPatience: state.patienceTime,
    });
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1600);
  }

  function selectCustomer(id) {
    state.selectedCustomerId = id;
    state.currentDrink = [];
    render();
  }

  function addIngredient(id) {
    if (!state.selectedCustomerId) return;
    if (state.currentDrink.length >= state.maxSlots) return;
    state.currentDrink.push(id);
    render();
  }

  function resetDrink() {
    state.currentDrink = [];
    render();
  }

  function ordersMatch(order, drink) {
    if (order.length !== drink.length) return false;
    const a = [...order].sort();
    const b = [...drink].sort();
    return a.every((v, i) => v === b[i]);
  }

  function serveDrink() {
    const customer = state.customers.find((c) => c.id === state.selectedCustomerId);
    if (!customer) return;
    const match = ordersMatch(customer.order, state.currentDrink);
    if (match) {
      const reward = 10 + customer.order.length * 5;
      state.coins += reward;
      state.reputation += 1;
      gainXp(10);
      showToast(`太棒了！貓咪很滿意，獲得 ${reward} 金幣！ 😻`);
    } else {
      showToast("嗯...這不是我點的東西 😿");
      state.reputation = Math.max(0, state.reputation - 1);
    }
    state.customers = state.customers.filter((c) => c.id !== customer.id);
    state.selectedCustomerId = null;
    state.currentDrink = [];
    render();
    save();
  }

  function gainXp(amount) {
    state.xp += amount;
    while (state.xp >= state.xpToLevel) {
      state.xp -= state.xpToLevel;
      state.level += 1;
      state.xpToLevel = Math.round(state.xpToLevel * 1.4);
      showToast(`升級了！等級 ${state.level} 🎉`);
    }
  }

  const SHOP_ITEMS = [
    {
      id: "slot",
      name: "擴充調製槽",
      desc: (s) => `目前上限：${s.maxSlots} 種食材`,
      cost: (s) => 40 + s.maxSlots * 30,
      maxLevel: 5,
      level: (s) => s.maxSlots - 3,
      apply: (s) => { s.maxSlots += 1; },
    },
    {
      id: "patience",
      name: "貓咪耐心訓練",
      desc: (s) => `目前耐心時間：${s.patienceTime}s`,
      cost: (s) => 30 + (18 - s.patienceTime === 0 ? 0 : (25 - s.patienceTime) * 15),
      maxLevel: 6,
      level: (s) => Math.round((25 - s.patienceTime) / 2),
      apply: (s) => { s.patienceTime += 3; },
    },
    {
      id: "capacity",
      name: "擴大店面",
      desc: (s) => `同時容納客人：${s.maxCustomers}`,
      cost: (s) => 50 + s.maxCustomers * 40,
      maxLevel: 5,
      level: (s) => s.maxCustomers - 3,
      apply: (s) => { s.maxCustomers += 1; },
    },
  ];

  function buyShopItem(id) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item) return;
    const lvl = item.level(state);
    if (lvl >= item.maxLevel) return;
    const cost = item.cost(state);
    if (state.coins < cost) {
      showToast("金幣不夠喔！");
      return;
    }
    state.coins -= cost;
    item.apply(state);
    render();
    save();
  }

  function ingredientLabel(id) {
    const ing = ALL_INGREDIENTS.find((i) => i.id === id);
    return ing ? `${ing.emoji}${ing.name}` : id;
  }

  function render() {
    els.coins.textContent = state.coins;
    els.level.textContent = state.level;
    els.reputation.textContent = state.reputation;

    // customers
    els.customers.innerHTML = "";
    if (state.customers.length === 0) {
      els.customers.innerHTML = '<div style="color:#999">目前沒有客人，稍等一下...</div>';
    }
    state.customers.forEach((c) => {
      const div = document.createElement("div");
      div.className = "customer" + (c.id === state.selectedCustomerId ? " selected" : "");
      const pct = Math.max(0, (c.patience / c.maxPatience) * 100);
      div.innerHTML = `
        <div class="emoji">${c.emoji}</div>
        <div class="order">想要：${c.order.map(ingredientLabel).join(" + ")}</div>
        <div class="patience-bar"><div class="patience-fill" style="width:${pct}%; background:${pct < 30 ? "#e06666" : "#7bd389"}"></div></div>
      `;
      div.addEventListener("click", () => selectCustomer(c.id));
      els.customers.appendChild(div);
    });

    // ingredients
    els.ingredients.innerHTML = "";
    unlockedIngredients().forEach((ing) => {
      const btn = document.createElement("button");
      btn.className = "ingredient";
      btn.textContent = `${ing.emoji} ${ing.name}`;
      btn.disabled = !state.selectedCustomerId || state.currentDrink.length >= state.maxSlots;
      btn.addEventListener("click", () => addIngredient(ing.id));
      els.ingredients.appendChild(btn);
    });

    // order hint
    if (!state.selectedCustomerId) {
      els.orderHint.textContent = "請先點選一位客人";
    } else {
      const c = state.customers.find((c) => c.id === state.selectedCustomerId);
      els.orderHint.textContent = c ? `正在為 ${c.emoji} 調製飲品（食材槽 ${state.currentDrink.length}/${state.maxSlots}）` : "";
    }

    // drink slots
    els.drinkSlots.innerHTML = "";
    state.currentDrink.forEach((id) => {
      const span = document.createElement("span");
      span.className = "slot-item";
      span.textContent = ingredientLabel(id);
      els.drinkSlots.appendChild(span);
    });

    els.serveBtn.disabled = !state.selectedCustomerId || state.currentDrink.length === 0;

    // shop
    els.shop.innerHTML = "";
    SHOP_ITEMS.forEach((item) => {
      const lvl = item.level(state);
      const maxed = lvl >= item.maxLevel;
      const div = document.createElement("div");
      div.className = "shop-item";
      div.innerHTML = `
        <h3>${item.name}</h3>
        <p>${item.desc(state)}</p>
        <p>${maxed ? "已達上限" : `花費：${item.cost(state)} 💰`}</p>
        <button ${maxed ? "disabled" : ""}>${maxed ? "已滿級" : "升級"}</button>
      `;
      div.querySelector("button").addEventListener("click", () => buyShopItem(item.id));
      els.shop.appendChild(div);
    });
  }

  function tick() {
    let changed = false;
    state.customers.forEach((c) => {
      c.patience -= 1;
    });
    const leaving = state.customers.filter((c) => c.patience <= 0);
    if (leaving.length) {
      leaving.forEach((c) => {
        if (c.id === state.selectedCustomerId) {
          state.selectedCustomerId = null;
          state.currentDrink = [];
        }
      });
      state.reputation = Math.max(0, state.reputation - leaving.length);
      showToast("有貓咪等不及走掉了... 😿");
      changed = true;
    }
    state.customers = state.customers.filter((c) => c.patience > 0);

    state.spawnCooldown -= 1;
    if (state.spawnCooldown <= 0) {
      spawnCustomer();
      state.spawnCooldown = 4 + Math.floor(Math.random() * 3);
      changed = true;
    }
    if (changed) render();
    else {
      // still update patience bars smoothly
      render();
    }
  }

  function save() {
    localStorage.setItem("cat-cafe-save", JSON.stringify({
      coins: state.coins,
      level: state.level,
      reputation: state.reputation,
      xp: state.xp,
      xpToLevel: state.xpToLevel,
      maxSlots: state.maxSlots,
      patienceTime: state.patienceTime,
      maxCustomers: state.maxCustomers,
    }));
  }

  function load() {
    try {
      const raw = localStorage.getItem("cat-cafe-save");
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(state, data);
    } catch (e) { /* ignore corrupt save */ }
  }

  function init() {
    load();
    els.serveBtn.addEventListener("click", serveDrink);
    els.resetBtn.addEventListener("click", resetDrink);
    spawnCustomer();
    spawnCustomer();
    state.spawnCooldown = 5;
    render();
    setInterval(tick, 1000);
    setInterval(save, 5000);
  }

  init();
})();

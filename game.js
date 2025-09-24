document.addEventListener('DOMContentLoaded', () => {
    console.log('遊戲《元素守護者》已成功載入！');

    // --- DOM 元素 --- //
    const gameBoard = document.getElementById('game-board');
    const base = document.getElementById('base');
    const staminaDisplay = document.getElementById('stamina-display');
    const baseHealthDisplay = document.getElementById('base-health-display');
    const waveDisplay = document.getElementById('wave-display');
    const handContainer = document.getElementById('hand');

    // --- 遊戲狀態 --- //
    let stamina = 10;
    let maxStamina = 10;
    let baseHealth = 100;
    let wave = 0;
    const gridSize = 10; // 10x10 網格
    let placementMode = null; // { card, element }

    // --- 敵人與波次 --- //
    let enemies = [];
    let towers = [];
    let projectiles = [];
    let waveTimer = 3000; // 3秒後第一波
    let waveEnemyCount = 5;

    // --- 卡牌系統 --- //
    const cardLibrary = [
        { id: 1, name: '火燄塔', type: 'building', cost: 3, description: '建造一座基礎火燄塔' },
        { id: 2, name: '冰霜塔', type: 'building', cost: 4, description: '建造一座減速冰霜塔' },
        { id: 3, name: '火球術', type: 'skill', cost: 5, description: '對指定區域造成傷害' },
        { id: 4, name: '基地修復', type: 'skill', cost: 2, description: '恢復基地少量生命' },
    ];
    let deck = [];
    let hand = [];
    const maxHandSize = 5;

    // --- 初始化遊戲 --- //
    function initializeGame() {
        console.log('正在初始化遊戲...');
        // 創建網格
        gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.x = i % gridSize;
            cell.dataset.y = Math.floor(i / gridSize);
            cell.addEventListener('click', onGridCellClick);
            gameBoard.appendChild(cell);
        }
        console.log(`${gridSize}x${gridSize} 網格已建立。`);

        // 更新顯示
        updateDisplays();
        buildDeck();
        drawCards(maxHandSize);
    }

    function updateDisplays() {
        staminaDisplay.textContent = stamina;
        baseHealthDisplay.textContent = baseHealth;
        waveDisplay.textContent = wave;
    }

    // --- 卡牌功能 --- //
    function buildDeck() {
        // 簡單起見，每種卡牌先放5張進牌組
        deck = [];
        for (const card of cardLibrary) {
            for (let i = 0; i < 5; i++) {
                deck.push(card);
            }
        }
        // 洗牌
        deck.sort(() => Math.random() - 0.5);
        console.log(`牌組已建立，共 ${deck.length} 張卡。`);
    }

    function drawCards(amount) {
        for (let i = 0; i < amount; i++) {
            if (hand.length < maxHandSize && deck.length > 0) {
                hand.push(deck.pop());
            }
        }
        renderHand();
    }

    function renderHand() {
        handContainer.innerHTML = '';
        hand.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.innerHTML = `
                <div class="card-name">${card.name}</div>
                <div class="card-description">${card.description}</div>
                <div class="card-cost">${card.cost}</div>
            `;
            cardElement.dataset.cardIndex = index;
            cardElement.addEventListener('click', onCardClick);
            handContainer.appendChild(cardElement);
        });
    }

    function onCardClick(event) {
        // 如果正在放置，則取消舊的放置模式
        if (placementMode) {
            cancelPlacementMode();
        }

        const cardIndex = event.currentTarget.dataset.cardIndex;
        const card = hand[cardIndex];

        if (stamina >= card.cost) {
            if (card.type === 'building') {
                enterPlacementMode(card, cardIndex);
            } else {
                // 技能卡直接使用
                playSkillCard(card, cardIndex);
            }
        } else {
            console.log('體力不足！');
        }
    }

    function playSkillCard(card, cardIndex) {
        stamina -= card.cost;
        console.log(`使用了技能卡: ${card.name}`);
        hand.splice(cardIndex, 1);
        renderHand();
        updateDisplays();
        drawCards(1);
    }

    function enterPlacementMode(card, cardIndex) {
        placementMode = { card, cardIndex };
        document.body.style.cursor = 'crosshair';
        gameBoard.style.border = '3px solid #ff0000'; // 邊框變紅
        console.log(`進入放置模式: ${card.name}`);

        // 監聽右鍵取消
        window.addEventListener('contextmenu', cancelPlacementMode, { once: true });
    }

    function cancelPlacementMode(e) {
        if(e) e.preventDefault();
        console.log('取消放置模式');
        placementMode = null;
        document.body.style.cursor = 'default';
        gameBoard.style.border = '3px solid #555'; // 恢復邊框顏色
    }

    function onGridCellClick(event) {
        if (placementMode) {
            const cell = event.currentTarget;
            if (cell.childElementCount > 0) {
                console.log('此處無法建造！');
                return;
            }

            const card = placementMode.card;
            const cardIndex = placementMode.cardIndex;

            // 消耗體力並放置塔
            stamina -= card.cost;
            console.log(`建造了 ${card.name}`);

            const tower = {
                x: cell.offsetLeft + cell.offsetWidth / 2,
                y: cell.offsetTop + cell.offsetHeight / 2,
                range: 100, // 攻擊範圍
                attackSpeed: 1000, // 攻擊速度 (ms)
                attackCooldown: 0,
                damage: 25,
                type: card.name.includes('火') ? 'fire' : 'ice',
                element: towerElement
            };
            towers.push(tower);

            cell.appendChild(towerElement);

            // 從手牌中移除
            hand.splice(cardIndex, 1);

            // 退出放置模式並更新UI
            cancelPlacementMode(); // 這會處理邊框和滑鼠
            renderHand();
            updateDisplays();
            drawCards(1);
        }
    }

    // --- 敵人與波次控制 ---
    function spawnEnemy() {
        const enemyId = `enemy-${Date.now()}-${Math.random()}`;
        const enemy = {
            id: enemyId,
            health: 100,
            maxHealth: 100,
            speed: 0.5, // 單位: px / frame
            element: document.createElement('div'),
        };

        const boardSize = gameBoard.offsetWidth;
        const spawnEdge = Math.floor(Math.random() * 4);
        // 0: top, 1: right, 2: bottom, 3: left
        switch (spawnEdge) {
            case 0: // Top
                enemy.x = Math.random() * boardSize;
                enemy.y = -20;
                break;
            case 1: // Right
                enemy.x = boardSize + 20;
                enemy.y = Math.random() * boardSize;
                break;
            case 2: // Bottom
                enemy.x = Math.random() * boardSize;
                enemy.y = boardSize + 20;
                break;
            case 3: // Left
                enemy.x = -20;
                enemy.y = Math.random() * boardSize;
                break;
        }

        enemy.element.id = enemyId;
        enemy.element.classList.add('enemy');
        enemy.element.style.left = `${enemy.x}px`;
        enemy.element.style.top = `${enemy.y}px`;
        enemy.element.innerHTML = `<div class="enemy-health-bar-bg"><div class="enemy-health-bar"></div></div>`;

        enemies.push(enemy);
        gameBoard.appendChild(enemy.element);
    }

    function moveEnemies() {
        const boardRect = gameBoard.getBoundingClientRect();
        const baseRect = base.getBoundingClientRect();
        const targetX = (baseRect.left - boardRect.left) + baseRect.width / 2;
        const targetY = (baseRect.top - boardRect.top) + baseRect.height / 2;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const dx = targetX - enemy.x;
            const dy = targetY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) {
                // 敵人到達基地
                baseHealth -= 10; // 假設每個敵人造成10點傷害
                if(baseHealth < 0) baseHealth = 0;
                enemy.element.remove();
                enemies.splice(i, 1);
                updateDisplays();
                console.log('基地受到攻擊！');
                continue;
            }

            const moveX = (dx / distance) * enemy.speed;
            const moveY = (dy / distance) * enemy.speed;

            enemy.x += moveX;
            enemy.y += moveY;

            enemy.element.style.left = `${enemy.x}px`;
            enemy.element.style.top = `${enemy.y}px`;
        }
    }

    function handleWaves(deltaTime) {
        waveTimer -= deltaTime;
        if (waveTimer <= 0) {
            wave++;
            console.log(`第 ${wave} 波敵人來襲！`);
            for (let i = 0; i < waveEnemyCount; i++) {
                spawnEnemy();
            }
            waveEnemyCount += 2; // 下一波敵人更多
            waveTimer = 15000; // 15秒後下一波
            updateDisplays();
        }
    }

    // --- 攻擊邏輯 ---
    function updateTowers(deltaTime) {
        for (const tower of towers) {
            tower.attackCooldown -= deltaTime;
            if (tower.attackCooldown <= 0) {
                const target = findTarget(tower);
                if (target) {
                    tower.attackCooldown = tower.attackSpeed;
                    createProjectile(tower, target);
                }
            }
        }
    }

    function findTarget(tower) {
        for (const enemy of enemies) {
            const dx = enemy.x - tower.x;
            const dy = enemy.y - tower.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= tower.range) {
                return enemy;
            }
        }
        return null;
    }

    function createProjectile(source, target) {
        const projectile = {
            x: source.x,
            y: source.y,
            speed: 5, // px per frame
            target: target,
            damage: source.damage,
            element: document.createElement('div'),
        };

        projectile.element.classList.add('projectile');
        projectile.element.style.left = `${projectile.x}px`;
        projectile.element.style.top = `${projectile.y}px`;

        projectiles.push(projectile);
        gameBoard.appendChild(projectile.element);
    }

    function updateProjectiles() {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            const target = p.target;

            // 如果目標已死亡，移除子彈
            if (target.health <= 0) {
                p.element.remove();
                projectiles.splice(i, 1);
                continue;
            }

            const dx = target.x - p.x;
            const dy = target.y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < p.speed) {
                // 命中目標
                damageEnemy(target, p.damage);
                p.element.remove();
                projectiles.splice(i, 1);
            } else {
                p.x += (dx / distance) * p.speed;
                p.y += (dy / distance) * p.speed;
                p.element.style.left = `${p.x}px`;
                p.element.style.top = `${p.y}px`;
            }
        }
    }

    function damageEnemy(enemy, amount) {
        enemy.health -= amount;
        const healthBar = enemy.element.querySelector('.enemy-health-bar');
        if (healthBar) {
            healthBar.style.width = `${(enemy.health / enemy.maxHealth) * 100}%`;
        }

        if (enemy.health <= 0) {
            enemy.element.remove();
            // 從主陣列中移除敵人
            const enemyIndex = enemies.findIndex(e => e.id === enemy.id);
            if (enemyIndex > -1) {
                enemies.splice(enemyIndex, 1);
            }
        }
    }

    // --- 遊戲主循環 --- //
    let lastTime = 0;
    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // 更新波次
        handleWaves(deltaTime);

        // 移動敵人
        moveEnemies();

        // 更新防禦塔 (索敵與攻擊)
        updateTowers(deltaTime);

        // 更新子彈
        updateProjectiles();

        // 恢復體力 (每秒恢復1點)
        stamina = Math.min(maxStamina, stamina + (deltaTime / 1000));
        staminaDisplay.textContent = Math.floor(stamina);

        if (baseHealth <= 0) {
            console.log('遊戲結束！');
            alert('遊戲結束！您的基地已被摧毀。');
            return; // 停止遊戲循環
        }

        requestAnimationFrame(gameLoop);
    }

    // --- 啟動遊戲 --- //
    initializeGame();
    requestAnimationFrame(gameLoop);
});

// Основные переменные
let currentUser = null;
let casesData = [];
let inventoryItems = [];
let bonusTimer = null;
let bonusTimeLeft = 1800;
let currentInventoryPage = 1;
const ITEMS_PER_PAGE = 4;
let animationFrameId = null;
let caseAnimationTimeout = null;
let isLoginMode = true;

// DOM элементы
const balanceElement = document.getElementById('balance');
const casesContainer = document.getElementById('casesContainer');
const bonusSection = document.getElementById('bonusSection');
const bonusTimerElement = document.getElementById('bonusTimer');
const claimBonusBtn = document.getElementById('claimBonusBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const profileBtn = document.getElementById('profileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminBtn = document.getElementById('adminBtn');
const syncBtn = document.getElementById('syncBtn');
const authModal = document.getElementById('authModal');
const caseModal = document.getElementById('caseModal');
const profileModal = document.getElementById('profileModal');
const modalTitle = document.getElementById('modalTitle');
const authForm = document.getElementById('authForm');
const switchAuthMode = document.getElementById('switchAuthMode');
const submitAuthBtn = document.getElementById('submitAuthBtn');
const caseReward = document.getElementById('caseReward');
const inventoryContainer = document.getElementById('inventoryContainer');
const profileUsername = document.getElementById('profileUsername');
const profileBalance = document.getElementById('profileBalance');
const upgradeBtn = document.getElementById('upgradeBtn');
const upgradeModal = document.getElementById('upgradeModal');
const upgradeInventory = document.getElementById('upgradeInventory');
const siteSkins = document.getElementById('siteSkins');
const startUpgradeBtn = document.getElementById('startUpgradeBtn');
const upgradeCircle = document.getElementById('upgradeCircle');
const upgradeProgress = document.getElementById('upgradeProgress');
const upgradePointer = document.getElementById('upgradePointer');
const chanceValue = document.getElementById('chanceValue');

// Текущий выбранный кейс и предмет
let selectedCase = null;
let currentReward = null;
let selectedInventoryItem = null;
let selectedSiteSkin = null;
let upgradeResult = null;
let upgradeSuccessChance = 0;
let currentInventoryPage_upgrade = 1;
let currentSitePage = 1;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadCases();
    checkAuthStatus();
    setupEventListeners();
    setupBonusTimer();
});

// Новые функции для апгрейда
function showUpgradeModal() {
    if (!currentUser) {
        alert('Пожалуйста, войдите или зарегистрируйтесь');
        showAuthModal('login');
        return;
    }
    
    if (!currentUser.inventory || !currentUser.inventory.length) {
        alert('Ваш инвентарь пуст');
        return;
    }
    
    upgradeModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Запрещаем прокрутку фона
    currentInventoryPage = 1;
    currentSitePage = 1;
    renderUpgradeInventory();
    renderSiteSkins();
    resetUpgradeUI();
}

function resetUpgradeUI() {
    startUpgradeBtn.disabled = true;
    selectedInventoryItem = null;
    selectedSiteSkin = null;
    upgradeSuccessChance = 0;
    chanceValue.textContent = '0%';
    upgradeProgress.style.transform = 'rotate(0deg)';
    upgradePointer.style.opacity = '0';
    upgradePointer.style.animation = '';
    
    // Удаляем предыдущий результат
    const result = document.querySelector('.upgrade-result');
    if (result) result.remove();

    // Сбрасываем выделение всех предметов
    document.querySelectorAll('.skin-item').forEach(item => {
        item.classList.remove('selected');
    });
}

function renderUpgradeInventory() {
    if (!currentUser?.inventory?.length) {
        upgradeInventory.innerHTML = '<p class="empty-inventory">Ваш инвентарь пуст</p>';
        return;
    }

    const startIdx = (currentInventoryPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const itemsToShow = currentUser.inventory.slice(startIdx, endIdx);

    upgradeInventory.innerHTML = itemsToShow.map(item => `
        <div class="skin-item" data-id="${escapeHTML(item.name)}-${item.price}">
            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}">
            <div class="skin-info">
                <div class="skin-name">${escapeHTML(item.name)}</div>
                <div class="skin-price">${item.price} ₽</div>
            </div>
        </div>
    `).join('');

    // Пагинация
    const totalPages = Math.ceil(currentUser.inventory.length / ITEMS_PER_PAGE);
    const paginationHTML = generatePagination(currentInventoryPage, totalPages, 'changeInventoryPage');
    document.getElementById('inventoryPagination').innerHTML = paginationHTML;

    // Обработчики выбора
    document.querySelectorAll('#upgradeInventory .skin-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('#upgradeInventory .skin-item').forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            selectedInventoryItem = currentUser.inventory.find(
                i => i.name === this.querySelector('.skin-name').textContent
            );
            updateUpgradeChance();
        });
    });
}

function renderSiteSkins() {
    const uniqueSkins = getUniqueSkins();
    const startIdx = (currentSitePage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const skinsToShow = uniqueSkins.slice(startIdx, endIdx);

    siteSkins.innerHTML = skinsToShow.map(skin => `
        <div class="skin-item" data-id="${escapeHTML(skin.name)}-${skin.price}">
            <img src="${escapeHTML(skin.image)}" alt="${escapeHTML(skin.name)}">
            <div class="skin-info">
                <div class="skin-name">${escapeHTML(skin.name)}</div>
                <div class="skin-price">${skin.price} ₽</div>
            </div>
        </div>
    `).join('');

    // Пагинация
    const totalPages = Math.ceil(uniqueSkins.length / ITEMS_PER_PAGE);
    const paginationHTML = generatePagination(currentSitePage, totalPages, 'changeSitePage');
    document.getElementById('sitePagination').innerHTML = paginationHTML;

    // Обработчики выбора
    document.querySelectorAll('#siteSkins .skin-item').forEach(skin => {
        skin.addEventListener('click', function() {
            document.querySelectorAll('#siteSkins .skin-item').forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
            selectedSiteSkin = uniqueSkins.find(
                s => s.name === this.querySelector('.skin-name').textContent
            );
            updateUpgradeChance();
        });
    });
}

function generatePagination(currentPage, totalPages, changeFunction) {
    let paginationHTML = '';
    if (totalPages > 1) {
        paginationHTML += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                          onclick="${changeFunction}(${currentPage - 1})">&lt;</button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" 
                              onclick="${changeFunction}(${i})">${i}</button>`;
        }
        
        paginationHTML += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                          onclick="${changeFunction}(${currentPage + 1})">&gt;</button>`;
    }
    return paginationHTML;
}

function getSkinsData() {
    return [
        { name: "AK-47 | Searing Rage", price: 150, image: "ak Searing Rage.png", rarity: "rare" },
        { name: "AWP | Printstream", price: 800, image: "awp printstream.png", rarity: "epic" },
        { name: "Desert Eagle | Serpent Strike", price: 20000, image: "desertegle Serpent Strike.png", rarity: "legendary" },
    { name: "Glock-18 | Shinobu", price: 50, image: "glock Shinobu.png", rarity: "common" },
    { name: "UMP-45 | K.O. Factory", price: 200, image: "ump K.O. Factory.png", rarity: "rare" },
    { name: "Famas | Bad Trip", price: 450, image: "famas bad trip.png", rarity: "rare" },
    { name: "Galil | Control", price: 350, image: "galil Control.png", rarity: "rare" },
        { name: "AK-47 | Leet Museo", price: 2500, image: "ak Leet Museo.png", rarity: "legendary" },
        { name: "M4A4 | Ликорис лучистый", price: 200, image: "M4A4 Ликорис лучистый.png", rarity: "epic" },
    { name: "USP-S | Чёрный лотос", price: 45, image: "USP-S Чёрный лотос.png", rarity: "common" },
    { name: "Dual Berettas | Протектор", price: 50, image: "Dual Berettas Протектор.png", rarity: "common" },
    { name: "G3SG1 | Наблюдение", price: 55, image: "G3SG1 Наблюдение.png", rarity: "uncommon" },
    { name: "MAG-7 | Висмутовый спектр", price: 60, image: "MAG-7 Висмутовый спектр.png", rarity: "uncommon" },
    { name: "M4A4 | Облом", price: 650, image: "M4A4 Облом.png", rarity: "rare" },
    { name: "USP-S | Сайрекс", price: 55, image: "USP-S Сайрекс.png", rarity: "common" },
    { name: "P2000 | Дерн", price: 15, image: "P2000 Дерн.png", rarity: "common" },
    { name: "Sawed-Off | Принцесса пустошей", price: 200, image: "Sawed-Off Принцесса пустошей.png", rarity: "uncommon" },
    { name: "M4A4 | Hellish", price: 1000, image: "M4A4 Hellish.png", rarity: "epic" },
    { name: "Сикрет вей", price: 1000000, image: "сикретвей.jpg", rarity: "secret" },
    { name: "M4A4 | Eye of Horus", price: 10000, image: "M4A4 Eye of Horus.png", rarity: "legendary" },
    { name: "P250 | Цифровой архитектор", price: 550, image: "P250 Цифровой архитектор.png", rarity: "rare" },
    { name: "UMP-45 | Механизм", price: 10, image: "UMP-45 Механизм.png", rarity: "common" }
];
}

function getUniqueSkins() {
    return getSkinsData();
}

function changeInventoryPage(page) {
    if (page < 1 || page > Math.ceil(currentUser.inventory.length / ITEMS_PER_PAGE)) return;
    currentInventoryPage = page;
    renderUpgradeInventory();
}

function changeSitePage(page) {
    const uniqueSkins = getUniqueSkins();
    const totalPages = Math.ceil(uniqueSkins.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentSitePage = page;
    renderSiteSkins();
}

function updateUpgradeChance() {
    if (!selectedInventoryItem || !selectedSiteSkin) {
        startUpgradeBtn.disabled = true;
        chanceValue.textContent = '0%';
        upgradeProgress.style.transform = 'rotate(0deg)';
        return;
    }
    
    // Запрещаем апгрейд дорогого скина на дешевый
    if (selectedSiteSkin.price <= selectedInventoryItem.price) {
        startUpgradeBtn.disabled = true;
        chanceValue.textContent = 'Невозможно';
        upgradeProgress.style.transform = 'rotate(0deg)';
        
        // Показываем пользователю уведомление
        const upgradeCircleEl = document.getElementById('upgradeCircle');
        
        // Удаляем предыдущее уведомление, если оно есть
        const existingNotice = document.querySelector('.upgrade-notice');
        if (existingNotice) {
            existingNotice.remove();
        }
        
        // Создаем новое уведомление
        const notice = document.createElement('div');
        notice.className = 'upgrade-notice';
        notice.textContent = 'Нельзя апгрейдить на скин с меньшей стоимостью';
        notice.style.color = '#e74c3c';
        notice.style.textAlign = 'center';
        notice.style.marginTop = '10px';
        notice.style.fontWeight = 'bold';
        
        upgradeCircleEl.appendChild(notice);
        return;
    }
    
    // Удаляем уведомление, если оно есть
    const existingNotice = document.querySelector('.upgrade-notice');
    if (existingNotice) {
        existingNotice.remove();
    }
    
    // Расчет шанса с более четкой зависимостью от цены
    const priceDifference = selectedSiteSkin.price - selectedInventoryItem.price;
    
    // Чем больше разница в цене, тем меньше шанс
    let chance;
    if (priceDifference <= 100) {
        chance = 0.75; // Небольшая разница - высокий шанс
    } else if (priceDifference <= 500) {
        chance = 0.5; // Средняя разница - средний шанс
    } else if (priceDifference <= 2000) {
        chance = 0.3; // Большая разница - низкий шанс
    } else if (priceDifference <= 10000) {
        chance = 0.15; // Огромная разница - очень низкий шанс
    } else {
        chance = 0.05; // Экстремальная разница - минимальный шанс
    }
    
    // Если скин редкий, шанс ниже
    const rarityMultiplier = {
        'common': 1,
        'uncommon': 0.9,
        'rare': 0.8,
        'epic': 0.7,
        'legendary': 0.6,
        'secret': 0.5
    };
    
    const targetRarity = selectedSiteSkin.rarity || 'common';
    if (rarityMultiplier[targetRarity]) {
        chance *= rarityMultiplier[targetRarity];
    }
    
    // Финальный шанс с ограничениями
    upgradeSuccessChance = Math.min(0.9, Math.max(0.05, chance));
    
    // Плавное изменение прогресса
    const degrees = upgradeSuccessChance * 360;
    upgradeProgress.style.transform = `rotate(${degrees}deg)`;
    chanceValue.textContent = `${Math.round(upgradeSuccessChance * 100)}%`;
    chanceValue.style.background = `linear-gradient(90deg, 
        #e74c3c 0%, 
        #f39c12 ${upgradeSuccessChance * 50}%, 
        #2ecc71 ${upgradeSuccessChance * 100}%)`;
    chanceValue.style.webkitBackgroundClip = 'text';
    chanceValue.style.webkitTextFillColor = 'transparent';
    
    startUpgradeBtn.disabled = false;
}

function startUpgrade() {
    if (!selectedInventoryItem || !selectedSiteSkin) return;
    
    // Дополнительная проверка на стоимость
    if (selectedSiteSkin.price <= selectedInventoryItem.price) {
        alert('Нельзя улучшить скин на предмет с меньшей или равной стоимостью');
        return;
    }
    
    startUpgradeBtn.disabled = true;
    upgradeResult = Math.random() < upgradeSuccessChance;
    
    // Сохраняем текущее состояние для восстановления в случае ошибки
    const previousInventory = [...currentUser.inventory];
    
    try {
    // Удаляем скин из инвентаря
    const itemIndex = currentUser.inventory.findIndex(
        item => item.name === selectedInventoryItem.name && 
               item.price === selectedInventoryItem.price
    );
    if (itemIndex !== -1) {
        currentUser.inventory.splice(itemIndex, 1);
        } else {
            console.error("Ошибка: скин не найден в инвентаре");
            throw new Error("Скин не найден в инвентаре");
    }
    
    // Если апгрейд успешный - добавляем новый скин
    if (upgradeResult) {
            currentUser.inventory.push({...selectedSiteSkin}); // Клонируем объект скина
    }
    
    // Сохраняем изменения
    updateUserInDatabase(currentUser);
    
    // Запускаем анимацию
    animateUpgrade();
    } catch (error) {
        console.error("Ошибка в процессе апгрейда:", error);
        // В случае ошибки восстанавливаем инвентарь
        currentUser.inventory = previousInventory;
        updateUserInDatabase(currentUser);
        startUpgradeBtn.disabled = false;
        alert("Произошла ошибка при апгрейде. Пожалуйста, попробуйте снова.");
    }
}

function animateUpgrade() {
    upgradePointer.style.opacity = '1';
    const duration = 3000;
    let startTime = null;
    
    // Определяем угол успешной и неуспешной зоны
    const successAngleDegrees = upgradeSuccessChance * 360;
    const maxDegrees = 1440; // 4 полных оборота
    
    // Рассчитываем финальный угол в зависимости от результата
    // Для успеха - в пределах зеленой зоны, для неудачи - вне зеленой зоны
    const finalDegreePosition = upgradeResult 
        ? successAngleDegrees - Math.floor(Math.random() * (successAngleDegrees * 0.3) + 10)  // Успех - ближе к концу зеленой зоны
        : successAngleDegrees + Math.floor(Math.random() * 20) + 5;  // Неудача - чуть дальше зеленой зоны
    
    // Финальный угол с учетом полных оборотов
    const finalRotation = maxDegrees - 360 + finalDegreePosition;
    
    // Сбрасываем предыдущую анимацию
    upgradePointer.style.transform = 'translateX(-50%) rotate(0deg)';
    
    // Сохраняем исходное положение зеленой зоны (для проверки)
    const originalGreenPosition = upgradeProgress.style.transform;
    
    const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ускорение в начале и замедление в конце (для более реалистичного вращения)
        let easedProgress;
        if (progress < 0.7) {
            easedProgress = progress * 1.2;  // Быстрое начало
        } else if (progress < 0.9) {
            easedProgress = 0.84 + (progress - 0.7) * 0.8;  // Замедление
        } else {
            easedProgress = 0.96 + (progress - 0.9) * 0.4;  // Плавная остановка
        }
        
        // Вращение указателя с учетом финального положения
        const rotation = easedProgress * finalRotation;
        upgradePointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        
        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            // Проверяем, не изменилось ли положение зеленой зоны во время анимации
            if (originalGreenPosition !== upgradeProgress.style.transform) {
                console.log("Произошло изменение зеленой зоны. Корректируем результат.");
                // Если что-то изменилось, пересчитываем результат, чтобы он соответствовал текущей зоне
                const currentAngle = rotation % 360;
                const currentGreenEnd = parseInt(upgradeProgress.style.transform.match(/rotate\((\d+)deg\)/)[1]);
                upgradeResult = currentAngle <= currentGreenEnd;
            }
            
            // Выводим результат
            showUpgradeResult();
            animationFrameId = null;
        }
    };
    
    animationFrameId = requestAnimationFrame(animate);
}

function showUpgradeResult() {
    // Временно отключаем звуки, пока не добавим файлы
    /*
    const soundEffect = new Audio(upgradeResult ? 'sounds/success.mp3' : 'sounds/fail.mp3');
    soundEffect.volume = 0.5;
    
    try {
        soundEffect.play().catch(err => {
            console.log('Звук не воспроизведен:', err);
        });
    } catch (err) {
        console.log('Ошибка при воспроизведении звука:', err);
    }
    */
    
    // Создаем анимацию для результата
    const resultDiv = document.createElement('div');
    resultDiv.className = `upgrade-result ${upgradeResult ? 'success' : 'fail'}`;
    
    const rarityClass = upgradeResult ? selectedSiteSkin.rarity || 'common' : '';
    const profitInfo = upgradeResult ? 
        `<div class="profit-info">Прибыль: <span class="profit-value">+${selectedSiteSkin.price - selectedInventoryItem.price} ₽</span></div>` : '';
    
    resultDiv.innerHTML = `
        <h3 class="${rarityClass}-text">${upgradeResult ? 'УСПЕХ!' : 'НЕ БЕДА'}</h3>
        ${upgradeResult ? 
            `<img src="${escapeHTML(selectedSiteSkin.image)}" alt="${escapeHTML(selectedSiteSkin.name)}" class="result-image ${rarityClass}">
             <p>Вы получили: ${escapeHTML(selectedSiteSkin.name)}</p>
             ${profitInfo}` : 
            `<p>Вы потеряли: ${escapeHTML(selectedInventoryItem.name)}</p>
             <div class="chance-info">Шанс был: ${Math.round(upgradeSuccessChance * 100)}%</div>`
        }
        <button onclick="closeUpgradeResult()" class="${upgradeResult ? 'success-btn' : 'fail-btn'}">OK</button>
    `;
    
    upgradeCircle.appendChild(resultDiv);
    
    // Добавляем запись в историю апгрейдов
    addUpgradeToHistory(selectedInventoryItem, selectedSiteSkin, upgradeResult);
    
    setTimeout(() => resultDiv.classList.add('show'), 100);
}

// Функция для добавления записи в историю апгрейдов
function addUpgradeToHistory(fromSkin, toSkin, success) {
    if (!currentUser) return;
    
    // Инициализируем историю, если её нет
    if (!currentUser.upgradeHistory) {
        currentUser.upgradeHistory = [];
    }
    
    // Добавляем запись
    currentUser.upgradeHistory.push({
        date: new Date().toISOString(),
        fromSkin: {
            name: fromSkin.name,
            price: fromSkin.price,
            rarity: fromSkin.rarity || 'common',
            image: fromSkin.image
        },
        toSkin: toSkin ? {
            name: toSkin.name,
            price: toSkin.price,
            rarity: toSkin.rarity || 'common',
            image: toSkin.image
        } : null,
        success: success,
        profit: success ? (toSkin.price - fromSkin.price) : -fromSkin.price
    });
    
    // Ограничиваем историю до последних 20 записей
    if (currentUser.upgradeHistory.length > 20) {
        currentUser.upgradeHistory = currentUser.upgradeHistory.slice(-20);
    }
    
    // Сохраняем обновления
    updateUserInDatabase(currentUser);
}

function closeUpgradeResult() {
    const result = document.querySelector('.upgrade-result');
    if (result) {
        result.classList.remove('show');
        setTimeout(() => {
            upgradeModal.style.display = 'none';
            result.remove();
            renderUpgradeInventory();
            resetUpgradeUI();
        }, 300);
    }
}

// Загрузка кейсов
function loadCases() {
    casesData = [
        { id: 1, name: "Обычный кейс", price: 100, image: "comonn_case.png" },
        { id: 2, name: "Редкий кейс", price: 250, image: "uncomonn_case.png" },
        { id: 3, name: "Эпический кейс", price: 500, image: "rare_case.png" },
        { id: 4, name: "Легендарный кейс", price: 1000, image: "legendari_case.png" },
        { id: 5, name: "Алигафренчик кейс", price: 10000, image: "aligafren.png" }
    ];
    
    renderCases();
}

// Отображение кейсов
function renderCases() {
    casesContainer.innerHTML = '';
    
    casesData.forEach(caseItem => {
        const caseElement = document.createElement('div');
        caseElement.className = 'case-item';
        caseElement.innerHTML = `
            <img src="${escapeHTML(caseItem.image)}" alt="${escapeHTML(caseItem.name)}">
            <h3>${escapeHTML(caseItem.name)}</h3>
            <div class="case-price">${caseItem.price} ₽</div>
        `;
        
        caseElement.addEventListener('click', () => openCase(caseItem));
        casesContainer.appendChild(caseElement);
    });
}

// Открытие кейса
function openCase(caseItem) {
    if (!currentUser) {
        alert('Пожалуйста, войдите или зарегистрируйтесь');
        showAuthModal('login');
        return;
    }
    
    if (currentUser.balance < caseItem.price) {
        alert('Недостаточно средств на балансе');
        return;
    }

    // Сохраняем выбранный кейс
    selectedCase = caseItem;
    
    // Показываем модальное окно подтверждения
    const confirmModal = document.createElement('div');
    confirmModal.className = 'modal';
    confirmModal.id = 'confirmCaseModal';
    confirmModal.style.display = 'block';
    confirmModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Открыть кейс</h2>
            <p>Вы собираетесь открыть кейс "${escapeHTML(caseItem.name)}" за ${caseItem.price} ₽</p>
            <p>Ваш баланс: ${currentUser.balance} ₽</p>
            <p>После открытия останется: ${currentUser.balance - caseItem.price} ₽</p>
            <div class="confirm-buttons">
                <button id="confirmOpenBtn" class="open-case-btn">Открыть кейс</button>
                <button id="cancelOpenBtn" class="cancel-btn">Отмена</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    
    // Функция для закрытия модального окна подтверждения
    const closeConfirmModal = () => {
        document.body.removeChild(confirmModal);
    };
    
    // Добавляем обработчики для кнопок
    document.getElementById('confirmOpenBtn').addEventListener('click', () => {
        // Списываем деньги ТОЛЬКО после подтверждения
    currentUser.balance -= caseItem.price;
    updateUserInDatabase(currentUser);
    updateBalance();
        closeConfirmModal();
        
        // Продолжаем процесс открытия кейса
        openConfirmedCase();
    });
    
    document.getElementById('cancelOpenBtn').addEventListener('click', closeConfirmModal);
    confirmModal.querySelector('.close').addEventListener('click', closeConfirmModal);
    
    // Закрытие по клику вне модального окна
    window.addEventListener('click', function(event) {
        if (event.target === confirmModal) {
            closeConfirmModal();
        }
    });
}

// Функция для продолжения процесса открытия кейса после подтверждения
function openConfirmedCase() {
    // Создаём массив предметов с вероятностями в зависимости от редкости
    const allSkins = getSkinsData();
    const possibleRewards = [];
    
    // Добавляем предметы с учетом их редкости (повторение для увеличения шанса выпадения)
    allSkins.forEach(skin => {
        let count = 1;
        switch(skin.rarity) {
            case "common": count = 15; break;
            case "uncommon": count = 8; break;
            case "rare": count = 5; break;
            case "epic": count = 2; break;
            case "legendary": count = 1; break;
            case "secret": count = 0.1; break; // Очень редкий предмет
        }
        
        // Добавляем предмет нужное количество раз
        for(let i = 0; i < count; i++) {
            possibleRewards.push(skin);
        }
    });
    
    currentReward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];

    const animationEnabled = document.getElementById('animationToggle')?.checked ?? true;

    if (animationEnabled) {
        showAnimatedCaseOpening(possibleRewards);
    } else {
        showCaseResultImmediately();
    }
}

function showAnimatedCaseOpening(possibleRewards) {
    caseReward.innerHTML = `
        <div class="case-opening-animation">
            <div class="pointer"></div>
            <div class="items-track" id="itemsTrack"></div>
        </div>
        <button id="startAnimationBtn" class="open-case-btn">Открыть кейс</button>
    `;
    
    caseModal.style.display = 'block';

    const itemsTrack = document.getElementById('itemsTrack');
    const itemsCount = 60;
    const rewardPosition = Math.floor(Math.random() * (itemsCount - 25)) + 15;

    for (let i = 0; i < itemsCount; i++) {
        const slide = document.createElement('div');
        slide.className = 'item-slide';
        
        if (i === rewardPosition) {
            slide.innerHTML = `<img src="${currentReward.image}" alt="${currentReward.name}">`;
        } else {
            const randomItem = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
            slide.innerHTML = `<img src="${randomItem.image}" alt="${randomItem.name}">`;
        }
        itemsTrack.appendChild(slide);
    }

    document.getElementById('startAnimationBtn').addEventListener('click', function() {
        this.disabled = true;
        this.textContent = 'Открываем...';
        
        const slideWidth = 150;
        const containerWidth = itemsTrack.parentElement.offsetWidth;
        const stopPosition = -(rewardPosition * slideWidth) + (containerWidth / 2) - (slideWidth / 2);
        
        let startTime = null;
        const duration = 5000;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            let easedProgress;
            if (progress < 0.8) {
                easedProgress = progress * 1.2;
            } else {
                easedProgress = 0.96 + (progress - 0.8) * 0.2;
            }
            
            if (progress < 1) {
                itemsTrack.style.transform = `translateX(${stopPosition * easedProgress}px)`;
                requestAnimationFrame(animate);
            } else {
                showCaseResultImmediately();
            }
        };
        
        requestAnimationFrame(animate);
    });
}

function showCaseResultImmediately() {
    caseReward.innerHTML = `
        <div class="case-result show-actions">
            <h3>${currentReward.name}</h3>
            <img src="${currentReward.image}" class="reward-image">
            <p>Стоимость: ${currentReward.price} ₽</p>
            <div class="case-actions">
                <button id="sellItemBtn" class="sell-btn">Продать за ${currentReward.price} ₽</button>
                <button id="keepItemBtn" class="keep-btn">Оставить</button>
            </div>
        </div>
    `;
    
    caseModal.style.display = 'block';

    document.getElementById('sellItemBtn').addEventListener('click', () => {
        currentUser.balance += currentReward.price;
        updateUserInDatabase(currentUser);
        updateBalance();
        caseModal.style.display = 'none';
    });

    document.getElementById('keepItemBtn').addEventListener('click', () => {
        if (!currentUser.inventory) currentUser.inventory = [];
        currentUser.inventory.push(currentReward);
        updateUserInDatabase(currentUser);
        caseModal.style.display = 'none';
    });
}

// Функции профиля и выхода
function showProfile() {
    if (!currentUser) return;
    
    // Синхронизируем инвентарь перед отображением
    inventoryItems = currentUser.inventory || [];
    
    profileUsername.textContent = escapeHTML(currentUser.username);
    profileBalance.textContent = currentUser.balance;
    
    // Устанавливаем обработчики для вкладок
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Удаляем класс active со всех вкладок и содержимого
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            
            // Добавляем класс active на выбранную вкладку
            this.classList.add('active');
            
            // Отображаем соответствующее содержимое
            const tabId = this.getAttribute('data-tab');
            const content = document.getElementById(tabId + 'Tab');
            content.classList.add('active');
            content.style.display = 'block';
            
            if (tabId === 'history') {
                showUpgradeHistory();
            } else if (tabId === 'inventory') {
                renderInventory();
            }
        });
    });
    
    // По умолчанию показываем инвентарь
    document.querySelector('.profile-tab[data-tab="inventory"]').classList.add('active');
    document.getElementById('inventoryTab').classList.add('active');
    document.getElementById('inventoryTab').style.display = 'block';
    document.getElementById('historyTab').style.display = 'none';
    
    renderInventory();
    profileModal.style.display = 'block';
}

// Функция для отображения истории апгрейдов
function showUpgradeHistory() {
    const historyContainer = document.getElementById('upgradeHistoryContainer');
    historyContainer.innerHTML = '';
    
    if (!currentUser.upgradeHistory || currentUser.upgradeHistory.length === 0) {
        historyContainer.innerHTML = '<div class="empty-history">История апгрейдов пуста</div>';
        return;
    }
    
    // Сортируем по дате (сначала новые)
    const sortedHistory = [...currentUser.upgradeHistory].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    sortedHistory.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = `upgrade-history-item ${entry.success ? 'success' : 'fail'}`;
        
        const date = new Date(entry.date);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        const profitClass = entry.profit > 0 ? 'positive' : 'negative';
        const profitSign = entry.profit > 0 ? '+' : '';
        
        historyItem.innerHTML = `
            <div class="history-header">
                <div class="history-date">${formattedDate}</div>
                <div class="history-result ${entry.success ? 'success' : 'fail'}">
                    ${entry.success ? 'Успешно' : 'Неудачно'}
                </div>
            </div>
            <div class="history-skins">
                <div class="history-skin ${entry.fromSkin.rarity}">
                    <img src="${escapeHTML(entry.fromSkin.image)}" alt="${escapeHTML(entry.fromSkin.name)}">
                    <div class="history-skin-name">${escapeHTML(entry.fromSkin.name)}</div>
                    <div class="history-skin-price">${entry.fromSkin.price} ₽</div>
                </div>
                <div class="history-arrow">→</div>
                ${entry.success ? `
                <div class="history-skin ${entry.toSkin.rarity}">
                    <img src="${escapeHTML(entry.toSkin.image)}" alt="${escapeHTML(entry.toSkin.name)}">
                    <div class="history-skin-name">${escapeHTML(entry.toSkin.name)}</div>
                    <div class="history-skin-price">${entry.toSkin.price} ₽</div>
                </div>
                ` : '<div class="history-lost">Потеряно</div>'}
            </div>
            <div class="history-profit ${profitClass}">${profitSign}${entry.profit} ₽</div>
        `;
        
        historyContainer.appendChild(historyItem);
    });
}

function logoutUser() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    inventoryItems = [];
    updateUIForGuest();
    caseModal.style.display = 'none';
    profileModal.style.display = 'none';
}

// Остальные функции
function updateBalance() {
    balanceElement.textContent = currentUser ? currentUser.balance : '0';
}

function updateUIForGuest() {
    loginBtn.style.display = 'block';
    registerBtn.style.display = 'block';
    profileBtn.style.display = 'none';
    logoutBtn.style.display = 'none';
    upgradeBtn.style.display = 'none';
    adminBtn.style.display = 'none';
    syncBtn.style.display = 'none';
    balanceElement.textContent = '0';
    bonusSection.style.display = 'none';
}

function updateUIForAuth() {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    profileBtn.style.display = 'block';
    logoutBtn.style.display = 'block';
    upgradeBtn.style.display = 'block';
    syncBtn.style.display = 'block';
    
    // Показываем кнопку админ-панели только для админов
    // Можно использовать фиксированное имя пользователя для админа или добавить поле isAdmin
    if (currentUser.username === 'admin' || currentUser.isAdmin) {
        adminBtn.style.display = 'block';
    } else {
        adminBtn.style.display = 'none';
    }
    
    balanceElement.textContent = currentUser.balance;
    bonusSection.style.display = 'block';
    setupBonusTimer();
}

function getUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function updateUserInDatabase(user) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
        users[index] = user;
        saveUsers(users);
    }
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Убедимся, что инвентарь всегда существует и синхронизирован
        if (!currentUser.inventory) {
            currentUser.inventory = [];
        }
        
        // Синхронизируем с актуальными данными пользователя
        const users = getUsers();
        const actualUserData = users.find(u => u.id === currentUser.id);
        
        if (actualUserData) {
            // Используем актуальные данные из базы
            currentUser = actualUserData;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        inventoryItems = currentUser.inventory;
        updateUIForAuth();
    } else {
        updateUIForGuest();
    }
}

function renderInventory() {
    inventoryContainer.innerHTML = '';
    
    if (!inventoryItems || inventoryItems.length === 0) {
        inventoryContainer.innerHTML = '<p class="empty-inventory">Ваш инвентарь пуст</p>';
        return;
    }

    const startIndex = (currentInventoryPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, inventoryItems.length);
    const currentItems = inventoryItems.slice(startIndex, endIndex);

    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'inventory-grid';
    inventoryContainer.appendChild(itemsGrid);

    currentItems.forEach((item, index) => {
        const absoluteIndex = startIndex + index;
        const itemElement = document.createElement('div');
        itemElement.className = `inventory-item ${item.rarity || 'common'}`;
        itemElement.innerHTML = `
            <div class="item-rarity">${getRarityLabel(item.rarity || 'common')}</div>
            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy">
            <h4>${escapeHTML(item.name)}</h4>
            <div class="item-price">${item.price} ₽</div>
            <button class="sell-btn" data-index="${absoluteIndex}">Продать</button>
        `;
        itemsGrid.appendChild(itemElement);
    });

    // Пагинация
    if (inventoryItems.length > ITEMS_PER_PAGE) {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'inventory-pagination';

        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '&larr;';
        prevBtn.disabled = currentInventoryPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentInventoryPage > 1) {
                currentInventoryPage--;
                renderInventory();
            }
        });

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `${currentInventoryPage} из ${Math.ceil(inventoryItems.length / ITEMS_PER_PAGE)}`;

        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '&rarr;';
        nextBtn.disabled = currentInventoryPage === Math.ceil(inventoryItems.length / ITEMS_PER_PAGE);
        nextBtn.addEventListener('click', () => {
            if (currentInventoryPage < Math.ceil(inventoryItems.length / ITEMS_PER_PAGE)) {
                currentInventoryPage++;
                renderInventory();
            }
        });

        paginationDiv.appendChild(prevBtn);
        paginationDiv.appendChild(pageInfo);
        paginationDiv.appendChild(nextBtn);
        inventoryContainer.appendChild(paginationDiv);
    }

    // Обработчики для кнопок продажи
    document.querySelectorAll('.sell-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            sellInventoryItem(index);
        });
    });
}

// Функция для получения текстовой метки редкости
function getRarityLabel(rarity) {
    switch(rarity) {
        case 'common': return 'Обычный';
        case 'uncommon': return 'Необычный';
        case 'rare': return 'Редкий';
        case 'epic': return 'Эпический';
        case 'legendary': return 'Легендарный';
        case 'secret': return 'Секретный';
        default: return 'Обычный';
    }
}

function sellInventoryItem(index) {
    if (!currentUser || index < 0 || index >= inventoryItems.length) return;
    
    const item = inventoryItems[index];
    currentUser.balance += item.price;
    inventoryItems.splice(index, 1);
    currentUser.inventory = inventoryItems;
    
    updateUserInDatabase(currentUser);
    updateBalance();
    renderInventory();
}

// Настройка обработчиков событий
function setupEventListeners() {
    loginBtn.addEventListener('click', () => showAuthModal('login'));
    registerBtn.addEventListener('click', () => showAuthModal('register'));
    profileBtn.addEventListener('click', showProfile);
    logoutBtn.addEventListener('click', logoutUser);
    upgradeBtn.addEventListener('click', showUpgradeModal);
    startUpgradeBtn.addEventListener('click', startUpgrade);
    adminBtn.addEventListener('click', showAdminPanel);
    syncBtn.addEventListener('click', syncUserData);
    
    // Добавляем обработчик для переключения между режимами авторизации
    switchAuthMode.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            modalTitle.textContent = 'Вход';
            submitAuthBtn.textContent = 'Войти';
            switchAuthMode.textContent = 'Нет аккаунта? Зарегистрироваться';
            document.getElementById('email').style.display = 'none';
        } else {
            modalTitle.textContent = 'Регистрация';
            submitAuthBtn.textContent = 'Зарегистрироваться';
            switchAuthMode.textContent = 'Уже есть аккаунт? Войти';
            document.getElementById('email').style.display = 'block';
        }
    });
    
    // Добавляем keyboard events для доступности
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Закрываем все открытые модальные окна при нажатии Escape
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    closeModal(modal);
                }
            });
        }
    });
    
    // Обработчики для модальных окон
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Удаляем дублирование обработчика для переключения режима авторизации, 
    // так как он уже добавлен выше

    // Функция для хеширования паролей
    function hashPassword(password) {
        // Простое хеширование с использованием djb2
        let hash = 5381;
        for (let i = 0; i < password.length; i++) {
            hash = ((hash << 5) + hash) + password.charCodeAt(i);
        }
        return hash.toString(16);
    }

    // Обработчик формы авторизации
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const hashedPassword = hashPassword(password);
        
        if (isLoginMode) {
            // Логин
            const users = getUsers();
            const user = users.find(u => u.username === username);
            
            if (user) {
                // Проверяем как хешированный пароль, так и обычный (для обратной совместимости)
                if (user.hashedPassword === hashedPassword || user.password === password) {
                    // Обновляем пароль на хешированный, если он был в обычном виде
                    if (!user.hashedPassword) {
                        user.hashedPassword = hashedPassword;
                        delete user.password;
                        updateUserInDatabase(user);
                    }
                    
                currentUser = user;
                inventoryItems = user.inventory || [];
                localStorage.setItem('currentUser', JSON.stringify(user));
                updateUIForAuth();
                authModal.style.display = 'none';
            } else {
                    alert('Неверный пароль');
                }
            } else {
                alert('Пользователь не найден');
            }
        } else {
            // Регистрация
            const email = document.getElementById('email').value.trim();
            
            // Проверяем, не занято ли имя пользователя
            const users = getUsers();
            if (users.some(u => u.username === username)) {
                alert('Имя пользователя уже занято');
                return;
            }
            
            const newUser = {
                id: Date.now().toString(),
                username,
                email,
                hashedPassword,
                balance: 300,
                inventory: []
            };
            
            users.push(newUser);
            saveUsers(users);
            
            currentUser = newUser;
            inventoryItems = [];
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            updateUIForAuth();
            authModal.style.display = 'none';
        }
    });
    
    // Обработчик для бонуса
    claimBonusBtn.addEventListener('click', claimBonus);

    // Добавляем обработчик для закрытия модального окна
    document.querySelector('#upgradeModal .close').addEventListener('click', closeUpgradeModal);
    
    // Закрытие по клику вне модального окна
    upgradeModal.addEventListener('click', (e) => {
        if (e.target === upgradeModal) {
            closeUpgradeModal();
        }
    });
}

function closeModal(modal) {
    modal.style.display = 'none';
    
    // Специальная обработка для апгрейда
    if (modal.id === 'upgradeModal') {
        // Останавливаем анимацию, если она идет
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Удаляем результат апгрейда, если есть
        const result = document.querySelector('.upgrade-result');
        if (result) result.remove();
        
        // Сбрасываем состояние
        resetUpgradeUI();
    }
}

function showAuthModal(mode) {
    isLoginMode = mode === 'login';
    modalTitle.textContent = isLoginMode ? 'Вход' : 'Регистрация';
    submitAuthBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
    switchAuthMode.textContent = isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    
    // Скрываем поле email при входе
    const emailField = document.getElementById('email');
    emailField.style.display = isLoginMode ? 'none' : 'block';
    
    authModal.style.display = 'block';
}

// Функция получения бонуса
function claimBonus() {
    if (!currentUser) {
        alert('Пожалуйста, войдите или зарегистрируйтесь');
        showAuthModal('login');
        return;
    }
    
    currentUser.balance += 500;
    updateUserInDatabase(currentUser);
    updateBalance();
    
    claimBonusBtn.disabled = true;
    bonusTimeLeft = 1800; // 30 минут
    localStorage.setItem('bonusTimeLeft', bonusTimeLeft);
    localStorage.setItem('lastBonusTime', Date.now());
    
    alert('Вы получили бонус 500 ₽!');
}

// Настройка таймера для бонуса
function setupBonusTimer() {
    // Очищаем предыдущий таймер, если он был
    if (bonusTimer) {
        clearInterval(bonusTimer);
    }
    
    // Проверяем, авторизован ли пользователь
    if (currentUser) {
        bonusSection.style.display = 'block';
        
        // Получаем сохраненное время или устанавливаем новое
        const savedTimeLeft = localStorage.getItem('bonusTimeLeft');
        const lastBonusTime = localStorage.getItem('lastBonusTime');
        
        if (savedTimeLeft && lastBonusTime) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(lastBonusTime)) / 1000);
            bonusTimeLeft = Math.max(0, parseInt(savedTimeLeft) - elapsedSeconds);
        }
        
        // Обновляем отображение таймера сразу
        updateBonusTimer();
        
        // Запоминаем время последнего обновления
        let lastUpdateTime = Date.now();
        
        // Устанавливаем новый интервал обновления каждую секунду
        bonusTimer = setInterval(function() {
            // Проверяем, что мы не обновляем счетчик слишком часто
            const now = Date.now();
            if (now - lastUpdateTime >= 1000) {
                updateBonusTimer();
                lastUpdateTime = now;
            }
        }, 1000);
    } else {
        bonusSection.style.display = 'none';
    }
}

// Обновление таймера бонуса
function updateBonusTimer() {
    if (bonusTimeLeft <= 0) {
        // Если таймер истек, останавливаем его
        if (bonusTimer) {
            clearInterval(bonusTimer);
            bonusTimer = null;
        }
        
        claimBonusBtn.disabled = false;
        bonusTimerElement.textContent = 'Доступен!';
        return;
    }
    
    // Уменьшаем значение таймера на 1 секунду
    bonusTimeLeft -= 1;
    
    // Сохраняем текущее значение и время обновления
    localStorage.setItem('bonusTimeLeft', bonusTimeLeft);
    localStorage.setItem('lastBonusTime', Date.now());
    
    // Обновляем отображение
    const minutes = Math.floor(bonusTimeLeft / 60);
    const seconds = bonusTimeLeft % 60;
    bonusTimerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// Функции для системы аккаунтов
function createAdminPanel() {
    const adminPanelHTML = `
        <div class="modal" id="adminModal">
            <div class="modal-content admin-panel">
                <span class="close">&times;</span>
                <h2>Панель администратора</h2>
                <div class="admin-tabs">
                    <button class="tab-btn active" data-tab="users">Пользователи</button>
                    <button class="tab-btn" data-tab="stats">Статистика</button>
                </div>
                <div class="tab-content" id="usersTab">
                    <div class="search-user">
                        <input type="text" id="userSearch" placeholder="Поиск по имени пользователя...">
                    </div>
                    <div class="users-list" id="usersList"></div>
                </div>
                <div class="tab-content" id="statsTab" style="display: none;">
                    <div class="stats-container">
                        <div class="stat-item">
                            <h3>Всего пользователей</h3>
                            <div class="stat-value" id="totalUsers">0</div>
                        </div>
                        <div class="stat-item">
                            <h3>Всего транзакций</h3>
                            <div class="stat-value" id="totalTransactions">0</div>
                        </div>
                        <div class="stat-item">
                            <h3>Общий оборот</h3>
                            <div class="stat-value" id="totalRevenue">0 ₽</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Создаем и добавляем элемент в DOM
    const adminPanelContainer = document.createElement('div');
    adminPanelContainer.innerHTML = adminPanelHTML;
    document.body.appendChild(adminPanelContainer.firstElementChild);
    
    // Добавляем стили для админ-панели
    const adminStyle = document.createElement('style');
    adminStyle.textContent = `
        .admin-panel {
            max-width: 900px;
            width: 90%;
        }
        .admin-tabs {
            display: flex;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .tab-btn {
            background: transparent;
            border: none;
            color: white;
            padding: 10px 20px;
            cursor: pointer;
            opacity: 0.7;
            transition: all 0.3s ease;
        }
        .tab-btn.active {
            opacity: 1;
            border-bottom: 2px solid #4a00e0;
        }
        .search-user {
            margin-bottom: 20px;
        }
        #userSearch {
            width: 100%;
            padding: 10px;
            border-radius: 5px;
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
        }
        .users-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .user-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: rgba(0,0,0,0.2);
            margin-bottom: 10px;
            border-radius: 5px;
        }
        .user-info {
            flex: 1;
        }
        .user-actions {
            display: flex;
            gap: 10px;
        }
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .stat-item {
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #4a00e0;
            margin-top: 10px;
        }
    `;
    document.head.appendChild(adminStyle);
    
    // Получаем элементы
    const adminModal = document.getElementById('adminModal');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const userSearch = document.getElementById('userSearch');
    const usersList = document.getElementById('usersList');
    const closeBtn = adminModal.querySelector('.close');
    
    // Обработчики для табов
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Убираем активный класс со всех кнопок
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Скрываем все табы
            tabContents.forEach(tab => tab.style.display = 'none');
            
            // Показываем выбранный таб
            const tabId = button.getAttribute('data-tab') + 'Tab';
            document.getElementById(tabId).style.display = 'block';
            
            // Если выбрана вкладка статистики, обновляем ее
            if (tabId === 'statsTab') {
                updateAdminStats();
            }
        });
    });
    
    // Обработчик для поиска пользователей
    userSearch.addEventListener('input', () => {
        const searchTerm = userSearch.value.toLowerCase();
        renderUsersList(searchTerm);
    });
    
    // Обработчик для закрытия модального окна
    closeBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });
    
    // Обработчик для закрытия по клику вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });
}

// Функция для отображения списка пользователей
function renderUsersList(searchTerm = '') {
    const usersList = document.getElementById('usersList');
    const users = getUsers();
    
    let filteredUsers = users;
    if (searchTerm) {
        filteredUsers = users.filter(user => 
            user.username.toLowerCase().includes(searchTerm) || 
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
    }
    
    usersList.innerHTML = filteredUsers.map(user => `
        <div class="user-item" data-id="${escapeHTML(user.id)}">
            <div class="user-info">
                <div><strong>${escapeHTML(user.username)}</strong> (ID: ${escapeHTML(user.id)})</div>
                <div>Email: ${escapeHTML(user.email || 'Не указан')}</div>
                <div>Баланс: ${user.balance} ₽</div>
                <div>Предметов: ${user.inventory ? user.inventory.length : 0}</div>
            </div>
            <div class="user-actions">
                <button class="edit-user-btn" onclick="editUser('${escapeHTML(user.id)}')">Изменить</button>
                <button class="delete-user-btn" onclick="deleteUser('${escapeHTML(user.id)}')">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Функция для обновления статистики админ-панели
function updateAdminStats() {
    const users = getUsers();
    document.getElementById('totalUsers').textContent = users.length;
    
    // Здесь можно добавить другие статистические данные
    let totalRevenue = 0;
    let transactions = 0;
    
    // Просто для примера расчета
    users.forEach(user => {
        totalRevenue += user.balance;
        transactions += user.inventory ? user.inventory.length : 0;
    });
    
    document.getElementById('totalTransactions').textContent = transactions;
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString() + ' ₽';
}

// Функция для редактирования пользователя
function editUser(userId) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        alert('Пользователь не найден');
        return;
    }
    
    const newBalance = prompt(`Введите новый баланс для пользователя ${user.username}:`, user.balance);
    if (newBalance === null) return;
    
    user.balance = parseInt(newBalance) || user.balance;
    updateUserInDatabase(user);
    
    // Если это текущий пользователь, обновляем и его данные
    if (currentUser && currentUser.id === userId) {
        currentUser.balance = user.balance;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateBalance();
    }
    
    renderUsersList();
    alert(`Баланс пользователя ${user.username} обновлен до ${user.balance} ₽`);
}

// Функция для удаления пользователя
function deleteUser(userId) {
    if (!confirm('Вы действительно хотите удалить этого пользователя?')) return;
    
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
        alert('Пользователь не найден');
        return;
    }
    
    const deletedUser = users[userIndex];
    users.splice(userIndex, 1);
    saveUsers(users);
    
    // Если удален текущий пользователь, выходим
    if (currentUser && currentUser.id === userId) {
        logoutUser();
    }
    
    renderUsersList();
    alert(`Пользователь ${deletedUser.username} удален`);
}

// Функция для показа админ-панели
function showAdminPanel() {
    if (!document.getElementById('adminModal')) {
        createAdminPanel();
    }
    
    renderUsersList();
    updateAdminStats();
    document.getElementById('adminModal').style.display = 'block';
}

// Функция для экранирования HTML символов, защита от XSS
function escapeHTML(string) {
    if (!string) return '';
    return string
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Функция для синхронизации данных с сервера
function syncUserData() {
    // В настоящей реализации здесь был бы запрос к серверу
    // Но поскольку у нас локальное хранилище, эта функция является заглушкой
    alert('В текущей реализации данные хранятся локально в браузере. Чтобы получить доступ к аккаунту с другого устройства, вам нужно войти в него заново на каждом устройстве.');
    
    // Пояснение для пользователя
    if (confirm('Хотите узнать, как обеспечить доступ к одному аккаунту с разных устройств?')) {
        alert('Для доступа к аккаунту с разных устройств требуется:\n\n1. Серверная часть (бэкенд)\n2. База данных для хранения пользователей\n3. Система аутентификации с токенами\n\nПри текущей реализации на GitHub Pages эти данные хранятся в localStorage вашего браузера и доступны только на этом устройстве.');
    }
}

// Добавляем функцию закрытия модального окна
function closeUpgradeModal() {
    upgradeModal.style.display = 'none';
    document.body.style.overflow = ''; // Возвращаем прокрутку
    resetUpgradeUI();
}


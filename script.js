let currentOrder = [];
let currentCategory = 'all';
let lastReceipt = null;

// Keyboard shortcuts
const keyboardShortcuts = {
    'ctrl+s': () => checkout(),
    'escape': () => clearOrder()
};

// เริ่มต้น
document.addEventListener('DOMContentLoaded', function() {
    // ตรวจสอบ login
    if (!currentUser) {
        document.getElementById('loginModal').style.display = 'flex';
    } else {
        initSystem();
    }
    
    // Load dark mode
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }
});

function initSystem() {
    displayMenu();
    displayFavorites();
    displayTrending();
    setupEventListeners();
    setupOrderTypeListener();
    loadSalesHistory();
    updateUserDisplay();
    
    // Load shop settings and update navbar
    if (shopSettings?.shopName) {
        document.querySelector('h1').textContent = '🍽️ ' + shopSettings.shopName;
    }
}

function setupEventListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            displayMenu();
        });
    });

    // Discount input
    document.getElementById('discountPercent').addEventListener('change', updateOrderSummary);
    document.getElementById('extraDiscount').addEventListener('change', updateOrderSummary);

    // Payment amount input
    if (document.getElementById('paymentAmount')) {
        document.getElementById('paymentAmount').addEventListener('input', calculateChange);
    }

    // Barcode input
    document.getElementById('barcodeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            processBarcodeInput(this.value);
            this.value = '';
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.id === 'checkoutModal') {
            closeCheckout();
        }
        if (event.target.id === 'historyModal') {
            closeHistory();
        }
        if (event.target.id === 'reportsModal') {
            closeReports();
        }
        if (event.target.id === 'drawerModal') {
            closeDrawerManagement();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            checkout();
        }
        if (e.key === 'Escape') {
            // Close any open modal
            closeCheckout();
            closeHistory();
            closeReports();
            closeDrawerManagement();
        }
    });
}

function processBarcodeInput(barcode) {
    const item = menuItems.find(m => m.barcode === barcode);
    if (item) {
        addToOrder(item);
    } else {
        alert('ไม่พบสินค้า: ' + barcode);
    }
}

function displayMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    const filteredMenu = currentCategory === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === currentCategory);

    filteredMenu.forEach(item => {
        const menuItemEl = document.createElement('div');
        menuItemEl.className = 'menu-item';
        menuItemEl.onclick = () => addToOrder(item);
        
        menuItemEl.innerHTML = `
            <div class="menu-item-image">${item.emoji}</div>
            <div class="menu-item-name">${item.name}</div>
            <div class="menu-item-category">${getCategoryName(item.category)}</div>
            <div class="menu-item-price">${item.price} บาท</div>
        `;
        
        menuGrid.appendChild(menuItemEl);
    });
}

function getCategoryName(category) {
    const names = {
        'rice': 'ข้าว',
        'noodles': 'เส้น',
        'drinks': 'เครื่องดื่ม',
        'dessert': 'ของหวาน'
    };
    return names[category] || category;
}

function addToOrder(item) {
    const existing = currentOrder.find(o => o.id === item.id);
    
    if (existing) {
        existing.quantity++;
    } else {
        currentOrder.push({
            ...item,
            quantity: 1
        });
    }
    
    updateOrderDisplay();
    updateOrderSummary();
}

function removeFromOrder(itemId) {
    currentOrder = currentOrder.filter(item => item.id !== itemId);
    updateOrderDisplay();
    updateOrderSummary();
}

function updateQuantity(itemId, change) {
    const item = currentOrder.find(o => o.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromOrder(itemId);
        } else {
            updateOrderDisplay();
            updateOrderSummary();
        }
    }
}

function updateOrderDisplay() {
    const orderList = document.getElementById('orderList');
    
    if (currentOrder.length === 0) {
        orderList.innerHTML = '<p class="empty-message">ยังไม่มีสินค้า</p>';
        return;
    }
    
    orderList.innerHTML = currentOrder.map(item => `
        <div class="order-item">
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-detail">${item.price} บาท × ${item.quantity}</div>
            </div>
            <div class="order-item-controls">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                <div class="qty-display">${item.quantity}</div>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromOrder(${item.id})">×</button>
            </div>
        </div>
    `).join('');
}

function updateOrderSummary() {
    const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const extraDiscount = parseFloat(document.getElementById('extraDiscount').value) || 0;
    const discount = (subtotal * discountPercent) / 100 + extraDiscount;
    
    // ใช้ promo code
    const promoCode = document.getElementById('promoCode').value;
    let promoDiscount = 0;
    if (promoCode) {
        const promo = promotions.find(p => p.code === promoCode);
        if (promo) {
            promoDiscount = (subtotal * promo.discount) / 100;
        }
    }
    
    const afterDiscount = subtotal - discount - promoDiscount;
    const tax = (afterDiscount * taxRate) / 100;
    const service = (afterDiscount * serviceCharge) / 100;
    const netAmount = afterDiscount + tax + service;
    
    document.getElementById('totalAmount').textContent = subtotal.toFixed(2);
    document.getElementById('netAmount').textContent = netAmount.toFixed(2);
    document.getElementById('modalTotal').textContent = netAmount.toFixed(2);
    
    // อัปเดต checkout modal ด้วย
    if (document.getElementById('subtotalAmount')) {
        updateTaxAndService();
    }
}

function checkout() {
    if (currentOrder.length === 0) {
        alert('กรุณาเลือกสินค้าก่อน');
        return;
    }
    
    document.getElementById('checkoutModal').style.display = 'block';
    document.getElementById('paymentAmount').value = '';
    calculateChange();
}

function closeCheckout() {
    document.getElementById('checkoutModal').style.display = 'none';
}

function calculateChange() {
    const netAmount = parseFloat(document.getElementById('netAmount').textContent);
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const change = paymentAmount - netAmount;
    
    const changeEl = document.getElementById('changeAmount');
    if (paymentAmount > 0) {
        if (change >= 0) {
            changeEl.textContent = `คืนเงิน: ${change.toFixed(2)} บาท`;
            changeEl.style.color = '#51cf66';
        } else {
            changeEl.textContent = `ยังขาด: ${Math.abs(change).toFixed(2)} บาท`;
            changeEl.style.color = '#ff6b6b';
        }
    } else {
        changeEl.textContent = '';
    }
}

function completePayment() {
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const netAmount = parseFloat(document.getElementById('netAmount').textContent);
    
    if (!paymentAmount || paymentAmount < netAmount) {
        alert('จำนวนเงินไม่เพียงพอ');
        return;
    }
    
    // สร้างใบเสร็จ
    lastReceipt = generateReceipt();
    
    // บันทึกประวัติ
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const afterDiscount = subtotal - (subtotal * discountPercent) / 100 - (parseFloat(document.getElementById('extraDiscount').value) || 0);
    const taxAndService = (afterDiscount * (taxRate + serviceCharge)) / 100;
    const netAmount2 = afterDiscount + taxAndService;
    
    const sale = {
        timestamp: new Date().toLocaleString('th-TH'),
        items: currentOrder.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
        subtotal: subtotal,
        discount: subtotal - afterDiscount,
        netAmount: netAmount2,
        payment: paymentAmount,
        change: paymentAmount - netAmount2,
        table: document.getElementById('tableNumber').value,
        notes: document.getElementById('orderNotes').value,
        orderType: document.getElementById('orderType')?.value || 'dine-in',
        deliveryAddress: currentOrder.deliveryAddress || ''
    };
    
    salesHistory.push(sale);
    localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    
    // บันทึกประวัติลูกค้า
    recordCustomerPurchase();
    
    // อัปเดตเป้าหมายขาย
    updateGoalDisplay();
    
    // แสดงใบเสร็จ
    alert(lastReceipt);
    
    // รีเซ็ตระบบ
    clearOrder();
    closeCheckout();
}

function generateReceipt() {
    const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discount = (subtotal * discountPercent) / 100;
    const netAmount = subtotal - discount;
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    const change = paymentAmount - netAmount;
    const notes = document.getElementById('orderNotes').value;
    
    let receipt = '========== ใบเสร็จ ==========\n';
    receipt += `โต๊ะที่: ${document.getElementById('tableNumber').value}\n`;
    receipt += `เวลา: ${new Date().toLocaleTimeString('th-TH')}\n\n`;
    
    currentOrder.forEach(item => {
        const total = item.price * item.quantity;
        receipt += `${item.name}\n`;
        receipt += `  ${item.quantity} × ${item.price} = ${total} บาท\n`;
    });
    
    receipt += '\n============================\n';
    receipt += `ยอดรวม: ${subtotal.toFixed(2)} บาท\n`;
    
    if (discountPercent > 0) {
        receipt += `ส่วนลด ${discountPercent}%: -${discount.toFixed(2)} บาท\n`;
    }
    
    receipt += `รวมสุทธิ: ${netAmount.toFixed(2)} บาท\n`;
    receipt += `เงินรับ: ${paymentAmount.toFixed(2)} บาท\n`;
    receipt += `เงินทอน: ${change.toFixed(2)} บาท\n`;
    
    if (notes) {
        receipt += `\nหมายเหตุ: ${notes}\n`;
    }
    
    receipt += '============================\n';
    receipt += 'ขอบคุณที่มาใช้บริการ';
    
    return receipt;
}

function printReceipt() {
    if (!lastReceipt) {
        alert('ไม่มีใบเสร็จให้พิมพ์');
        return;
    }
    
    const printWindow = window.open('', '', 'width=500,height=600');
    if (!printWindow) {
        alert('โปรแกรมบล็อกการเปิด popup window');
        return;
    }
    
    let html = '<html><head><meta charset="UTF-8"><title>ใบเสร็จ</title></head><body>';
    html += '<style>body { font-family: "Courier New", monospace; padding: 10px; line-height: 1.6; }</style>';
    html += '<pre>' + lastReceipt + '</pre>';
    html += '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

function clearOrder() {
    currentOrder = [];
    document.getElementById('discountPercent').value = '0';
    document.getElementById('orderNotes').value = '';
    updateOrderDisplay();
    updateOrderSummary();
}

// ฟีเจอร์สินค้าโปรด
function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    favoritesList.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p style="color: #999; font-size: 12px;">ยังไม่มีสินค้าโปรด</p>';
        return;
    }
    
    favorites.forEach(itemId => {
        const item = menuItems.find(m => m.id === itemId);
        if (item) {
            const btn = document.createElement('button');
            btn.className = 'favorite-item';
            btn.innerHTML = `${item.emoji} ${item.name}`;
            btn.onclick = () => addToOrder(item);
            favoritesList.appendChild(btn);
        }
    });
}

function toggleFavorite() {
    if (currentOrder.length === 0) {
        alert('กรุณาเลือกสินค้าก่อน');
        return;
    }
    
    const lastItem = currentOrder[currentOrder.length - 1];
    const index = favorites.indexOf(lastItem.id);
    
    if (index > -1) {
        favorites.splice(index, 1);
        alert(`ลบ ${lastItem.name} จากสินค้าโปรด`);
    } else {
        favorites.push(lastItem.id);
        alert(`เพิ่ม ${lastItem.name} เป็นสินค้าโปรด`);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    displayFavorites();
}

// ฟีเจอร์ประวัติและรายงาน
function openHistory() {
    document.getElementById('historyModal').style.display = 'block';
    loadHistoryView();
}

function closeHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

function loadHistoryView() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (salesHistory.length === 0) {
        historyList.innerHTML = '<p class="empty-message">ไม่มีประวัติการขาย</p>';
        return;
    }
    
    salesHistory.slice().reverse().forEach((sale, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        let itemsText = sale.items.map(i => `${i.name} (${i.qty})`).join(', ');
        div.innerHTML = `
            <div class="history-time">${sale.timestamp}</div>
            <div class="history-details">
                โต๊ะ: ${sale.table} | รวม: ${sale.netAmount.toFixed(2)} บาท<br>
                ${itemsText}
            </div>
        `;
        historyList.appendChild(div);
    });
}

function openReports() {
    document.getElementById('reportsModal').style.display = 'block';
    loadReports();
}

function closeReports() {
    document.getElementById('reportsModal').style.display = 'none';
}

function loadReports() {
    if (salesHistory.length === 0) {
        document.getElementById('reportTotal').textContent = '0.00';
        document.getElementById('reportOrders').textContent = '0';
        document.getElementById('reportDiscount').textContent = '0.00';
        document.getElementById('reportDetails').innerHTML = '<p class="empty-message">ไม่มีข้อมูล</p>';
        return;
    }
    
    const totalSales = salesHistory.reduce((sum, s) => sum + s.netAmount, 0);
    const totalDiscount = salesHistory.reduce((sum, s) => sum + s.discount, 0);
    
    document.getElementById('reportTotal').textContent = totalSales.toFixed(2);
    document.getElementById('reportOrders').textContent = salesHistory.length;
    document.getElementById('reportDiscount').textContent = totalDiscount.toFixed(2);
    
    // รายละเอียดเมนู
    const itemCount = {};
    const itemRevenue = {};
    
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            if (!itemCount[item.name]) {
                itemCount[item.name] = 0;
                itemRevenue[item.name] = 0;
            }
            itemCount[item.name] += item.qty;
            itemRevenue[item.name] += item.qty * item.price;
        });
    });
    
    const reportDetails = document.getElementById('reportDetails');
    reportDetails.innerHTML = '';
    
    Object.keys(itemCount).sort((a, b) => itemCount[b] - itemCount[a]).forEach(itemName => {
        const div = document.createElement('div');
        div.className = 'report-item-row';
        div.innerHTML = `
            <span>${itemName}</span>
            <span>${itemCount[itemName]} ชิ้น - ${itemRevenue[itemName].toFixed(2)} บาท</span>
        `;
        reportDetails.appendChild(div);
    });
}

function printReport() {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
        alert('โปรแกรมบล็อกการเปิด popup window');
        return;
    }
    
    let html = '<html><head><meta charset="UTF-8"><title>รายงานประจำวัน</title></head><body>';
    html += '<style>body { font-family: Arial, sans-serif; padding: 20px; }</style>';
    html += '<h2>รายงานประจำวัน</h2>';
    html += `<p>ยอดขายรวม: <strong>${document.getElementById('reportTotal').textContent}</strong> บาท</p>`;
    html += `<p>จำนวนออเดอร์: <strong>${document.getElementById('reportOrders').textContent}</strong></p>`;
    html += `<p>ส่วนลดรวม: <strong>${document.getElementById('reportDiscount').textContent}</strong> บาท</p>`;
    html += '<h3>รายละเอียดเมนู</h3>';
    html += '<pre style="white-space: pre-wrap;">' + document.getElementById('reportDetails').innerText + '</pre>';
    html += '</body></html>';
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

function loadSalesHistory() {
    if (typeof(Storage) !== 'undefined') {
        try {
            const saved = localStorage.getItem('salesHistory');
            if (saved) {
                salesHistory = JSON.parse(saved);
            }
        } catch(e) {
            console.warn('Error loading sales history:', e);
        }
    }
}

function openDrawerManagement() {
    document.getElementById('drawerModal').style.display = 'block';
}

function closeDrawerManagement() {
    document.getElementById('drawerModal').style.display = 'none';
}

function calculateDrawer() {
    const openingAmount = parseFloat(document.getElementById('openingAmount').value) || 0;
    const currentSales = salesHistory.reduce((sum, s) => sum + s.netAmount, 0);
    const expectedAmount = openingAmount + currentSales;
    
    document.getElementById('expectedAmount').textContent = expectedAmount.toFixed(2);
    
    const closingAmount = parseFloat(document.getElementById('closingAmount').value) || 0;
    document.getElementById('actualAmount').textContent = closingAmount.toFixed(2);
    
    const difference = closingAmount - expectedAmount;
    const diffEl = document.getElementById('differenceAmount');
    diffEl.textContent = Math.abs(difference).toFixed(2);
    diffEl.style.color = difference >= 0 ? '#51cf66' : '#ff6b6b';
}

// Quick pay function
function quickPay(amount) {
    document.getElementById('paymentAmount').value = amount;
    calculateChange();
}

function toggleBarcodeCamera() {
    const cameraDiv = document.getElementById('barcodeCamera');
    const video = document.getElementById('barcodeVideo');
    
    if (cameraDiv.style.display === 'none') {
        cameraDiv.style.display = 'flex';
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(err => alert('ไม่สามารถเปิดกล้องได้: ' + err));
    } else {
        cameraDiv.style.display = 'none';
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// ========== ฟีเจอร์ใหม่ ==========

// 1. ระบบ Login
function loginUser() {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const role = document.getElementById('loginRole').value;
    
    const user = users.find(u => u.username === username && u.password === password && u.role === role);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        document.getElementById('loginModal').style.display = 'none';
        initSystem();
    } else {
        alert('ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    location.reload();
}

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('userDisplay').textContent = `👤 ${currentUser.username} (${currentUser.role === 'admin' ? 'เจ้าของ' : 'พนักงาน'})`;
    }
}

// 2. Dark Mode
function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode');
}

// 3. Trending Menu
function displayTrending() {
    const trendingList = document.getElementById('trendingList');
    if (!trendingList) return;
    
    trendingList.innerHTML = '';
    const sorted = [...menuItems].sort((a, b) => b.trending - a.trending).slice(0, 5);
    
    sorted.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'trending-item';
        btn.innerHTML = `${item.emoji} ${item.name} (${item.trending}🔥)`;
        btn.onclick = () => addToOrder(item);
        trendingList.appendChild(btn);
    });
}

// 4. โปรโมชัน
function openPromotion() {
    document.getElementById('promotionModal').style.display = 'block';
    loadPromotionList();
}

function closePromotion() {
    document.getElementById('promotionModal').style.display = 'none';
}

function addPromotion() {
    const name = document.getElementById('promoName').value;
    const code = document.getElementById('promoCodeInput').value;
    const discount = parseFloat(document.getElementById('promoDiscount').value);
    const date = document.getElementById('promoDate').value;
    
    if (!name || !code || !discount) {
        alert('กรุณากรอกข้อมูลให้ครบ');
        return;
    }
    
    promotions.push({ name, code, discount, date });
    localStorage.setItem('promotions', JSON.stringify(promotions));
    
    document.getElementById('promoName').value = '';
    document.getElementById('promoCodeInput').value = '';
    document.getElementById('promoDiscount').value = '';
    document.getElementById('promoDate').value = '';
    
    loadPromotionList();
    alert('เพิ่มโปรโมชันสำเร็จ');
}

function loadPromotionList() {
    const list = document.getElementById('promoList');
    list.innerHTML = '<h3>รายการโปรโมชันปัจจุบัน</h3>';
    
    if (promotions.length === 0) {
        list.innerHTML += '<p>ยังไม่มีโปรโมชัน</p>';
        return;
    }
    
    promotions.forEach((promo, idx) => {
        list.innerHTML += `
            <div style="padding: 10px; border: 1px solid #ddd; margin: 5px 0; border-radius: 4px;">
                <strong>${promo.name}</strong> (${promo.code}) - ลด ${promo.discount}% 
                ${promo.date ? `วันที่: ${promo.date}` : ''}
                <button onclick="deletePromotion(${idx})" style="float: right;">❌</button>
            </div>
        `;
    });
}

function deletePromotion(idx) {
    promotions.splice(idx, 1);
    localStorage.setItem('promotions', JSON.stringify(promotions));
    loadPromotionList();
}

// 5. QR Code Menu
function generateQRCode() {
    // สร้าง URL QR code ผ่าน API
    const menuURL = window.location.href;
    const qrImageURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuURL)}`;
    
    const qrModal = document.getElementById('qrModal');
    const qrDiv = document.getElementById('qrCode');
    qrDiv.innerHTML = `<img src="${qrImageURL}" alt="QR Code" style="max-width: 100%; border-radius: 8px;">`;
    qrModal.style.display = 'block';
}

function closeQR() {
    document.getElementById('qrModal').style.display = 'none';
}

function downloadQR() {
    const image = document.querySelector('#qrCode img');
    const link = document.createElement('a');
    link.href = image.src;
    link.download = 'menu-qr-code.png';
    link.click();
}

// 6. ระบบขายตัดบัญชี
function completeSaleWithDebt() {
    const isDebt = document.getElementById('isDebt').checked;
    const memberCode = document.getElementById('memberCode').value;
    
    if (isDebt && !memberCode) {
        alert('กรุณากรอกรหัสสมาชิก');
        return;
    }
    
    if (isDebt) {
        const netAmount = parseFloat(document.getElementById('netAmount').textContent);
        if (!memberDebt[memberCode]) {
            memberDebt[memberCode] = 0;
        }
        memberDebt[memberCode] += netAmount;
        localStorage.setItem('memberDebt', JSON.stringify(memberDebt));
        alert(`บันทึกการขายตัดบัญชีสำหรับ ${memberCode}\nจำนวน: ${netAmount.toFixed(2)} บาท\nยอดค้างชำระรวม: ${memberDebt[memberCode].toFixed(2)} บาท`);
    }
}

// 7. Export Data
function exportData() {
    if (currentUser && currentUser.role !== 'admin') {
        alert('เฉพาะเจ้าของเท่านั้น');
        return;
    }
    
    const data = {
        salesHistory,
        promotions,
        memberDebt,
        exportDate: new Date().toLocaleString('th-TH')
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos-data-${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

// 8. ส่วนลดเพิ่มเติม (extra discount)
// ใช้งานผ่าน extraDiscount input ในหน้า order-section

// 9. รูปเมนู - ใช้ emoji แทนแล้ว
// ฟังก์ชัน displayMenu ใช้ item.image

// 10. ระบบลูกค้าประจำ
function saveMemberInfo() {
    const memberCode = document.getElementById('memberCode').value;
    const table = document.getElementById('tableNumber').value;
    
    if (memberCode) {
        alert(`บันทึกลูกค้า ${memberCode} ที่โต๊ะ ${table}`);
    }
}

// ========== 8 ฟีเจอร์เพิ่มเติมใหม่ ==========

// 1. Analytics - กราฟแสดงยอดขาย
function openAnalytics() {
    document.getElementById('analyticsModal').style.display = 'block';
    setTimeout(() => drawCharts(), 300);
}

function closeAnalytics() {
    document.getElementById('analyticsModal').style.display = 'none';
}

function drawCharts() {
    // กราฟยอดขายรายวัน
    const dailyData = {};
    salesHistory.forEach(sale => {
        const date = sale.timestamp.split(' ')[0];
        dailyData[date] = (dailyData[date] || 0) + sale.netAmount;
    });
    
    const dates = Object.keys(dailyData);
    const amounts = Object.values(dailyData);
    
    // ใช้ Canvas แทน Chart.js (เนื่องจากไม่มี library)
    drawSimpleChart('salesChart', dates, amounts, 'ยอดขาย');
    drawCategoryChart();
}

function drawSimpleChart(canvasId, labels, data, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;
    
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    if (data.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.fillText('ไม่มีข้อมูล', width / 2 - 40, height / 2);
        return;
    }
    
    const maxValue = Math.max(...data);
    const barWidth = width / data.length;
    
    ctx.fillStyle = '#667eea';
    data.forEach((val, idx) => {
        const barHeight = (val / maxValue) * height * 0.8;
        ctx.fillRect(idx * barWidth + 5, height - barHeight, barWidth - 10, barHeight);
    });
    
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    labels.forEach((label, idx) => {
        ctx.fillText(label, idx * barWidth + 10, height - 10);
    });
}

function drawCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const categoryData = {};
    salesHistory.forEach(sale => {
        sale.items.forEach(item => {
            categoryData[item.name] = (categoryData[item.name] || 0) + item.qty;
        });
    });
    
    const categories = Object.keys(categoryData);
    const quantities = Object.values(categoryData);
    drawSimpleChart('categoryChart', categories, quantities, 'เมนูขายได้');
}

// 2. ประวัติลูกค้า
function openCustomerList() {
    document.getElementById('customerListModal').style.display = 'block';
    loadCustomerList();
}

function closeCustomerList() {
    document.getElementById('customerListModal').style.display = 'none';
}

function loadCustomerList() {
    const list = document.getElementById('customerList');
    list.innerHTML = '';
    
    if (Object.keys(customerHistory).length === 0) {
        list.innerHTML = '<p class="empty-message">ยังไม่มีประวัติลูกค้า</p>';
        return;
    }
    
    Object.entries(customerHistory).forEach(([memberCode, history]) => {
        const totalSpent = history.reduce((sum, t) => sum + t.amount, 0);
        const visitCount = history.length;
        
        list.innerHTML += `
            <div class="customer-item">
                <strong>${memberCode}</strong><br>
                จำนวนครั้ง: ${visitCount} | รวมใช้เงิน: ${totalSpent.toFixed(2)} บาท<br>
                <small>ครั้งสุดท้าย: ${history[history.length - 1].date}</small>
            </div>
        `;
    });
}

function searchCustomer() {
    const search = document.getElementById('customerSearch').value.toLowerCase();
    const items = document.querySelectorAll('.customer-item');
    
    items.forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(search) ? 'block' : 'none';
    });
}

// 3. ไทม์เมอร์เตรียมอาหาร
function openKitchenTimer() {
    document.getElementById('kitchenTimerModal').style.display = 'block';
    updateTimerDisplay();
}

function closeKitchenTimer() {
    document.getElementById('kitchenTimerModal').style.display = 'none';
}

function addTimer() {
    const dish = document.getElementById('timerDish').value;
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 5;
    
    if (!dish) {
        alert('กรุณากรอกชื่อเมนู');
        return;
    }
    
    const timer = {
        id: Date.now(),
        dish,
        totalSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
        started: new Date()
    };
    
    kitchenTimers.push(timer);
    
    document.getElementById('timerDish').value = '';
    document.getElementById('timerMinutes').value = '5';
    
    // เริ่มนับเวลา
    runTimer(timer.id);
    updateTimerDisplay();
}

function runTimer(timerId) {
    const interval = setInterval(() => {
        const timer = kitchenTimers.find(t => t.id === timerId);
        if (!timer) {
            clearInterval(interval);
            return;
        }
        
        timer.remainingSeconds--;
        updateTimerDisplay();
        
        if (timer.remainingSeconds <= 0) {
            clearInterval(interval);
            notifyTimerComplete(timer.dish);
            kitchenTimers = kitchenTimers.filter(t => t.id !== timerId);
            updateTimerDisplay();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const list = document.getElementById('timerList');
    list.innerHTML = '';
    
    if (kitchenTimers.length === 0) {
        list.innerHTML = '<p class="empty-message">ไม่มีไทม์เมอร์</p>';
        return;
    }
    
    kitchenTimers.forEach(timer => {
        const mins = Math.floor(timer.remainingSeconds / 60);
        const secs = timer.remainingSeconds % 60;
        const display = `${mins}:${secs.toString().padStart(2, '0')}`;
        
        list.innerHTML += `
            <div class="timer-item">
                <strong>${timer.dish}</strong><br>
                <div class="timer-display">${display}</div>
                <button class="btn btn-danger" onclick="removeTimer(${timer.id})">ยกเลิก</button>
            </div>
        `;
    });
}

function removeTimer(timerId) {
    kitchenTimers = kitchenTimers.filter(t => t.id !== timerId);
    updateTimerDisplay();
}

function notifyTimerComplete(dish) {
    alert(`⏰ เสร็จแล้ว: ${dish}`);
    // เล่นเสียง notification
    playNotificationSound();
}

function playNotificationSound() {
    // สร้างเสียง notification ด้วย Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// 4. Staff Chat
function openStaffChat() {
    document.getElementById('staffChatModal').style.display = 'block';
    loadChat();
}

function closeStaffChat() {
    document.getElementById('staffChatModal').style.display = 'none';
}

function sendChatMessage() {
    const message = document.getElementById('chatMessage').value;
    
    if (!message.trim()) return;
    
    const chatItem = {
        user: currentUser?.username || 'Anonymous',
        message,
        time: new Date().toLocaleTimeString('th-TH')
    };
    
    staffChat.push(chatItem);
    localStorage.setItem('staffChat', JSON.stringify(staffChat));
    
    document.getElementById('chatMessage').value = '';
    loadChat();
}

function loadChat() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    
    staffChat.slice(-20).forEach(msg => {
        container.innerHTML += `
            <div class="chat-message">
                <strong>${msg.user}</strong> <small>${msg.time}</small><br>
                ${msg.message}
            </div>
        `;
    });
    
    container.scrollTop = container.scrollHeight;
}

// 5. QR Payment
function generateQRPayment() {
    const amount = parseFloat(document.getElementById('netAmount').textContent);
    const qrImageURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020126440014th.co.bbl.paysbx0007bbl20120991012301234567809900000000050000000105802TH53037045406${amount.toFixed(2)}6304A12D`;
    
    document.getElementById('qrAmount').textContent = amount.toFixed(2);
    document.getElementById('qrPaymentCode').innerHTML = `<img src="${qrImageURL}" style="max-width: 100%; border-radius: 8px;">`;
    document.getElementById('qrPaymentModal').style.display = 'block';
}

function closeQRPayment() {
    document.getElementById('qrPaymentModal').style.display = 'none';
}

// 6. เป้าหมายขาย
function openSalesGoal() {
    document.getElementById('salesGoalModal').style.display = 'block';
    updateGoalDisplay();
}

function closeSalesGoal() {
    document.getElementById('salesGoalModal').style.display = 'none';
}

function setSalesGoal() {
    const goal = parseFloat(document.getElementById('goalAmount').value);
    
    if (!goal || goal <= 0) {
        alert('กรุณากรอกจำนวนที่ถูกต้อง');
        return;
    }
    
    const today = new Date().toLocaleDateString('th-TH');
    salesGoal[today] = goal;
    localStorage.setItem('salesGoal', JSON.stringify(salesGoal));
    
    alert(`ตั้งเป้าหมายรายวัน: ${goal.toFixed(2)} บาท`);
    updateGoalDisplay();
}

function updateGoalDisplay() {
    const today = new Date().toLocaleDateString('th-TH');
    const goal = salesGoal[today] || 0;
    
    const todayTotal = salesHistory
        .filter(s => s.timestamp.includes(new Date().toLocaleDateString()))
        .reduce((sum, s) => sum + s.netAmount, 0);
    
    const progress = goal > 0 ? (todayTotal / goal) * 100 : 0;
    
    const container = document.getElementById('goalProgress');
    container.innerHTML = `
        <h4>เป้าหมายวันนี้: ${goal.toFixed(2)} บาท</h4>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%">
                ${progress.toFixed(1)}%
            </div>
        </div>
        <p>ยอดขายปัจจุบัน: ${todayTotal.toFixed(2)} บาท</p>
        ${progress >= 100 ? '<p style="color: #51cf66; font-weight: bold;">✓ ถึงเป้าหมายแล้ว!</p>' : ''}
    `;
}

// 7. การแจ้งเตือน - ตรวจสอบเมื่อบันทึกการขาย
function checkInventoryAlert() {
    // ตัวอย่าง: แจ้งเตือนเมื่อเมนูใดขายดี
    const topSelling = [...menuItems]
        .sort((a, b) => b.trending - a.trending)
        .slice(0, 3);
    
    console.log('🔔 เมนูขายดี:', topSelling.map(m => m.name).join(', '));
}

// 8. ลูกค้าประจำ - บันทึกในการขาย
function recordCustomerPurchase() {
    const memberCode = document.getElementById('memberCode').value;
    if (!memberCode) return;
    
    const amount = parseFloat(document.getElementById('netAmount').textContent);
    const date = new Date().toLocaleString('th-TH');
    
    if (!customerHistory[memberCode]) {
        customerHistory[memberCode] = [];
    }
    
    customerHistory[memberCode].push({ amount, date });
    localStorage.setItem('customerHistory', JSON.stringify(customerHistory));
}

// ========== 5 ฟีเจอร์เพิ่มเติมสุดท้าย ==========

// 1. Menu Editor
function openMenuEditor() {
    document.getElementById('menuEditorModal').style.display = 'block';
    loadMenuList();
}

function closeMenuEditor() {
    document.getElementById('menuEditorModal').style.display = 'none';
}

function loadMenuList() {
    const list = document.getElementById('menuList');
    list.innerHTML = '';
    
    menuItems.forEach((item, idx) => {
        list.innerHTML += `
            <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #f8f9fa;">
                <strong>${item.emoji} ${item.name}</strong><br>
                <small>หมวด: ${item.category} | ราคา: ${item.price} บาท</small><br>
                <button onclick="editMenuItem(${idx})" style="padding: 4px 8px; margin-top: 8px;">✏️ แก้ไข</button>
                <button onclick="deleteMenuItem(${idx})" style="padding: 4px 8px;">🗑️ ลบ</button>
            </div>
        `;
    });
}

function addMenuItemForm() {
    document.getElementById('addMenuSection').style.display = 'block';
}

function cancelAddMenu() {
    document.getElementById('addMenuSection').style.display = 'none';
    document.getElementById('newMenuName').value = '';
    document.getElementById('newMenuCategory').value = '';
    document.getElementById('newMenuPrice').value = '';
    document.getElementById('newMenuEmoji').value = '';
}

function saveNewMenuItem() {
    const name = document.getElementById('newMenuName').value;
    const category = document.getElementById('newMenuCategory').value;
    const price = parseFloat(document.getElementById('newMenuPrice').value);
    const emoji = document.getElementById('newMenuEmoji').value || '🍽️';
    
    if (!name || !category || !price) {
        alert('กรุณากรอกข้อมูลทั้งหมด');
        return;
    }
    
    const newItem = {
        id: Math.max(...menuItems.map(m => m.id), 0) + 1,
        name,
        category,
        price,
        emoji,
        barcode: 'NEW' + Date.now(),
        trending: 0,
        stock: 20
    };
    
    menuItems.push(newItem);
    alert('✓ เพิ่มเมนู ' + name + ' แล้ว');
    cancelAddMenu();
    loadMenuList();
    displayMenu();
}

function editMenuItem(idx) {
    const item = menuItems[idx];
    const newPrice = prompt('ราคาใหม่:', item.price);
    if (!newPrice) return;
    
    menuItems[idx].price = parseFloat(newPrice);
    alert('✓ แก้ไขแล้ว');
    loadMenuList();
    displayMenu();
}

function deleteMenuItem(idx) {
    if (confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) {
        menuItems.splice(idx, 1);
        alert('✓ ลบแล้ว');
        loadMenuList();
        displayMenu();
    }
}

// 2. Sales by Staff
function openSalesStaff() {
    document.getElementById('salesStaffModal').style.display = 'block';
    loadSalesStaffReport();
}

function closeSalesStaff() {
    document.getElementById('salesStaffModal').style.display = 'none';
}

function loadSalesStaffReport() {
    const staffStats = {};
    
    employees.forEach(emp => {
        staffStats[emp.name] = {
            name: emp.name,
            position: emp.position,
            totalSales: 0,
            transactions: 0,
            salary: emp.salary
        };
    });
    
    // เนื่องจากไม่มีเชื่อมโยง staff กับ sales คืนข้อมูลกระบบจำลอง
    salesHistory.forEach((sale, idx) => {
        const assignedStaff = employees[idx % employees.length];
        if (assignedStaff) {
            if (!staffStats[assignedStaff.name]) {
                staffStats[assignedStaff.name] = {
                    name: assignedStaff.name,
                    totalSales: 0,
                    transactions: 0
                };
            }
            staffStats[assignedStaff.name].totalSales += sale.netAmount;
            staffStats[assignedStaff.name].transactions += 1;
        }
    });
    
    const list = document.getElementById('staffSalesList');
    list.innerHTML = '';
    
    if (Object.keys(staffStats).length === 0) {
        list.innerHTML = '<p style="color: #999;">ยังไม่มีข้อมูล</p>';
        return;
    }
    
    Object.values(staffStats).forEach(stat => {
        const avg = stat.transactions > 0 ? (stat.totalSales / stat.transactions).toFixed(2) : 0;
        list.innerHTML += `
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f8f9fa;">
                <strong>👤 ${stat.name}</strong><br>
                <small>${stat.position || 'พนักงาน'}</small><br>
                <strong style="color: #667eea;">ยอดขาย: ${stat.totalSales.toFixed(2)} บาท</strong><br>
                <small>บิล: ${stat.transactions} | เฉลี่ย: ${avg} บาท</small>
            </div>
        `;
    });
}

// 3. Undo Last Item
function undoLastItem() {
    if (currentOrder.length === 0) {
        alert('ไม่มีรายการให้ยกเลิก');
        return;
    }
    
    const removed = currentOrder.pop();
    alert(`✓ ยกเลิกแล้ว: ${removed.name} x${removed.quantity}`);
    updateOrderDisplay();
    updateOrderSummary();
}

// 4. Expense Tracking
function openExpense() {
    document.getElementById('expenseModal').style.display = 'block';
    document.getElementById('expenseDate').valueAsDate = new Date();
    loadExpenseList();
}

function closeExpense() {
    document.getElementById('expenseModal').style.display = 'none';
}

function saveExpense() {
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const note = document.getElementById('expenseNote').value;
    
    if (!category || !amount || !date) {
        alert('กรุณากรอกข้อมูลให้ครบ');
        return;
    }
    
    expenses.push({
        date,
        category,
        amount,
        note,
        recordedBy: currentUser?.username || 'Anonymous',
        timestamp: new Date().toLocaleTimeString('th-TH')
    });
    
    localStorage.setItem('expenses', JSON.stringify(expenses));
    alert('✓ บันทึกค่าใช้จ่ายแล้ว');
    
    document.getElementById('expenseCategory').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseNote').value = '';
    
    loadExpenseList();
}

function loadExpenseList() {
    const today = new Date().toLocaleDateString('th-TH');
    const todayExpenses = expenses.filter(e => e.date === today);
    const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const list = document.getElementById('expenseList');
    list.innerHTML = `<strong>ค่าใช้จ่ายวันนี้: ${totalToday.toFixed(2)} บาท</strong><br><br>`;
    
    todayExpenses.forEach(exp => {
        list.innerHTML += `
            <div style="padding: 8px; border-bottom: 1px solid #eee; background: #fff9e6;">
                <strong>${exp.category}</strong> - <span style="color: #ff6b6b; font-weight: bold;">${exp.amount.toFixed(2)}</span> บาท<br>
                <small>${exp.timestamp} | ${exp.note}</small>
            </div>
        `;
    });
}

// 5. Export Data
function exportData() {
    const today = new Date().toLocaleDateString('th-TH');
    let csvContent = 'ประจำวันที่,' + today + '\r\n\r\n';
    
    // ส่วนขาย
    csvContent += 'ยอดขาย\r\n';
    csvContent += 'เวลา,โต๊ะ,รวม,ส่วนลด,สุทธิ\r\n';
    
    const todaySales = salesHistory.filter(s => s.timestamp.includes(today));
    let totalSales = 0;
    let totalDiscount = 0;
    
    todaySales.forEach(sale => {
        csvContent += `"${sale.timestamp}","${sale.table}",${sale.subtotal.toFixed(2)},${sale.discount.toFixed(2)},${sale.netAmount.toFixed(2)}\r\n`;
        totalSales += sale.netAmount;
        totalDiscount += sale.discount;
    });
    
    csvContent += `รวมทั้งหมด,,${todaySales.reduce((s, x) => s + x.subtotal, 0).toFixed(2)},${totalDiscount.toFixed(2)},${totalSales.toFixed(2)}\r\n\r\n`;
    
    // ส่วนค่าใช้จ่าย
    csvContent += 'ค่าใช้จ่าย\r\n';
    csvContent += 'หมวดหมู่,จำนวนเงิน,หมายเหตุ\r\n';
    
    const todayExpenses = expenses.filter(e => e.date === today);
    const totalExpense = todayExpenses.reduce((s, e) => s + e.amount, 0);
    
    todayExpenses.forEach(exp => {
        csvContent += `"${exp.category}",${exp.amount.toFixed(2)},"${exp.note}"\r\n`;
    });
    
    csvContent += `รวม,${totalExpense.toFixed(2)},\r\n\r\n`;
    csvContent += `กำไร,${(totalSales - totalExpense).toFixed(2)},\r\n`;
    
    // ดาวน์โหลด
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `POS_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('✓ ส่งออกแล้ว');
}

// ========== 5 ฟีเจอร์เพิ่มเติมใหม่ ==========

// 1. Table Management
function openTableMap() {
    document.getElementById('tableMapModal').style.display = 'block';
    displayTables();
}

function closeTableMap() {
    document.getElementById('tableMapModal').style.display = 'none';
}

function displayTables() {
    const grid = document.getElementById('tableGrid');
    grid.innerHTML = '';
    
    tables.forEach(table => {
        const orderCount = table.currentOrder.length;
        const statusColor = table.status === 'empty' ? '#51cf66' : 
                           table.status === 'serving' ? '#ffd700' : '#ff6b6b';
        
        grid.innerHTML += `
            <div style="padding: 10px; border: 2px solid ${statusColor}; border-radius: 8px; background: #f8f9fa; cursor: pointer; text-align: center;" onclick="toggleTableStatus(${table.id})">
                <strong>โต๊ะ ${table.id}</strong><br>
                <div style="font-size: 24px; color: ${statusColor}; margin: 5px 0;">
                    ${table.status === 'empty' ? '🪑 ว่าง' : 
                      table.status === 'serving' ? '🍽️ เสิร์ฟ' : '⏳ รอ'}
                </div>
                <small>${orderCount} รายการ</small>
            </div>
        `;
    });
}

function toggleTableStatus(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    table.status = table.status === 'empty' ? 'serving' : 
                   table.status === 'serving' ? 'waiting' : 'empty';
    
    displayTables();
}

// 2. Stock Management
function openStock() {
    document.getElementById('stockModal').style.display = 'block';
    loadStock();
}

function closeStock() {
    document.getElementById('stockModal').style.display = 'none';
}

function loadStock() {
    const list = document.getElementById('stockList');
    list.innerHTML = '';
    
    menuItems.forEach(item => {
        const color = item.stock <= 5 ? 'red' : 
                     item.stock <= 15 ? 'orange' : 'green';
        
        list.innerHTML += `
            <div style="padding: 10px; border-bottom: 1px solid #ddd; background: ${color === 'red' ? '#ffe0e0' : color === 'orange' ? '#fff5e0' : '#e0ffe0'};">
                <strong>${item.emoji} ${item.name}</strong><br>
                สต็อก: <span style="font-size: 18px; color: ${color}; font-weight: bold;">${item.stock}</span> ชิ้น
                <br><small>ราคา: ${item.price} บาท</small>
                <div style="margin-top: 5px;">
                    <button onclick="adjustStock(${item.id}, 5)" style="padding: 3px 10px; cursor: pointer;">+5</button>
                    <button onclick="adjustStock(${item.id}, -5)" style="padding: 3px 10px; cursor: pointer;">-5</button>
                </div>
            </div>
        `;
    });
}

function filterStock() {
    const search = document.getElementById('stockSearch').value.toLowerCase();
    const items = document.querySelectorAll('[data-stock-item]');
    
    menuItems.forEach(item => {
        const element = document.querySelector(`[data-stock-item="${item.id}"]`);
        if (element) {
            element.style.display = item.name.toLowerCase().includes(search) ? 'block' : 'none';
        }
    });
}

function adjustStock(itemId, amount) {
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
        item.stock = Math.max(0, item.stock + amount);
        loadStock();
        alert(`${item.name} สต็อกใหม่: ${item.stock} ชิ้น`);
    }
}

// 3. Tax & Service Charge
function updateTaxAndService() {
    const subtotal = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountPercent = parseFloat(document.getElementById('discountPercent').value) || 0;
    const discount = (subtotal * discountPercent) / 100 + (parseFloat(document.getElementById('extraDiscount').value) || 0);
    
    const afterDiscount = subtotal - discount;
    const tax = (afterDiscount * taxRate) / 100;
    const service = (afterDiscount * serviceCharge) / 100;
    const netAmount = afterDiscount + tax + service;
    
    document.getElementById('subtotalAmount').textContent = subtotal.toFixed(2);
    document.getElementById('discountAmount').textContent = discount.toFixed(2);
    document.getElementById('taxAmount').textContent = (tax + service).toFixed(2);
    document.getElementById('modalTotal').textContent = netAmount.toFixed(2);
    document.getElementById('netAmount').textContent = netAmount.toFixed(2);
}

// 4. Receipt Reprint
function openReceipts() {
    document.getElementById('receiptModal').style.display = 'block';
    loadReceiptHistory();
}

function closeReceipts() {
    document.getElementById('receiptModal').style.display = 'none';
}

function loadReceiptHistory() {
    const list = document.getElementById('receiptList');
    list.innerHTML = '';
    
    if (salesHistory.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999;">ไม่มีประวัติ</p>';
        return;
    }
    
    salesHistory.slice(-10).reverse().forEach((sale, idx) => {
        const itemsText = sale.items.map(i => `${i.name} x${i.qty}`).join(', ');
        
        list.innerHTML += `
            <div style="padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer;" onclick="reprintReceipt(${salesHistory.length - idx - 1})">
                <strong>${sale.timestamp}</strong><br>
                โต๊ะ: ${sale.table} | ประเภท: ${sale.orderType || 'dine-in'}<br>
                <small>${itemsText}</small><br>
                <strong style="color: #667eea;">รวม: ${sale.netAmount.toFixed(2)} บาท</strong>
                <button onclick="reprintReceipt(${salesHistory.length - idx - 1}); event.stopPropagation();" style="float: right; padding: 3px 10px;">🖨️ พิมพ์</button>
            </div>
        `;
    });
}

function reprintReceipt(index) {
    const sale = salesHistory[index];
    let receipt = '========== ใบเสร็จ (พิมพ์ซ้ำ) ==========\n';
    receipt += `โต๊ะที่: ${sale.table}\n`;
    receipt += `เวลา: ${sale.timestamp}\n`;
    receipt += `ประเภท: ${sale.orderType || 'dine-in'}\n\n`;
    
    sale.items.forEach(item => {
        receipt += `${item.name}\n  x${item.qty} @ ${item.price} บาท\n`;
    });
    
    receipt += `\n========== ยอดรวม ==========\n`;
    receipt += `รวม: ${sale.subtotal.toFixed(2)} บาท\n`;
    receipt += `ส่วนลด: ${sale.discount.toFixed(2)} บาท\n`;
    receipt += `ภาษี+บริการ: ${(sale.netAmount - sale.subtotal + sale.discount).toFixed(2)} บาท\n`;
    receipt += `รวมสุทธิ: ${sale.netAmount.toFixed(2)} บาท\n`;
    receipt += `ชำระ: ${sale.payment.toFixed(2)} บาท\n`;
    receipt += `คืนเงิน: ${sale.change.toFixed(2)} บาท\n`;
    
    if (sale.notes) {
        receipt += `\nหมายเหตุ: ${sale.notes}\n`;
    }
    
    receipt += `\n====== ขอบคุณมากครับ ======\n`;
    
    const printWindow = window.open('', '', 'width=400, height=600');
    printWindow.document.write('<pre>' + receipt + '</pre>');
    printWindow.document.close();
    printWindow.print();
}

// 5. Delivery/Takeaway
function setupOrderTypeListener() {
    const orderType = document.getElementById('orderType');
    if (orderType) {
        orderType.addEventListener('change', function() {
            const type = this.value;
            if (type === 'delivery') {
                const address = prompt('กรุณากรอกที่อยู่ส่ง:');
                if (address) {
                    currentOrder.deliveryAddress = address;
                }
            }
        });
    }
}

// ========== 4 ฟีเจอร์จำเป็น ==========

// 1. Cash Drawer Management
function openDrawer() {
    document.getElementById('drawerModal').style.display = 'block';
    updateDrawerDisplay();
}

function closeDrawer() {
    document.getElementById('drawerModal').style.display = 'none';
}

function updateDrawerDisplay() {
    const today = new Date().toLocaleDateString('th-TH');
    const todayDrawer = drawerHistory.find(d => d.date === today && d.status === 'open');
    const todayCloser = drawerHistory.find(d => d.date === today && d.status === 'close');
    
    const todaySalesTotal = salesHistory
        .filter(s => s.timestamp.includes(new Date().toLocaleDateString()))
        .reduce((sum, s) => sum + s.payment, 0);
    
    if (todayDrawer) {
        document.getElementById('drawerStatus').textContent = '🟢 เปิด';
        document.getElementById('drawerStatus').style.color = '#51cf66';
        document.getElementById('openingAmount').textContent = todayDrawer.openAmount.toFixed(2);
        document.getElementById('todaySales').textContent = todaySalesTotal.toFixed(2);
        document.getElementById('expectedClosing').textContent = (todayDrawer.openAmount + todaySalesTotal).toFixed(2);
    } else {
        document.getElementById('drawerStatus').textContent = '🔴 ปิด';
        document.getElementById('drawerStatus').style.color = '#ff6b6b';
    }
    
    // Load history
    const historyDiv = document.getElementById('drawerHistory');
    historyDiv.innerHTML = drawerHistory.slice(-5).reverse().map(d => `
        <div style="padding: 8px; border-bottom: 1px solid #eee;">
            <strong>${d.date}</strong> - ${d.status === 'open' ? 'เปิด' : 'ปิด'}<br>
            ${d.status === 'open' ? `เดือนเปิด: ${d.openAmount.toFixed(2)} บาท` : `จริง: ${d.actualAmount.toFixed(2)} บาท | ต่างขาด: ${(d.expectedAmount - d.actualAmount).toFixed(2)} บาท`}
        </div>
    `).join('');
}

function openDrawerAction() {
    const amount = parseFloat(document.getElementById('drawerOpenAmount').value);
    if (!amount || amount < 0) {
        alert('กรุณากรอกจำนวนเงินถูกต้อง');
        return;
    }
    
    const today = new Date().toLocaleDateString('th-TH');
    const exists = drawerHistory.find(d => d.date === today && d.status === 'open');
    
    if (exists) {
        alert('ลิ้นชักเปิดแล้วในวันนี้');
        return;
    }
    
    drawerHistory.push({
        date: today,
        status: 'open',
        openAmount: amount,
        openTime: new Date().toLocaleTimeString('th-TH')
    });
    
    localStorage.setItem('drawerHistory', JSON.stringify(drawerHistory));
    alert('✓ เปิดลิ้นชักแล้ว เงินเดือนเปิด ' + amount.toFixed(2) + ' บาท');
    document.getElementById('drawerOpenAmount').value = '';
    updateDrawerDisplay();
}

function closeDrawerAction() {
    const actualAmount = parseFloat(document.getElementById('drawerActualAmount').value);
    if (!actualAmount || actualAmount < 0) {
        alert('กรุณากรอกจำนวนเงินจริง');
        return;
    }
    
    const today = new Date().toLocaleDateString('th-TH');
    const openDrawer = drawerHistory.find(d => d.date === today && d.status === 'open');
    
    if (!openDrawer) {
        alert('ยังไม่เปิดลิ้นชักวันนี้');
        return;
    }
    
    const todaySalesTotal = salesHistory
        .filter(s => s.timestamp.includes(new Date().toLocaleDateString()))
        .reduce((sum, s) => sum + s.payment, 0);
    
    const expectedAmount = openDrawer.openAmount + todaySalesTotal;
    const difference = actualAmount - expectedAmount;
    
    drawerHistory.push({
        date: today,
        status: 'close',
        actualAmount: actualAmount,
        expectedAmount: expectedAmount,
        difference: difference,
        closeTime: new Date().toLocaleTimeString('th-TH')
    });
    
    localStorage.setItem('drawerHistory', JSON.stringify(drawerHistory));
    alert(`✓ ปิดลิ้นชักแล้ว\nคาดการณ์: ${expectedAmount.toFixed(2)} บาท\nจริง: ${actualAmount.toFixed(2)} บาท\nต่าง: ${difference.toFixed(2)} บาท`);
    document.getElementById('drawerActualAmount').value = '';
    updateDrawerDisplay();
}

// 2. Refund System
function openRefund() {
    document.getElementById('refundModal').style.display = 'block';
    loadRefundReceipts();
}

function closeRefund() {
    document.getElementById('refundModal').style.display = 'none';
}

function loadRefundReceipts() {
    const select = document.getElementById('refundReceiptSelect');
    select.innerHTML = '<option value="">-- เลือกใบเสร็จ --</option>';
    
    salesHistory.slice(-20).forEach((sale, idx) => {
        select.innerHTML += `<option value="${idx}">${sale.timestamp} - ${sale.netAmount.toFixed(2)} บาท</option>`;
    });
    
    select.addEventListener('change', function() {
        if (this.value) {
            const sale = salesHistory[this.value];
            document.getElementById('refundDetails').innerHTML = `
                <strong>เวลา:</strong> ${sale.timestamp}<br>
                <strong>โต๊ะ:</strong> ${sale.table}<br>
                <strong>รวม:</strong> ${sale.netAmount.toFixed(2)} บาท<br>
                <strong>รายการ:</strong> ${sale.items.map(i => i.name + ' x' + i.qty).join(', ')}<br>
                <div style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 10px;">
                    <strong style="color: #856404;">⚠️ คืนเงินเต็มจำนวน ${sale.netAmount.toFixed(2)} บาท</strong>
                </div>
            `;
        }
    });
}

function processRefund() {
    const receiptIdx = document.getElementById('refundReceiptSelect').value;
    const reason = document.getElementById('refundReason').value;
    
    if (!receiptIdx || !reason) {
        alert('กรุณาเลือกใบเสร็จและระบุเหตุผล');
        return;
    }
    
    const sale = salesHistory[receiptIdx];
    const refund = {
        date: new Date().toLocaleString('th-TH'),
        originalSale: sale,
        refundAmount: sale.netAmount,
        reason: reason,
        refundBy: currentUser?.username || 'Anonymous'
    };
    
    refundHistory.push(refund);
    localStorage.setItem('refundHistory', JSON.stringify(refundHistory));
    
    // หักจากยอดลิ้นชัก
    const today = new Date().toLocaleDateString('th-TH');
    const drawerRefund = {
        date: today,
        status: 'refund',
        refundAmount: sale.netAmount,
        originalReceipt: sale.timestamp
    };
    drawerHistory.push(drawerRefund);
    localStorage.setItem('drawerHistory', JSON.stringify(drawerHistory));
    
    alert(`✓ คืนเงินแล้ว ${sale.netAmount.toFixed(2)} บาท\nเหตุผล: ${reason}\n(หักจากลิ้นชัก)`);
    document.getElementById('refundReason').value = '';
    document.getElementById('refundReceiptSelect').value = '';
    document.getElementById('refundDetails').innerHTML = '<p style="color: #999;">เลือกใบเสร็จเพื่อดูรายละเอียด</p>';
}

// 3. Employee Management
function openEmployee() {
    document.getElementById('employeeModal').style.display = 'block';
    loadEmployeeList();
}

function closeEmployee() {
    document.getElementById('employeeModal').style.display = 'none';
}

function loadEmployeeList() {
    const list = document.getElementById('employeeList');
    list.innerHTML = '';
    
    if (employees.length === 0) {
        list.innerHTML = '<p style="color: #999; grid-column: 1/-1; text-align: center;">ยังไม่มีพนักงาน</p>';
        return;
    }
    
    employees.forEach((emp, idx) => {
        list.innerHTML += `
            <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #f8f9fa;">
                <strong>👤 ${emp.name}</strong><br>
                <small>ตำแหน่ง: ${emp.position}</small><br>
                <small>เงินเดือน: ${emp.salary.toFixed(2)} บาท</small><br>
                <small>เริ่มงาน: ${emp.startDate}</small><br>
                <button onclick="editEmployee(${idx})" style="padding: 4px 8px; margin-top: 8px;">✏️ แก้ไข</button>
                <button onclick="removeEmployee(${idx})" style="padding: 4px 8px;">🗑️ ลบ</button>
            </div>
        `;
    });
}

function addEmployeeForm() {
    document.getElementById('addEmployeeSection').style.display = 'block';
}

function cancelAddEmployee() {
    document.getElementById('addEmployeeSection').style.display = 'none';
    document.getElementById('newEmpName').value = '';
    document.getElementById('newEmpPosition').value = '';
    document.getElementById('newEmpSalary').value = '';
    document.getElementById('newEmpStartDate').value = '';
}

function saveNewEmployee() {
    const name = document.getElementById('newEmpName').value;
    const position = document.getElementById('newEmpPosition').value;
    const salary = parseFloat(document.getElementById('newEmpSalary').value);
    const startDate = document.getElementById('newEmpStartDate').value;
    
    if (!name || !position || !salary || !startDate) {
        alert('กรุณากรอกข้อมูลทั้งหมด');
        return;
    }
    
    employees.push({ name, position, salary, startDate });
    localStorage.setItem('employees', JSON.stringify(employees));
    alert('✓ เพิ่มพนักงาน ' + name + ' แล้ว');
    cancelAddEmployee();
    loadEmployeeList();
}

function editEmployee(idx) {
    const emp = employees[idx];
    const newName = prompt('ชื่อ:', emp.name);
    if (!newName) return;
    
    const newSalary = prompt('เงินเดือน:', emp.salary);
    if (!newSalary) return;
    
    employees[idx].name = newName;
    employees[idx].salary = parseFloat(newSalary);
    localStorage.setItem('employees', JSON.stringify(employees));
    loadEmployeeList();
}

function removeEmployee(idx) {
    if (confirm('ต้องการลบพนักงานนี้ใช่หรือไม่?')) {
        employees.splice(idx, 1);
        localStorage.setItem('employees', JSON.stringify(employees));
        loadEmployeeList();
    }
}

// 4. Settings
function openSettings() {
    document.getElementById('settingsModal').style.display = 'block';
    loadSettings();
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function loadSettings() {
    document.getElementById('shopName').value = shopSettings.shopName;
    document.getElementById('shopAddress').value = shopSettings.shopAddress;
    document.getElementById('shopPhone').value = shopSettings.shopPhone;
    document.getElementById('ownerName').value = shopSettings.ownerName;
    document.getElementById('taxRateSetting').value = shopSettings.taxRate;
    document.getElementById('serviceChargeSetting').value = shopSettings.serviceCharge;
}

function saveSettings() {
    shopSettings = {
        shopName: document.getElementById('shopName').value,
        shopAddress: document.getElementById('shopAddress').value,
        shopPhone: document.getElementById('shopPhone').value,
        ownerName: document.getElementById('ownerName').value,
        taxRate: parseFloat(document.getElementById('taxRateSetting').value),
        serviceCharge: parseFloat(document.getElementById('serviceChargeSetting').value)
    };
    
    // Update global variables
    taxRate = shopSettings.taxRate;
    serviceCharge = shopSettings.serviceCharge;
    
    localStorage.setItem('shopSettings', JSON.stringify(shopSettings));
    alert('✓ บันทึกการตั้งค่าแล้ว');
    
    // Update navbar with shop name
    document.querySelector('h1').textContent = '🍽️ ' + shopSettings.shopName;
}


/* ===============================
   REAL SHOP PATCH v1.0
   ใช้ร่วมกับระบบเดิมของคุณ
   =============================== */

(function () {

  // ===== 1. ROLE-BASED ACCESS =====
  function applyRoleLock() {
    if (!window.currentUser) return;
    const isAdmin = currentUser.role === 'admin';

    document.querySelectorAll('[onclick*="openRefund"], [onclick*="exportData"], [onclick*="openSettings"], [onclick*="openEmployee"]').forEach(btn => {
      if (!isAdmin) btn.style.display = 'none';
    });
  }

  // ===== 2. STOCK CUT ON PAYMENT =====
  const _completePayment = window.completePayment;
  window.completePayment = function () {
    for (const item of currentOrder) {
      const menu = menuItems.find(m => m.id === item.id);
      if (menu && menu.stock < item.quantity) {
        alert('สต็อกไม่พอ: ' + menu.name);
        return;
      }
    }

    // ตัดสต็อกจริง
    currentOrder.forEach(item => {
      const menu = menuItems.find(m => m.id === item.id);
      if (menu) menu.stock -= item.quantity;
    });

    localStorage.setItem('menuItems', JSON.stringify(menuItems));
    _completePayment();
  };

  // ===== 3. PAYMENT METHOD TRACKING =====
  const _generateReceipt = window.generateReceipt;
  window.generateReceipt = function () {
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
    let receipt = _generateReceipt();
    receipt += '\nช่องทางชำระ: ' + method;
    return receipt;
  };

  // ===== 4. Z REPORT =====
  window.closeDay = function (opening, closing) {
    const cashSales = salesHistory.filter(s => s.paymentMethod === 'cash')
      .reduce((sum, s) => sum + s.netAmount, 0);

    const expected = opening + cashSales;
    const diff = closing - expected;

    const report = {
      date: new Date().toLocaleDateString('th-TH'),
      opening,
      closing,
      expected,
      difference: diff
    };

    const zReports = JSON.parse(localStorage.getItem('zReports') || '[]');
    zReports.push(report);
    localStorage.setItem('zReports', JSON.stringify(zReports));

    alert('ปิดกะสำเร็จ\nผลต่าง: ' + diff.toFixed(2));
  };

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', applyRoleLock);

})();

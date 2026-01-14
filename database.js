const menuItems = [
    // ข้าว
    { id: 1, name: 'ข้าวสวย', category: 'rice', price: 40, emoji: '🍚', barcode: 'RICE001', image: '🍚', trending: 5, stock: 50 },
    { id: 2, name: 'ข้าวหมูแดง', category: 'rice', price: 50, emoji: '🍛', barcode: 'RICE002', image: '🍛', trending: 12, stock: 30 },
    { id: 3, name: 'ข้าวไก่', category: 'rice', price: 50, emoji: '🍗', barcode: 'RICE003', image: '🍗', trending: 8, stock: 25 },
    { id: 4, name: 'ข้าวหน้าเป็ด', category: 'rice', price: 60, emoji: '🦆', barcode: 'RICE004', image: '🦆', trending: 3, stock: 15 },
    { id: 5, name: 'ข้าวปลาแห้ง', category: 'rice', price: 45, emoji: '🍚', barcode: 'RICE005', image: '🍚', trending: 2, stock: 0 },
    { id: 6, name: 'ไข่เจียว', category: 'rice', price: 35, emoji: '🍳', barcode: 'RICE006', image: '🍳', trending: 9, stock: 40 },
    
    // เส้น
    { id: 7, name: 'ลูกชิ้นต้มยำ', category: 'noodles', price: 55, emoji: '🍜', barcode: 'NOODLE001', image: '🍜', trending: 15, stock: 20 },
    { id: 8, name: 'บะหมี่เกี๊ยว', category: 'noodles', price: 45, emoji: '🍜', barcode: 'NOODLE002', image: '🍜', trending: 10, stock: 35 },
    { id: 9, name: 'ราดหน้า', category: 'noodles', price: 50, emoji: '🍜', barcode: 'NOODLE003', image: '🍜', trending: 7, stock: 28 },
    { id: 10, name: 'ผัดเส้นหลาย', category: 'noodles', price: 50, emoji: '🍝', barcode: 'NOODLE004', image: '🍝', trending: 11, stock: 32 },
    { id: 11, name: 'ส้มตำ', category: 'noodles', price: 40, emoji: '🥗', barcode: 'NOODLE005', image: '🥗', trending: 4, stock: 5 },
    { id: 12, name: 'น้ำพริกปลา', category: 'noodles', price: 45, emoji: '🌶️', barcode: 'NOODLE006', image: '🌶️', trending: 6, stock: 12 },
    
    // เครื่องดื่ม
    { id: 13, name: 'น้ำปลา', category: 'drinks', price: 15, emoji: '🥤', barcode: 'DRINK001', image: '🥤', trending: 20, stock: 100 },
    { id: 14, name: 'น้ำส้ม', category: 'drinks', price: 20, emoji: '🧡', barcode: 'DRINK002', image: '🧡', trending: 18, stock: 80 },
    { id: 15, name: 'โอวัลติน', category: 'drinks', price: 25, emoji: '☕', barcode: 'DRINK003', image: '☕', trending: 14, stock: 60 },
    { id: 16, name: 'นมเย็น', category: 'drinks', price: 30, emoji: '🥛', barcode: 'DRINK004', image: '🥛', trending: 16, stock: 45 },
    { id: 17, name: 'เบียร์', category: 'drinks', price: 60, emoji: '🍺', barcode: 'DRINK005', image: '🍺', trending: 1, stock: 2 },
    
    // ของหวาน
    { id: 18, name: 'ขนมจีบ', category: 'dessert', price: 30, emoji: '🥟', barcode: 'DESSERT001', image: '🥟', trending: 13, stock: 20 },
    { id: 19, name: 'ไข่ม้วน', category: 'dessert', price: 25, emoji: '🍤', barcode: 'DESSERT002', image: '🍤', trending: 19, stock: 18 },
    { id: 20, name: 'เค้ก', category: 'dessert', price: 40, emoji: '🍰', barcode: 'DESSERT003', image: '🍰', trending: 17, stock: 8 }
];

// Initialize data
let salesHistory = [];
let favorites = [];
let promotions = [];
let memberDebt = {};
let customerHistory = {};
let staffChat = [];
let kitchenTimers = [];
let salesGoal = {};
let tables = [];
let receiptHistory = [];
let taxRate = 7; // 7% VAT
let serviceCharge = 0; // 0% service charge
let currentUser = null;
let darkMode = localStorage.getItem('darkMode') === 'true';
let employees = [];
let drawerHistory = [];
let refundHistory = [];
let shopSettings = {
    shopName: 'ร้านอาหาร',
    shopAddress: '',
    shopPhone: '',
    ownerName: '',
    taxRate: 7,
    serviceCharge: 0
};
let expenses = [];
let staffSales = {};

// Default users
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'staff', password: 'staff123', role: 'staff' }
];

// Initialize table status
for (let i = 1; i <= 20; i++) {
    tables.push({ id: i, status: 'empty', currentOrder: [] });
}

// Load from localStorage on page load
if (typeof(Storage) !== 'undefined') {
    try {
        const savedHistory = localStorage.getItem('salesHistory');
        const savedFavorites = localStorage.getItem('favorites');
        const savedPromos = localStorage.getItem('promotions');
        const savedDebt = localStorage.getItem('memberDebt');
        const savedCustomers = localStorage.getItem('customerHistory');
        const savedChat = localStorage.getItem('staffChat');
        const savedGoal = localStorage.getItem('salesGoal');
        const savedUser = localStorage.getItem('currentUser');
        const savedEmployees = localStorage.getItem('employees');
        const savedDrawer = localStorage.getItem('drawerHistory');
        const savedRefund = localStorage.getItem('refundHistory');
        const savedSettings = localStorage.getItem('shopSettings');
        const savedExpenses = localStorage.getItem('expenses');
        
        salesHistory = savedHistory ? JSON.parse(savedHistory) : [];
        favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
        promotions = savedPromos ? JSON.parse(savedPromos) : [];
        memberDebt = savedDebt ? JSON.parse(savedDebt) : {};
        customerHistory = savedCustomers ? JSON.parse(savedCustomers) : {};
        staffChat = savedChat ? JSON.parse(savedChat) : [];
        salesGoal = savedGoal ? JSON.parse(savedGoal) : {};
        currentUser = savedUser ? JSON.parse(savedUser) : null;
        employees = savedEmployees ? JSON.parse(savedEmployees) : [];
        drawerHistory = savedDrawer ? JSON.parse(savedDrawer) : [];
        refundHistory = savedRefund ? JSON.parse(savedRefund) : [];
        shopSettings = savedSettings ? JSON.parse(savedSettings) : shopSettings;
        expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
        
        // Update global settings
        taxRate = shopSettings.taxRate || 7;
        serviceCharge = shopSettings.serviceCharge || 0;
    } catch(e) {
        console.warn('localStorage access failed:', e);
    }
}


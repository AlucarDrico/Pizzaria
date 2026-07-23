import { database } from './products-data.js';
import { fetchUSDRate } from './currency.js';
import { saveOrderToFirebase } from './firebase-config.js';

let cart = JSON.parse(localStorage.getItem('urban_cart')) || [];
let currentUSDRate = 5.20;
let slideIndex = 0;
let slideInterval = null;
let exitModalShown = false;

// 1. RENDERIZAR PRODUTOS NAS CATEGORIAS
function renderProducts() {
    ['social', 'esportiva', 'calcados'].forEach(cat => {
        const container = document.getElementById(`grid-${cat}`);
        if (!container) return;
        
        container.innerHTML = database[cat].map(prod => `
            <div class="product-card">
                <div class="product-img-wrapper">
                    <span class="product-tag">${cat}</span>
                    <img src="${prod.img}" alt="${prod.name}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${prod.name}</h3>
                    <div class="product-price-box">
                        <span class="price-usd">$ ${prod.priceUSD.toFixed(2)}</span>
                    </div>
                    <button class="btn-buy" data-id="${prod.id}" data-name="${prod.name}" data-price="${prod.priceUSD}" data-img="${prod.img}">
                        <i class="fa-solid fa-cart-plus"></i> Comprar
                    </button>
                </div>
            </div>
        `).join('');
    });

    // Event Listeners nos botões comprar
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            addToCart(
                target.dataset.id,
                target.dataset.name,
                parseFloat(target.dataset.price),
                target.dataset.img
            );
        });
    });
}

// 2. GERENCIAMENTO DO CARRINHO
function addToCart(id, name, priceUSD, img) {
    cart.push({ id, name, priceUSD, img });
    localStorage.setItem('urban_cart', JSON.stringify(cart));
    updateCartBadge();
    alert(`"${name}" foi adicionado ao seu carrinho!`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('urban_cart', JSON.stringify(cart));
    renderCartView();
    updateCartBadge();
}

function updateCartBadge() {
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.textContent = cart.length;
}

function renderCartView() {
    const tbody = document.getElementById('cart-items-body');
    const emptyMsg = document.getElementById('empty-cart-msg');

    if (cart.length === 0) {
        tbody.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
    } else {
        if (emptyMsg) emptyMsg.style.display = 'none';
        tbody.innerHTML = cart.map((item, idx) => `
            <tr>
                <td>
                    <div class="cart-item-info">
                        <img src="${item.img}" alt="${item.name}">
                        <span>${item.name}</span>
                    </div>
                </td>
                <td>$ ${item.priceUSD.toFixed(2)}</td>
                <td>
                    <button class="remove-btn" data-index="${idx}" title="Remover item">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                removeFromCart(idx);
            });
        });
    }
    updateExchangeRate();
}

async function updateExchangeRate() {
    currentUSDRate = await fetchUSDRate();
    const rateText = document.getElementById('rate-text');
    if (rateText) rateText.textContent = `Cotação Atual: 1 USD = R$ ${currentUSDRate.toFixed(2)}`;
    calculateCartTotals();
}

function calculateCartTotals() {
    const totalUSD = cart.reduce((acc, curr) => acc + curr.priceUSD, 0);
    const totalBRL = totalUSD * currentUSDRate;

    const usdEl = document.getElementById('summary-usd');
    const brlEl = document.getElementById('summary-brl');

    if (usdEl) usdEl.textContent = `$ ${totalUSD.toFixed(2)}`;
    if (brlEl) brlEl.textContent = `R$ ${totalBRL.toFixed(2)}`;
}

// 3. TROCA DE TABS (SPA)
window.switchTab = function(tabId) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${tabId}`);
    const targetNav = document.getElementById(`nav-${tabId}`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'carrinho') {
        renderCartView();
    }
};

// 4. CHECKOUT
async function handleCheckout(event) {
    event.preventDefault();

    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    const name = document.getElementById('client-name').value;
    const email = document.getElementById('client-email').value;

    const totalUSD = cart.reduce((acc, curr) => acc + curr.priceUSD, 0);
    const totalBRL = totalUSD * currentUSDRate;

    const orderPayload = {
        clientName: name,
        clientEmail: email,
        items: cart,
        totalUSD: totalUSD.toFixed(2),
        totalBRL: totalBRL.toFixed(2),
        rateUsed: currentUSDRate.toFixed(2),
        createdAt: new Date().toISOString()
    };

    await saveOrderToFirebase(orderPayload);

    if (window.emailjs) {
        try {
            await emailjs.send("SEU_SERVICE_ID", "SEU_TEMPLATE_ID", {
                to_name: name,
                to_email: email,
                total_usd: totalUSD.toFixed(2),
                total_brl: totalBRL.toFixed(2)
            });
        } catch (e) {
            console.warn("EmailJS simulado.");
        }
    }

    alert(`Parabéns, ${name}! Seu pedido foi realizado com sucesso!\nComprovante gerado para ${email}.\nTotal: $${totalUSD.toFixed(2)} (R$ ${totalBRL.toFixed(2)})`);

    cart = [];
    localStorage.removeItem('urban_cart');
    updateCartBadge();
    document.getElementById('checkout-form').reset();
    window.switchTab('home');
}

// 5. CARROSSEL DE IMAGENS
function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    if (index >= slides.length) slideIndex = 0;
    else if (index < 0) slideIndex = slides.length - 1;
    else slideIndex = index;

    slides.forEach((s, i) => {
        s.classList.toggle('active', i === slideIndex);
    });
}

window.moveSlide = function(step) {
    showSlide(slideIndex + step);
    resetSlideTimer();
};

function resetSlideTimer() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        showSlide(slideIndex + 1);
    }, 4000);
}

// 6. EXIT INTENT & CHATBOT
document.addEventListener('mouseleave', (e) => {
    if (e.clientY < 0 && !exitModalShown) {
        const modal = document.getElementById('exit-modal');
        if (modal) {
            modal.style.display = 'flex';
            exitModalShown = true;
        }
    }
});

window.closeExitModal = function() {
    const modal = document.getElementById('exit-modal');
    if (modal) modal.style.display = 'none';
};

window.toggleChat = function() {
    const win = document.getElementById('chat-window');
    if (win) {
        win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
    }
};

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input');
    const body = document.getElementById('chat-body');
    const text = input.value.trim();

    if (!text) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.textContent = text;
    body.appendChild(userMsg);

    input.value = '';
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-msg bot';
        const lowerText = text.toLowerCase();

        if (lowerText.includes('frete')) botMsg.textContent = 'Oferecemos Frete Grátis em compras acima de $ 100 USD!';
        else if (lowerText.includes('cupom')) botMsg.textContent = 'Use URBAN10 para 10% de desconto!';
        else botMsg.textContent = 'Obrigado pelo contato! Como posso ajudar você hoje?';

        body.appendChild(botMsg);
        body.scrollTop = body.scrollHeight;
    }, 800);
};

// INICIALIZAÇÃO
window.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    updateCartBadge();
    resetSlideTimer();

    const form = document.getElementById('checkout-form');
    if (form) form.addEventListener('submit', handleCheckout);
});
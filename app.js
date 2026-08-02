// CAMBIA ESTE NÚMERO POR TU WHATSAPP (Formato internacional sin el +)
const TELEFONO_WHATSAPP = "5350000000"; 

let productos = [];
let carrito = [];
let categoriaActual = 'todos';

// Cargar productos desde el JSON
fetch('productos.json')
  .then(res => res.json())
  .then(data => {
    productos = data;
    renderProducts(productos);
  });

function renderProducts(lista) {
  const container = document.getElementById('product-grid');
  container.innerHTML = '';
  
  lista.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}">
      <h3>${p.nombre}</h3>
      <div class="price">$${p.precio_usd} USD</div>
      <button class="btn-add" onclick="addToCart(${p.id})">Añadir a la Cesta</button>
    `;
    container.appendChild(card);
  });
}

function addToCart(id) {
  const prod = productos.find(p => p.id === id);
  carrito.push(prod);
  updateCartUI();
}

function updateCartUI() {
  document.getElementById('cart-count').innerText = carrito.length;
  const list = document.getElementById('cart-items');
  list.innerHTML = '';
  
  let totalUSD = 0;
  carrito.forEach((item, index) => {
    totalUSD += item.precio_usd;
    list.innerHTML += `<li>${item.nombre} - $${item.precio_usd} USD</li>`;
  });
  
  document.getElementById('cart-total-usd').innerText = totalUSD;
}

function toggleCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function filterCategory(cat) {
  categoriaActual = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  
  let filtrados = cat === 'todos' ? productos : productos.filter(p => p.categoria === cat);
  renderProducts(filtrados);
}

function filterProducts() {
  const text = document.getElementById('search-input').value.toLowerCase();
  const filtrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(text) && 
    (categoriaActual === 'todos' || p.categoria === categoriaActual)
  );
  renderProducts(filtrados);
}

function sendWhatsAppOrder() {
  const nombre = document.getElementById('client-name').value;
  const direccion = document.getElementById('client-address').value;

  if (carrito.length === 0) return alert("Tu cesta está vacía");
  if (!nombre || !direccion) return alert("Por favor, llena tu nombre y dirección");

  let mensaje = `Hola! Quisiera realizar un pedido en *Portal GamEstudio*:\n\n`;
  let totalUSD = 0;

  carrito.forEach(item => {
    mensaje += `▪️ ${item.nombre} - $${item.precio_usd} USD\n`;
    totalUSD += item.precio_usd;
  });

  mensaje += `\n💰 *Total:* $${totalUSD} USD`;
  mensaje += `\n👤 *Cliente:* ${nombre}`;
  mensaje += `\n📍 *Dirección:* ${direccion}`;
  mensaje += `\n\n¿Me confirman disponibilidad y datos de pago (Transfermóvil/Enzona)?`;

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}
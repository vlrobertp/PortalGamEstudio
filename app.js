// CONFIGURACIÓN DE TU TIENDA
const TELEFONO_WHATSAPP = "5352890559"; // Reemplaza por tu número de WhatsApp real sin el +
const TARJETA_PAGO = "9205 9598 7962 9732"; // Tu tarjeta bancaria
const TASA_CAMBIO_CUP = 675; // Tasa de cambio aproximada para referencia en CUP

let productos = [];
let carrito = [];
let categoriaActual = 'todos';

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
    
    // Generar opciones dinámicas del selector
    let opcionesHTML = '';
    p.opciones.forEach((opc, idx) => {
      opcionesHTML += `<option value="${idx}">${opc.nombre} - $${opc.precio} USD</option>`;
    });

    const precioInicial = p.opciones[0].precio;

    card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Portal+GamEstudio'">
      <h3>${p.nombre}</h3>
      <div class="option-select-container">
        <label>Modalidad:</label>
        <select id="select-opc-${p.id}" onchange="updateCardPrice(${p.id})">
          ${opcionesHTML}
        </select>
      </div>
      <div class="price" id="price-display-${p.id}">$${precioInicial} USD</div>
      <button class="btn-add" onclick="addToCart(${p.id})">Añadir a la Cesta</button>
    `;
    container.appendChild(card);
  });
}

function updateCardPrice(idProd) {
  const prod = productos.find(p => p.id === idProd);
  const selectIndex = document.getElementById(`select-opc-${idProd}`).value;
  const precioSel = prod.opciones[selectIndex].precio;
  document.getElementById(`price-display-${idProd}`).innerText = `$${precioSel} USD`;
}

function addToCart(idProd) {
  const prod = productos.find(p => p.id === idProd);
  const selectIndex = document.getElementById(`select-opc-${idProd}`).value;
  const opcionSeleccionada = prod.opciones[selectIndex];

  // Crear objeto único para la cesta
  const itemCarrito = {
    idCart: Date.now() + Math.random(), // Identificador único para poder borrar
    nombre: prod.nombre,
    modalidad: opcionSeleccionada.nombre,
    precio: opcionSeleccionada.precio
  };

  carrito.push(itemCarrito);
  updateCartUI();
}

function removeFromCart(idCart) {
  carrito = carrito.filter(item => item.idCart !== idCart);
  updateCartUI();
}

function updateCartUI() {
  document.getElementById('cart-count').innerText = carrito.length;
  const list = document.getElementById('cart-items');
  list.innerHTML = '';
  
  let totalUSD = 0;
  carrito.forEach(item => {
    totalUSD += item.precio;
    list.innerHTML += `
      <li class="cart-item-row">
        <div>
          <strong>${item.nombre}</strong><br>
          <small>Modalidad: ${item.modalidad} - <span>$${item.precio} USD</span></small>
        </div>
        <button class="btn-delete" onclick="removeFromCart(${item.idCart})">❌</button>
      </li>
    `;
  });
  
  document.getElementById('cart-total-usd').innerText = totalUSD;
  document.getElementById('cart-total-cup').innerText = (totalUSD * TASA_CAMBIO_CUP).toLocaleString();
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
  const telefono = document.getElementById('client-phone').value;
  const direccion = document.getElementById('client-address').value;
  const metodoPago = document.getElementById('payment-method').value;

  if (carrito.length === 0) return alert("Tu cesta está vacía");
  if (!nombre || !telefono || !direccion) return alert("Por favor, completa tu nombre, teléfono y dirección.");

  let mensaje = `🎮 *NUEVO PEDIDO - PORTAL GAMESTUDIO*\n\n`;
  let totalUSD = 0;

  carrito.forEach(item => {
    mensaje += `▪️ *${item.nombre}*\n   Modalidad: ${item.modalidad} ($${item.precio} USD)\n`;
    totalUSD += item.precio;
  });

  const totalCUP = totalUSD * TASA_CAMBIO_CUP;

  mensaje += `\n💰 *TOTAL A PAGAR:* $${totalUSD} USD (o aprox. ${totalCUP.toLocaleString()} CUP)\n`;
  mensaje += `💳 *Método de Pago:* ${metodoPago}\n`;

  if (metodoPago.includes("Transferencia")) {
    mensaje += `🏦 *Tarjeta para Transferencia:* \`${TARJETA_PAGO}\`\n`;
  }

  mensaje += `\n👤 *DATOS DEL CLIENTE:*`;
  mensaje += `\n▪️ Nombre: ${nombre}`;
  mensaje += `\n▪️ Teléfono: ${telefono}`;
  mensaje += `\n📍 *Dirección de entrega:* ${direccion}`;

  mensaje += `\n\n¿Me confirman la disponibilidad para realizar la entrega/activación?`;

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

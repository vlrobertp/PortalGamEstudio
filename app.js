// ==========================================================================
// CONFIGURACIÓN Y ESTADO DE LA TIENDA - PORTAL GAMESTUDIO
// ==========================================================================

const TELEFONO_WHATSAPP = "5350000000"; // Reemplaza por tu número de WhatsApp sin el '+'
const TASA_CAMBIO_DEFAULT = 320; // Tasa por defecto CUP/USD
const TARJETA_PAGO = "9200xxxxXXXXxxxx"; // Número de tarjeta para transferencias

let productos = JSON.parse(localStorage.getItem('portal_productos')) || [
  { id: 1, nombre: "Demon's Souls PS5", precio: 25, modalidad: "Cuenta Primaria", imagen: "https://via.placeholder.com/150" },
  { id: 2, nombre: "FIFA 24 PS5", precio: 30, modalidad: "Cuenta Secundaria", imagen: "https://via.placeholder.com/150" }
];

let carrito = [];

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  renderizarProductos();
  actualizarCarritoUI();
  
  // Escuchador para tipo de entrega (mostrar/ocultar dirección)
  const deliverySelect = document.getElementById('delivery-type');
  if (deliverySelect) {
    deliverySelect.addEventListener('change', (e) => {
      const addressBox = document.getElementById('address-container');
      if (addressBox) {
        addressBox.style.display = e.target.value === 'Domicilio' ? 'block' : 'none';
      }
    });
  }
});

// ==========================================================================
// RENDERIZADO DE PRODUCTOS
// ==========================================================================

function renderizarProductos() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  container.innerHTML = '';

  productos.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${prod.imagen}" alt="${prod.nombre}" class="product-img">
      <div class="product-info">
        <h4>${prod.nombre}</h4>
        <p class="product-mode">${prod.modalidad}</p>
        <p class="product-price">$${prod.precio} USD</p>
        <button class="btn-add" onclick="agregarAlCarrito(${prod.id})">Añadir a la Cesta</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// GESTIÓN DE LA CESTA DE COMPRA
// ==========================================================================

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  if (producto) {
    carrito.push(producto);
    actualizarCarritoUI();
  }
}

function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarritoUI();
}

function actualizarCarritoUI() {
  const listContainer = document.getElementById('cart-items');
  const totalUSDElement = document.getElementById('cart-total-usd');
  const badgeCount = document.getElementById('cart-badge');

  if (badgeCount) badgeCount.textContent = carrito.length;
  if (!listContainer) return;

  listContainer.innerHTML = '';
  let totalUSD = 0;

  carrito.forEach((item, idx) => {
    totalUSD += item.precio;
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.innerHTML = `
      <span><strong>${item.nombre}</strong> (${item.modalidad}) - $${item.precio} USD</span>
      <button onclick="eliminarDelCarrito(${idx})" class="btn-remove">❌</button>
    `;
    listContainer.appendChild(itemDiv);
  });

  if (totalUSDElement) {
    totalUSDElement.textContent = `$${totalUSD} USD`;
  }
}

// ==========================================================================
// ENVÍO DEL PEDIDO A WHATSAPP Y REGISTRO EN HISTORIAL LOCAL
// ==========================================================================

function sendWhatsAppOrder() {
  const nombre = document.getElementById('client-name').value;
  const telefono = document.getElementById('client-phone').value;
  const deliveryType = document.getElementById('delivery-type').value;
  const direccion = document.getElementById('client-address') ? document.getElementById('client-address').value : '';
  const metodoPago = document.getElementById('payment-method').value;

  if (carrito.length === 0) return alert("Tu cesta está vacía.");
  if (!nombre || !telefono) return alert("Por favor, completa tu nombre y teléfono de contacto.");
  
  if (deliveryType === 'Domicilio' && !direccion.trim()) {
    return alert("Por favor, ingresa la dirección para la entrega a domicilio.");
  }

  // Generar ID único de pedido y fecha
  const orderId = "ORD-" + Date.now().toString().slice(-6);
  const fecha = new Date().toLocaleString('es-ES');

  let totalUSD = 0;
  carrito.forEach(item => totalUSD += item.precio);

  // Guardar objeto del pedido en el almacenamiento local
  const nuevoPedido = {
    id: orderId,
    fecha: fecha,
    cliente: nombre,
    telefono: telefono,
    entrega: deliveryType,
    direccion: deliveryType === 'Domicilio' ? direccion : 'N/A',
    metodoPago: metodoPago,
    items: [...carrito],
    totalUSD: totalUSD,
    estado: 'pendiente'
  };

  let historial = JSON.parse(localStorage.getItem('portal_pedidos_historial')) || [];
  historial.unshift(nuevoPedido);
  localStorage.setItem('portal_pedidos_historial', JSON.stringify(historial));

  // Construcción del mensaje formateado para WhatsApp
  let mensaje = `🎮 *NUEVO PEDIDO (${orderId}) - PORTAL GAMESTUDIO*\n\n`;

  carrito.forEach(item => {
    mensaje += `▪️ *${item.nombre}*\n   Modalidad: ${item.modalidad} ($${item.precio} USD)\n`;
  });

  mensaje += `\n💰 *TOTAL EN USD:* $${totalUSD} USD`;

  if (metodoPago.includes('CUP')) {
    const totalCUP = totalUSD * TASA_CAMBIO_DEFAULT;
    mensaje += `\n💵 *TOTAL ESTIMADO (CUP):* ${totalCUP.toLocaleString()} CUP`;
  }

  mensaje += `\n💳 *Método de Pago:* ${metodoPago}`;

  if (metodoPago.includes("Transferencia")) {
    mensaje += `\n🏦 *Tarjeta para Transferencia:* \`${TARJETA_PAGO}\``;
  }

  mensaje += `\n\n👤 *DATOS DEL CLIENTE:*`;
  mensaje += `\n▪️ Nombre: ${nombre}`;
  mensaje += `\n▪️ Teléfono: ${telefono}`;
  mensaje += `\n🚚 *Tipo de Entrega:* ${deliveryType}`;

  if (deliveryType === 'Domicilio') {
    mensaje += `\n📍 *Dirección:* ${direccion}`;
  }

  mensaje += `\n\n¿Me confirman la disponibilidad para procesar la orden?`;

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

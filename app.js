// CONFIGURACIÓN PRINCIPAL DE PORTAL GAMESTUDIO
const TELEFONO_WHATSAPP = "5352890559"; 
const TARJETA_PAGO = "9205 9598 7962 9732"; 
const TASA_CAMBIO_DEFAULT = 675; // TASA DE CAMBIO INTERNA (CUP x 1 USD)

let productos = [];
let categorias = [];
let carrito = [];
let categoriaActual = 'todos';

// Función para limpiar acentos y caracteres especiales
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Cargar catálogo, categorías y Cesta guardada al iniciar
document.addEventListener('DOMContentLoaded', () => {
  cargarCarritoGuardado();

  fetch('productos.json')
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        productos = data;
      } else {
        productos = data.productos || [];
        categorias = data.categorias || [];
        if (categorias.length > 0) {
          renderCategoryButtons(categorias);
        }
      }
      renderProducts(productos);
    })
    .catch(err => console.error("Error al cargar productos.json:", err));
});

function renderCategoryButtons(listaCategorias) {
  const container = document.querySelector('.categories');
  if (!container) return;

  container.innerHTML = `<button class="cat-btn active" onclick="filterCategory('todos', this)">Todos</button>`;

  listaCategorias.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.innerText = cat.nombre;
    btn.onclick = (e) => filterCategory(cat.id, e.target);
    container.appendChild(btn);
  });
}

function renderProducts(lista) {
  const container = document.getElementById('product-grid');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (lista.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No hay productos disponibles en esta categoría.</p>';
    return;
  }

  const catObj = categorias.find(c => c.id === categoriaActual);
  const idCatNorm = normalizarTexto(categoriaActual);
  const nombreCatNorm = catObj ? normalizarTexto(catObj.nombre) : '';

  lista.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    let selectedIndex = 0;
    let opcionesHTML = '';

    if (p.opciones && p.opciones.length > 0) {
      if (categoriaActual !== 'todos') {
        const indexCoincidente = p.opciones.findIndex(opc => {
          const opcNorm = normalizarTexto(opc.nombre);
          return (
            (idCatNorm && opcNorm.includes(idCatNorm)) ||
            (nombreCatNorm && opcNorm.includes(nombreCatNorm))
          );
        });

        if (indexCoincidente !== -1) {
          selectedIndex = indexCoincidente;
        }
      }

      p.opciones.forEach((opc, idx) => {
        const isSelected = idx === selectedIndex ? 'selected' : '';
        opcionesHTML += `<option value="${idx}" ${isSelected}>${opc.nombre} - $${opc.precio} USD</option>`;
      });
    }

    const precioInicial = p.opciones && p.opciones.length > 0 ? p.opciones[selectedIndex].precio : 0;

    card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Portal+GamEstudio';">
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

function cargarCarritoGuardado() {
  const guardado = localStorage.getItem('portal_carrito');
  if (guardado) {
    try {
      carrito = JSON.parse(guardado);
      updateCartUI();
    } catch (e) {
      carrito = [];
    }
  }
}

function guardarCarrito() {
  localStorage.setItem('portal_carrito', JSON.stringify(carrito));
}

function addToCart(idProd) {
  const prod = productos.find(p => p.id === idProd);
  const selectIndex = document.getElementById(`select-opc-${idProd}`).value;
  const opcionSeleccionada = prod.opciones[selectIndex];

  const itemCarrito = {
    idCart: Date.now() + Math.random(),
    nombre: prod.nombre,
    modalidad: opcionSeleccionada.nombre,
    precio: opcionSeleccionada.precio
  };

  carrito.push(itemCarrito);
  guardarCarrito();
  updateCartUI();

  showToast(`¡<strong>${prod.nombre}</strong> (${opcionSeleccionada.nombre}) añadido a la cesta!`);
}

function removeFromCart(idCart) {
  carrito = carrito.filter(item => item.idCart !== idCart);
  guardarCarrito();
  updateCartUI();
}

function updateCartUI() {
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.innerText = carrito.length;

  const list = document.getElementById('cart-items');
  if (!list) return;

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
  
  const totalUsdEl = document.getElementById('cart-total-usd');
  if (totalUsdEl) totalUsdEl.innerText = totalUSD;
  
  calculateCUPTotal();
}

function showToast(mensaje) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `🛒 <span>${mensaje}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function toggleDeliveryAddress() {
  const deliveryType = document.getElementById('delivery-type').value;
  const addressGroup = document.getElementById('address-group');
  
  if (deliveryType === 'Domicilio') {
    addressGroup.style.display = 'block';
  } else {
    addressGroup.style.display = 'none';
  }
}

function toggleExchangeRateInput() {
  const metodo = document.getElementById('payment-method').value;
  const cupBox = document.getElementById('cup-conversion-box');

  if (metodo.includes('CUP')) {
    cupBox.style.display = 'block';
    calculateCUPTotal();
  } else {
    cupBox.style.display = 'none';
  }
}

function calculateCUPTotal() {
  const totalUsdEl = document.getElementById('cart-total-usd');
  const totalUSD = totalUsdEl ? parseFloat(totalUsdEl.innerText) || 0 : 0;
  const totalCUP = totalUSD * TASA_CAMBIO_DEFAULT;
  
  const totalCupEl = document.getElementById('cart-total-cup');
  if (totalCupEl) totalCupEl.innerText = totalCUP.toLocaleString();
}

function toggleCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function filterCategory(cat, element) {
  categoriaActual = cat;
  
  const buttons = document.querySelectorAll('.cat-btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  if (element) {
    element.classList.add('active');
  } else {
    buttons.forEach(b => {
      const onclickAttr = b.getAttribute('onclick');
      if (onclickAttr && onclickAttr.includes(`'${cat}'`)) {
        b.classList.add('active');
      }
    });
  }
  
  let filtrados = cat === 'todos' 
    ? productos 
    : productos.filter(p => {
        if (Array.isArray(p.categorias)) {
          return p.categorias.includes(cat);
        }
        return p.categoria === cat;
      });

  renderProducts(filtrados);
}

function filterProducts() {
  const text = normalizarTexto(document.getElementById('search-input').value);
  const filtrados = productos.filter(p => {
    const coincideNombre = normalizarTexto(p.nombre).includes(text);
    const perteneceCategoria = categoriaActual === 'todos' || (
      Array.isArray(p.categorias) ? p.categorias.includes(categoriaActual) : p.categoria === categoriaActual
    );
    return coincideNombre && perteneceCategoria;
  });

  renderProducts(filtrados);
}

function guardarPedidoEnHistorialLocal(nuevoPedido) {
  let pedidos = JSON.parse(localStorage.getItem('portal_pedidos') || '[]');
  pedidos.unshift(nuevoPedido);
  localStorage.setItem('portal_pedidos', JSON.stringify(pedidos));
}

function sendWhatsAppOrder() {
  const nombre = document.getElementById('client-name').value;
  const telefono = document.getElementById('client-phone').value;
  const deliveryType = document.getElementById('delivery-type').value;
  const direccion = document.getElementById('client-address').value;
  const metodoPago = document.getElementById('payment-method').value;

  if (carrito.length === 0) return alert("Tu cesta está vacía");
  if (!nombre || !telefono) return alert("Por favor, completa tu nombre y teléfono de contacto.");
  
  if (deliveryType === 'Domicilio' && !direccion.trim()) {
    return alert("Por favor, ingresa la dirección para la entrega a domicilio.");
  }

  let mensaje = `🎮 *NUEVO PEDIDO - PORTAL GAMESTUDIO*\n\n`;
  let totalUSD = 0;

  carrito.forEach(item => {
    mensaje += `▪️ *${item.nombre}*\n   Modalidad: ${item.modalidad} ($${item.precio} USD)\n`;
    totalUSD += item.precio;
  });

  mensaje += `\n💰 *TOTAL EN USD:* $${totalUSD} USD`;

  if (metodoPago.includes('CUP')) {
    const totalCUP = totalUSD * TASA_CAMBIO_DEFAULT;
    mensaje += `\n💵 *TOTAL A PAGAR (CUP):* ${totalCUP.toLocaleString()} CUP`;
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

  const nuevoPedido = {
    id: 'PED-' + Date.now(),
    fecha: new Date().toISOString(),
    cliente: nombre,
    telefono: telefono,
    entrega: deliveryType,
    direccion: direccion,
    metodoPago: metodoPago,
    totalUSD: totalUSD,
    estado: 'pendiente',
    items: [...carrito]
  };

  guardarPedidoEnHistorialLocal(nuevoPedido);

  carrito = [];
  guardarCarrito();
  updateCartUI();
  toggleCart();

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

/* ==========================================================================
   PORTAL GAMESTUDIO - APP.JS
   ========================================================================== */

// Estado global de la aplicación
let productos = [];
let categorias = [];
let cart = JSON.parse(localStorage.getItem('portal_cart')) || [];
let currentCategory = 'todos';

// Configuración de tasas de cambio por defecto
const TASAS_CAMBIO = {
  USD: 1,
  MLC: 1,
  CUP: 320 // Puedes ajustar este valor predeterminado o leerlo de localStorage
};

document.addEventListener('DOMContentLoaded', () => {
  cargarCatalogo();
  actualizarContadorCarrito();
});

/* --------------------------------------------------------------------------
   1. CARGA DE DATOS Y RENDERING
   -------------------------------------------------------------------------- */

async function cargarCatalogo() {
  try {
    const res = await fetch('productos.json');
    if (!res.ok) throw new Error("No se pudo cargar el archivo productos.json");
    
    const data = await res.json();

    if (Array.isArray(data)) {
      productos = data;
    } else {
      productos = data.productos || [];
      categorias = data.categorias || [];
    }

    renderCategoriasNav();
    renderProductos(productos);
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
    const container = document.getElementById('grid-productos');
    if (container) {
      container.innerHTML = `<p style="color: var(--danger-color); text-align: center;">Error al cargar los productos. Asegúrate de estar ejecutando un servidor local o tener el JSON disponible.</p>`;
    }
  }
}

function renderCategoriasNav() {
  const navContainer = document.getElementById('nav-categorias');
  if (!navContainer || categorias.length === 0) return;

  // Botón "Todos"
  let html = `<button class="btn-filter active" onclick="filtrarCategoria('todos', this)">Todos</button>`;

  categorias.forEach(cat => {
    html += `<button class="btn-filter" onclick="filtrarCategoria('${cat.id}', this)">${cat.nombre}</button>`;
  });

  navContainer.innerHTML = html;
}

function renderProductos(lista) {
  const container = document.getElementById('grid-productos');
  if (!container) return;

  container.innerHTML = '';

  if (lista.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">No se encontraron productos en esta sección.</p>`;
    return;
  }

  lista.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Generar badges de categorías
    const catsArray = Array.isArray(prod.categorias) ? prod.categorias : [prod.categoria || 'general'];
    const badgesHTML = catsArray.map(c => `<span class="badge">${c}</span>`).join(' ');

    // Selector de opciones/precios (siempre refleja precio en USD)
    let opcionesHTML = '';
    if (prod.opciones && prod.opciones.length > 0) {
      opcionesHTML = `
        <select id="opc-select-${prod.id}" class="select-opcion">
          ${prod.opciones.map((opc, index) => `<option value="${index}">$${opc.precio.toFixed(2)} USD - ${opc.nombre}</option>`).join('')}
        </select>
      `;
    } else {
      opcionesHTML = `<p style="font-weight: bold; margin: 10px 0;">$0.00 USD</p>`;
    }

    card.innerHTML = `
      <img src="${prod.imagen}" alt="${prod.nombre}" onerror="this.src='https://via.placeholder.com/300x200?text=Portal+GamEstudio';">
      <div class="product-info">
        <div>${badgesHTML}</div>
        <h3>${prod.nombre}</h3>
        ${opcionesHTML}
        <button class="btn-whatsapp" style="width:100%; margin-top:10px;" onclick="agregarAlCarrito(${prod.id})">🛒 Añadir a la Cesta</button>
      </div>
    `;

    container.appendChild(card);
  });
}

/* --------------------------------------------------------------------------
   2. FILTROS Y BÚSQUEDA
   -------------------------------------------------------------------------- */

function filtrarCategoria(catId, btnElement) {
  currentCategory = catId;

  // Actualizar estado visual de botones de filtro
  if (btnElement) {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
  }

  ejecutarFiltros();
}

function filtrarProductos() {
  ejecutarFiltros();
}

function ejecutarFiltros() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtrados = productos.filter(p => {
    // Filtro por categoría
    const catsArray = Array.isArray(p.categorias) ? p.categorias : [p.categoria || ''];
    const coincideCat = (currentCategory === 'todos') || catsArray.includes(currentCategory);

    // Filtro por texto de búsqueda
    const coincideTexto = p.nombre.toLowerCase().includes(query);

    return coincideCat && coincideTexto;
  });

  renderProductos(filtrados);
}

/* --------------------------------------------------------------------------
   3. GESTIÓN DE LA CESTA DE COMPRAS
   -------------------------------------------------------------------------- */

function agregarAlCarrito(productId) {
  const prod = productos.find(p => p.id === productId);
  if (!prod) return;

  const selectEl = document.getElementById(`opc-select-${productId}`);
  let opcionSeleccionada = { nombre: 'Estándar', precio: 0 };

  if (selectEl && prod.opciones && prod.opciones[selectEl.value]) {
    opcionSeleccionada = prod.opciones[selectEl.value];
  }

  // Buscar si ya existe en la cesta un item idéntico con la misma opción
  const itemExistente = cart.find(item => item.id === productId && item.opcionNombre === opcionSeleccionada.nombre);

  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    cart.push({
      id: prod.id,
      nombre: prod.nombre,
      imagen: prod.imagen,
      opcionNombre: opcionSeleccionada.nombre,
      precio: opcionSeleccionada.precio, // Precio base siempre en USD
      cantidad: 1
    });
  }

  guardarCarrito();
  actualizarContadorCarrito();
  showToast(`"${prod.nombre}" añadido a la cesta.`);
}

function cambiarCantidad(index, delta) {
  if (!cart[index]) return;

  cart[index].cantidad += delta;

  if (cart[index].cantidad <= 0) {
    cart.splice(index, 1);
  }

  guardarCarrito();
  renderCartModal();
  actualizarContadorCarrito();
}

function eliminarDelCarrito(index) {
  if (!cart[index]) return;
  cart.splice(index, 1);
  
  guardarCarrito();
  renderCartModal();
  actualizarContadorCarrito();
}

function vaciarCesta() {
  cart = [];
  guardarCarrito();
  actualizarContadorCarrito();
  renderCartModal();
}

function guardarCarrito() {
  localStorage.setItem('portal_cart', JSON.stringify(cart));
}

function actualizarContadorCarrito() {
  const badgeCount = document.getElementById('cart-count');
  if (!badgeCount) return;

  const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);
  badgeCount.innerText = totalItems;
  badgeCount.style.display = totalItems > 0 ? 'inline-block' : 'none';
}

/* --------------------------------------------------------------------------
   4. MODAL DEL CARRITO Y CONVERSIÓN DE MONEDA AL CHECKOUT
   -------------------------------------------------------------------------- */

function abrirModalCarrito() {
  const modal = document.getElementById('cart-modal');
  if (!modal) return;

  renderCartModal();
  modal.style.display = 'flex';
}

function cerrarModalCarrito() {
  const modal = document.getElementById('cart-modal');
  if (modal) modal.style.display = 'none';
}

function renderCartModal() {
  const container = document.getElementById('cart-items-container');
  const totalUSDContainer = document.getElementById('cart-total-usd');
  const totalConvertidoContainer = document.getElementById('cart-total-convertido');
  const currencySelect = document.getElementById('cart-currency-select');

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 20px;">Tu cesta está vacía.</p>`;
    if (totalUSDContainer) totalUSDContainer.innerText = "$0.00 USD";
    if (totalConvertidoContainer) totalConvertidoContainer.innerText = "0.00";
    return;
  }

  container.innerHTML = '';
  let totalUSD = 0;

  cart.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    totalUSD += subtotal;

    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);';

    row.innerHTML = `
      <img src="${item.imagen}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://via.placeholder.com/45';">
      <div style="flex: 1;">
        <h4 style="margin: 0; font-size: 0.9rem;">${item.nombre}</h4>
        <small style="color: var(--text-muted);">${item.opcionNombre} - $${item.precio.toFixed(2)} USD c/u</small>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="btn-small" onclick="cambiarCantidad(${index}, -1)">-</button>
        <span style="font-weight: bold; min-width: 20px; text-align: center;">${item.cantidad}</span>
        <button class="btn-small" onclick="cambiarCantidad(${index}, 1)">+</button>
      </div>
      <strong style="min-width: 65px; text-align: right;">$${subtotal.toFixed(2)}</strong>
      <button onclick="eliminarDelCarrito(${index})" style="background: none; border: none; color: var(--danger-color); cursor: pointer; font-size: 1.1rem; margin-left: 5px;">🗑️</button>
    `;

    container.appendChild(row);
  });

  if (totalUSDContainer) {
    totalUSDContainer.innerText = `$${totalUSD.toFixed(2)} USD`;
  }

  calcularTotalConvertido(totalUSD);
}

function calcularTotalConvertido(totalUSDInput) {
  let totalUSD = totalUSDInput;
  
  if (totalUSD === undefined) {
    totalUSD = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }

  const currencySelect = document.getElementById('cart-currency-select');
  const totalConvertidoContainer = document.getElementById('cart-total-convertido');
  if (!currencySelect || !totalConvertidoContainer) return;

  const moneda = currencySelect.value;
  let tasa = TASAS_CAMBIO[moneda] || 1;

  if (moneda === 'CUP') {
    const tasaGuardada = parseFloat(localStorage.getItem('tasa_cup'));
    if (!isNaN(tasaGuardada) && tasaGuardada > 0) {
      tasa = tasaGuardada;
    }
  }

  const totalCalculado = totalUSD * tasa;
  totalConvertidoContainer.innerText = `${totalCalculado.toFixed(2)} ${moneda}`;
}

/* --------------------------------------------------------------------------
   5. ENVÍO POR WHATSAPP Y LIMPIEZA DE CESTA
   -------------------------------------------------------------------------- */

function enviarPedidoWhatsApp() {
  if (cart.length === 0) {
    alert("La cesta está vacía.");
    return;
  }

  // 1. Moneda elegida en la cesta para la conversión
  const currencySelect = document.getElementById('cart-currency-select');
  const selectedCurrency = currencySelect ? currencySelect.value : 'USD';
  
  let tasa = TASAS_CAMBIO[selectedCurrency] || 1;
  if (selectedCurrency === 'CUP') {
    const tasaGuardada = parseFloat(localStorage.getItem('tasa_cup'));
    if (!isNaN(tasaGuardada) && tasaGuardada > 0) {
      tasa = tasaGuardada;
    }
  }

  // 2. Construcción del mensaje para WhatsApp
  let mensaje = "¡Hola! Quisiera realizar el siguiente pedido en Portal GamEstudio:\n\n";
  let totalUSD = 0;

  cart.forEach((item, index) => {
    const subtotalUSD = item.precio * item.cantidad;
    totalUSD += subtotalUSD;

    mensaje += `${index + 1}. *${item.nombre}*\n`;
    mensaje += `   - Opción: ${item.opcionNombre}\n`;
    mensaje += `   - Cantidad: ${item.cantidad}\n`;
    mensaje += `   - Precio unitario: $${item.precio.toFixed(2)} USD\n`;
    mensaje += `   - Subtotal: $${subtotalUSD.toFixed(2)} USD\n\n`;
  });

  const totalFinalConvertido = totalUSD * tasa;

  mensaje += `---------------------------\n`;
  mensaje += `*TOTAL BASE:* $${totalUSD.toFixed(2)} USD\n`;
  if (selectedCurrency !== 'USD') {
    mensaje += `*TOTAL A PAGAR (${selectedCurrency}):* ${totalFinalConvertido.toFixed(2)} ${selectedCurrency}\n`;
  }
  mensaje += `---------------------------\n\n`;
  mensaje += "Quedo a la espera de sus datos para concretar el pago y la transferencia. ¡Muchas gracias!";

  // 3. Teléfono destino
  const numeroTelefono = "5350000000"; // Sustituir por tu número real con código de país sin +

  // 4. Abrir la URL de WhatsApp
  const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  // 5. LIMPIAR LA CESTA Y CERRAR EL MODAL
  vaciarCesta();
  cerrarModalCarrito();
  showToast("¡Pedido enviado! La cesta se ha limpiado.");
}

/* --------------------------------------------------------------------------
   6. NOTIFICACIONES TOAST
   -------------------------------------------------------------------------- */

function showToast(mensaje) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `🛒 <span>${mensaje}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

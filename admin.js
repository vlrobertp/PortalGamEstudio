// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  cargarProductosAdminUI();
  cargarPedidosUI();
});

function showToast(mensaje) {
  const toast = document.getElementById('toast-msg');
  if (toast) {
    toast.textContent = mensaje;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// ==========================================================================
// GESTIÓN DEL INVENTARIO DE PRODUCTOS
// ==========================================================================

function obtenerProductos() {
  return JSON.parse(localStorage.getItem('portal_productos')) || [];
}

function guardarProductos(productos) {
  localStorage.setItem('portal_productos', JSON.stringify(productos));
}

function cargarProductosAdminUI() {
  const tbody = document.getElementById('admin-productos-list');
  if (!tbody) return;

  const productos = obtenerProductos();
  tbody.innerHTML = '';

  productos.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.nombre}</strong></td>
      <td>${p.modalidad}</td>
      <td>$${p.precio} USD</td>
      <td>
        <button class="btn-small" style="background:#ff4757; color:#fff; border:none;" onclick="eliminarProducto(${p.id})">🗑️ Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function agregarNuevoProductoModal() {
  const nombre = prompt("Nombre del videojuego o servicio:");
  if (!nombre) return;

  const modalidad = prompt("Modalidad (Ej: Cuenta Primaria, Cuenta Secundaria, Código):", "Cuenta Primaria");
  if (!modalidad) return;

  const precioStr = prompt("Precio en USD ($):");
  const precio = parseFloat(precioStr);
  if (isNaN(precio)) return alert("Precio no válido.");

  let productos = obtenerProductos();
  const nuevoProducto = {
    id: Date.now(),
    nombre: nombre,
    modalidad: modalidad,
    precio: precio,
    imagen: "https://via.placeholder.com/150"
  };

  productos.push(nuevoProducto);
  guardarProductos(productos);
  cargarProductosAdminUI();
  showToast("Producto agregado correctamente.");
}

function eliminarProducto(id) {
  if (!confirm("¿Deseas eliminar este producto del catálogo?")) return;

  let productos = obtenerProductos();
  productos = productos.filter(p => p.id !== id);
  guardarProductos(productos);
  cargarProductosAdminUI();
  showToast("Producto eliminado.");
}

// ==========================================================================
// GESTIÓN DEL HISTORIAL DE PEDIDOS
// ==========================================================================

function obtenerPedidos() {
  return JSON.parse(localStorage.getItem('portal_pedidos_historial')) || [];
}

function guardarPedidos(pedidos) {
  localStorage.setItem('portal_pedidos_historial', JSON.stringify(pedidos));
}

function cargarPedidosUI() {
  const tbody = document.getElementById('admin-pedidos-list');
  if (!tbody) return;

  const pedidos = obtenerPedidos();
  tbody.innerHTML = '';

  if (pedidos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay pedidos registrados en la base local.</td></tr>`;
    return;
  }

  pedidos.forEach(p => {
    const itemsHTML = p.items.map(item => `• ${item.nombre} <small>(${item.modalidad})</small>`).join('<br>');
    
    // Colores indicadores por estado
    let badgeColor = '#ffb703'; // pendiente (amarillo)
    if (p.estado === 'pagado') badgeColor = '#00b4d8'; // pagado (azul)
    if (p.estado === 'completado') badgeColor = '#00ff88'; // completado (verde)

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${p.id}</strong><br>
        <small style="color:var(--text-muted);">${p.fecha}</small>
      </td>
      <td>
        <strong>${p.cliente}</strong><br>
        <small style="color:var(--text-muted);">${p.telefono}</small><br>
        <small>🚚 ${p.entrega}</small>
      </td>
      <td>${itemsHTML}</td>
      <td><strong>$${p.totalUSD} USD</strong><br><small style="color:var(--text-muted);">${p.metodoPago}</small></td>
      <td>
        <select onchange="cambiarEstadoPedido('${p.id}', this.value)" style="padding: 4px; border-radius: 4px; background: var(--bg-primary); color: ${badgeColor}; border: 1px solid ${badgeColor}; font-weight: bold;">
          <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
          <option value="pagado" ${p.estado === 'pagado' ? 'selected' : ''}>💳 Pagado</option>
          <option value="completado" ${p.estado === 'completado' ? 'selected' : ''}>✅ Completado</option>
        </select>
      </td>
      <td>
        <button class="btn-small" style="background:#ffb703; color:#000; border:none; margin-bottom: 2px;" onclick="editarPedidoModal('${p.id}')">✏️</button>
        <button class="btn-small" style="background:#ff4757; color:#fff; border:none;" onclick="eliminarPedido('${p.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function cambiarEstadoPedido(orderId, nuevoEstado) {
  let pedidos = obtenerPedidos();
  const idx = pedidos.findIndex(p => p.id === orderId);
  if (idx !== -1) {
    pedidos[idx].estado = nuevoEstado;
    guardarPedidos(pedidos);
    cargarPedidosUI();
    showToast(`Pedido ${orderId} actualizado a "${nuevoEstado}".`);
  }
}

function editarPedidoModal(orderId) {
  let pedidos = obtenerPedidos();
  const p = pedidos.find(item => item.id === orderId);
  if (!p) return;

  const nuevoNombre = prompt("Editar nombre del cliente:", p.cliente);
  if (nuevoNombre === null) return;

  const nuevoTelefono = prompt("Editar teléfono de contacto:", p.telefono);
  if (nuevoTelefono === null) return;

  p.cliente = nuevoNombre.trim() || p.cliente;
  p.telefono = nuevoTelefono.trim() || p.telefono;

  guardarPedidos(pedidos);
  cargarPedidosUI();
  showToast("Datos del pedido actualizados.");
}

function eliminarPedido(orderId) {
  if (!confirm(`¿Deseas eliminar permanentemente el pedido ${orderId}?`)) return;

  let pedidos = obtenerPedidos();
  pedidos = pedidos.filter(p => p.id !== orderId);
  guardarPedidos(pedidos);
  cargarPedidosUI();
  showToast("Pedido eliminado del historial.");
}

function exportarPedidosJSON() {
  const pedidos = obtenerPedidos();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pedidos, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `pedidos_portal_gamestudio_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

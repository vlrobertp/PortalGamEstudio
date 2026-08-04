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
// INVENTARIO DE PRODUCTOS
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
// HISTORIAL DE PEDIDOS
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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay pedidos en el historial.</td></tr>`;
    calcularEstadisticas([]);
    return;
  }

  pedidos.forEach(p => {
    const itemsHTML = p.items.map(i => `• ${i.nombre} <small>(${i.modalidad})</small>`).join('<br>');
    const fechaFormatted = new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });

    let colorEstado = '#ffb703'; // Pendiente
    if (p.estado === 'pagado') colorEstado = '#00b4d8';
    if (p.estado === 'completado') colorEstado = '#00ff88';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.id}</strong><br><small style="color:var(--text-muted);">${fechaFormatted}</small></td>
      <td><strong>${p.cliente}</strong><br><small style="color:var(--text-muted);">${p.telefono}</small></td>
      <td>${itemsHTML}</td>
      <td><strong>$${p.totalUSD} USD</strong><br><small style="color:var(--text-muted);">${p.metodoPago}</small></td>
      <td>
        <select onchange="cambiarEstadoPedido('${p.id}', this.value)" style="padding: 4px; border-radius: 4px; background: var(--bg-primary); color: ${colorEstado}; border: 1px solid ${colorEstado}; font-weight: bold;">
          <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
          <option value="pagado" ${p.estado === 'pagado' ? 'selected' : ''}>💳 Pagado</option>
          <option value="completado" ${p.estado === 'completado' ? 'selected' : ''}>✅ Completado</option>
        </select>
      </td>
      <td>
        <button class="btn-small" style="background:#ffb703; color:#000; border:none;" onclick="editarPedido('${p.id}')">✏️</button>
        <button class="btn-small" style="background:#ff4757; color:#fff; border:none;" onclick="eliminarPedido('${p.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  calcularEstadisticas(pedidos);
}

function cambiarEstadoPedido(orderId, nuevoEstado) {
  let pedidos = obtenerPedidos();
  const idx = pedidos.findIndex(p => p.id === orderId);
  if (idx !== -1) {
    pedidos[idx].estado = nuevoEstado;
    guardarPedidos(pedidos);
    cargarPedidosUI();
    showToast(`Pedido ${orderId} actualizado.`);
  }
}

function editarPedido(orderId) {
  let pedidos = obtenerPedidos();
  const p = pedidos.find(item => item.id === orderId);
  if (!p) return;

  const nuevoNombre = prompt("Nombre del cliente:", p.cliente);
  const nuevoTel = prompt("Teléfono del cliente:", p.telefono);

  if (nuevoNombre !== null) p.cliente = nuevoNombre.trim();
  if (nuevoTel !== null) p.telefono = nuevoTel.trim();

  guardarPedidos(pedidos);
  cargarPedidosUI();
  showToast("Pedido modificado.");
}

function eliminarPedido(orderId) {
  if (!confirm(`¿Eliminar pedido ${orderId}?`)) return;
  let pedidos = obtenerPedidos();
  pedidos = pedidos.filter(p => p.id !== orderId);
  guardarPedidos(pedidos);
  cargarPedidosUI();
  showToast("Pedido eliminado.");
}

// ==========================================================================
// CÁLCULO DE ESTADÍSTICAS (Semanal, Mensual y Anual)
// ==========================================================================

function calcularEstadisticas(pedidos) {
  const ahora = new Date();
  
  // Inicio semana (Lunes)
  const inicioSemana = new Date(ahora);
  const diaSemana = ahora.getDay() || 7; 
  inicioSemana.setDate(ahora.getDate() - diaSemana + 1);
  inicioSemana.setHours(0, 0, 0, 0);

  // Inicio mes
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  // Inicio año
  const inicioAnio = new Date(ahora.getFullYear(), 0, 1);

  let totalSemana = 0, cantSemana = 0;
  let totalMes = 0, cantMes = 0;
  let totalAnio = 0, cantAnio = 0;

  pedidos.forEach(p => {
    // Suma solo las ventas efectivamente cobradas/completadas
    if (p.estado === 'pagado' || p.estado === 'completado') {
      const fechaPedido = new Date(p.fecha);

      if (fechaPedido >= inicioSemana) {
        totalSemana += p.totalUSD;
        cantSemana++;
      }
      if (fechaPedido >= inicioMes) {
        totalMes += p.totalUSD;
        cantMes++;
      }
      if (fechaPedido >= inicioAnio) {
        totalAnio += p.totalUSD;
        cantAnio++;
      }
    }
  });

  document.getElementById('stat-semana').textContent = `$${totalSemana} USD`;
  document.getElementById('stat-semana-cant').textContent = `${cantSemana} pedido(s) cobrado(s)`;

  document.getElementById('stat-mes').textContent = `$${totalMes} USD`;
  document.getElementById('stat-mes-cant').textContent = `${cantMes} pedido(s) cobrado(s)`;

  document.getElementById('stat-anio').textContent = `$${totalAnio} USD`;
  document.getElementById('stat-anio-cant').textContent = `${cantAnio} pedido(s) cobrado(s)`;
}

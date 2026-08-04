let productosAdmin = [];
let categoriasAdmin = [
  { id: "ps5", nombre: "PS5" },
  { id: "ps4", nombre: "PS4" },
  { id: "xbox", nombre: "Xbox" },
  { id: "pirateria_ps5", nombre: "Piratería PS5" },
  { id: "pirateria_ps4", nombre: "Piratería PS4" },
  { id: "perifericos", nombre: "Accesorios / Discos" },
  { id: "servicios", nombre: "Servicios Técnicos" }
];

let ghConfig = { user: '', repo: '', token: '' };
let pedidosAdmin = [];

document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracion();
  cargarProductosDesdeJSON();
  cargarPedidos();
  addOpcionRow("Permanente", 20);
});

// --- MÓDULO DE PEDIDOS Y ESTADÍSTICAS ---

function cargarPedidos() {
  pedidosAdmin = JSON.parse(localStorage.getItem('portal_pedidos') || '[]');
  renderPedidosTable(pedidosAdmin);
  calcularEstadisticas();
}

function guardarPedidosLocal() {
  localStorage.setItem('portal_pedidos', JSON.stringify(pedidosAdmin));
  renderPedidosTable(pedidosAdmin);
  calcularEstadisticas();
}

function renderPedidosTable(lista = pedidosAdmin) {
  const tbody = document.getElementById('orders-list');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 15px;">No hay pedidos registrados.</td></tr>`;
    return;
  }

  lista.forEach(p => {
    const fechaFormatted = new Date(p.fecha).toLocaleDateString() + ' ' + new Date(p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const itemsResumen = p.items ? p.items.map(i => `${i.nombre} (${i.modalidad})`).join('<br>') : 'Sin ítems';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${p.id}</strong><br><small style="color:var(--text-muted);">${fechaFormatted}</small></td>
      <td><strong>${p.cliente}</strong><br><small>${p.telefono}</small></td>
      <td><small>${itemsResumen}</small></td>
      <td><strong>$${p.totalUSD} USD</strong></td>
      <td>
        <select onchange="cambiarEstadoPedido('${p.id}', this.value)" class="status-badge status-${p.estado}">
          <option value="pendiente" ${p.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="pagado" ${p.estado === 'pagado' ? 'selected' : ''}>Pagado</option>
          <option value="completado" ${p.estado === 'completado' ? 'selected' : ''}>Completado</option>
        </select>
      </td>
      <td>
        <button class="btn-edit" onclick="editarPedido('${p.id}')">✏️</button>
        <button class="btn-delete" onclick="eliminarPedido('${p.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function cambiarEstadoPedido(id, nuevoEstado) {
  const idx = pedidosAdmin.findIndex(p => p.id === id);
  if (idx !== -1) {
    pedidosAdmin[idx].estado = nuevoEstado;
    guardarPedidosLocal();
    showToast(`Estado del pedido ${id} cambiado a: ${nuevoEstado}`);
  }
}

function editarPedido(id) {
  const p = pedidosAdmin.find(item => item.id === id);
  if (!p) return;

  const nuevoNombre = prompt("Editar nombre del cliente:", p.cliente);
  if (nuevoNombre === null) return;

  const nuevoTotal = prompt("Editar monto total ($ USD):", p.totalUSD);
  if (nuevoTotal === null) return;

  p.cliente = nuevoNombre.trim() || p.cliente;
  p.totalUSD = parseFloat(nuevoTotal) || p.totalUSD;

  guardarPedidosLocal();
  showToast("Pedido actualizado.");
}

function eliminarPedido(id) {
  if (!confirm(`¿Estás seguro de eliminar el pedido ${id}?`)) return;
  pedidosAdmin = pedidosAdmin.filter(p => p.id !== id);
  guardarPedidosLocal();
  showToast("Pedido eliminado.");
}

function filtrarPedidos() {
  const query = document.getElementById('order-search-input').value.toLowerCase().trim();
  const estadoFiltro = document.getElementById('order-filter-status').value;

  const filtrados = pedidosAdmin.filter(p => {
    const coincideCliente = p.cliente.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
    const coincideEstado = estadoFiltro === 'todos' || p.estado === estadoFiltro;
    return coincideCliente && coincideEstado;
  });

  renderPedidosTable(filtrados);
}

function calcularEstadisticas() {
  const ahora = new Date();
  
  // Rango de la semana actual (de Lunes a Domingo)
  const inicioSemana = new Date(ahora);
  const diaSemana = inicioSemana.getDay() || 7; 
  inicioSemana.setDate(inicioSemana.getDate() - diaSemana + 1);
  inicioSemana.setHours(0,0,0,0);

  let totalSemana = 0, countSemana = 0;
  let totalMes = 0, countMes = 0;
  let totalAnio = 0, countAnio = 0;

  pedidosAdmin.forEach(p => {
    // Solo computan para las estadísticas los pedidos completados o pagados
    if (p.estado === 'completado' || p.estado === 'pagado') {
      const f = new Date(p.fecha);

      // Anual
      if (f.getFullYear() === ahora.getFullYear()) {
        totalAnio += p.totalUSD;
        countAnio++;

        // Mensual
        if (f.getMonth() === ahora.getMonth()) {
          totalMes += p.totalUSD;
          countMes++;
        }

        // Semanal
        if (f >= inicioSemana) {
          totalSemana += p.totalUSD;
          countSemana++;
        }
      }
    }
  });

  document.getElementById('stat-semana').innerText = `$${totalSemana.toFixed(2)} USD`;
  document.getElementById('stat-count-semana').innerText = `${countSemana} pedidos procesados`;

  document.getElementById('stat-mes').innerText = `$${totalMes.toFixed(2)} USD`;
  document.getElementById('stat-count-mes').innerText = `${countMes} pedidos procesados`;

  document.getElementById('stat-anio').innerText = `$${totalAnio.toFixed(2)} USD`;
  document.getElementById('stat-count-anio').innerText = `${countAnio} pedidos procesados`;
}

// --- CONFIGURACIÓN Y CATÁLOGO GITHUB ---

function guardarConfiguracion() {
  let userRaw = document.getElementById('gh-user').value.trim();
  ghConfig.user = userRaw.startsWith('@') ? userRaw.substring(1) : userRaw;
  ghConfig.repo = document.getElementById('gh-repo').value.trim();
  ghConfig.token = document.getElementById('gh-token').value.trim();

  document.getElementById('gh-user').value = ghConfig.user;
  localStorage.setItem('portal_gh_config', JSON.stringify(ghConfig));
  
  const statusEl = document.getElementById('config-status');
  statusEl.innerText = "✅ Configuración guardada";
  statusEl.style.color = "#00ff88";
}

function cargarConfiguracion() {
  const saved = localStorage.getItem('portal_gh_config');
  if (saved) {
    ghConfig = JSON.parse(saved);
    if (ghConfig.user && ghConfig.user.startsWith('@')) {
      ghConfig.user = ghConfig.user.substring(1);
    }
    document.getElementById('gh-user').value = ghConfig.user || '';
    document.getElementById('gh-repo').value = ghConfig.repo || '';
    document.getElementById('gh-token').value = ghConfig.token || '';
  }
}

function cargarProductosDesdeJSON() {
  fetch('productos.json')
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        productosAdmin = data;
      } else {
        productosAdmin = data.productos || [];
        if (data.categorias && data.categorias.length > 0) {
          categoriasAdmin = data.categorias;
        }
      }
      renderCategoriasUI();
      renderAdminTable(productosAdmin);
    })
    .catch(err => console.error("Error al cargar productos.json:", err));
}

function renderCategoriasUI() {
  const tagContainer = document.getElementById('categorias-tag-list');
  if (tagContainer) {
    tagContainer.innerHTML = '';
    categoriasAdmin.forEach(cat => {
      const tag = document.createElement('span');
      tag.style.cssText = 'background: var(--bg-primary); border: 1px solid var(--border-color); padding: 5px 12px; border-radius: 15px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;';
      tag.innerHTML = `
        <strong>${cat.nombre}</strong> <small style="color:var(--text-muted);">(${cat.id})</small>
        <button onclick="eliminarCategoria('${cat.id}')" style="background:none; border:none; color:var(--danger-color); cursor:pointer; font-weight:bold; font-size:1rem; margin-left:4px;">×</button>
      `;
      tagContainer.appendChild(tag);
    });
  }

  const checkContainer = document.getElementById('categories-checkbox-container');
  if (checkContainer) {
    checkContainer.innerHTML = '';
    categoriasAdmin.forEach(cat => {
      const label = document.createElement('label');
      label.style.cssText = 'display: inline-flex; align-items: center; gap: 5px; font-size: 0.85rem; cursor: pointer; background: var(--bg-card); padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border-color);';
      label.innerHTML = `
        <input type="checkbox" name="prod-cat-check" value="${cat.id}">
        ${cat.nombre}
      `;
      checkContainer.appendChild(label);
    });
  }
}

function renderAdminTable(lista = productosAdmin) {
  const tbody = document.getElementById('admin-product-list');
  tbody.innerHTML = '';

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 15px;">No se encontraron productos.</td></tr>`;
    return;
  }

  lista.forEach(p => {
    const catsArray = Array.isArray(p.categorias) ? p.categorias : [p.categoria || 'sin_categoria'];
    const badgesHTML = catsArray.map(c => `<span class="badge" style="background:#333; padding:2px 6px; border-radius:4px; font-size:0.8rem; margin-right:4px;">${c}</span>`).join(' ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.imagen}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;" onerror="this.src='https://via.placeholder.com/40';"></td>
      <td><strong>${p.nombre}</strong></td>
      <td>${badgesHTML}</td>
      <td>
        <button class="btn-edit" onclick="editarProducto(${p.id})">✏️</button>
        <button class="btn-delete" onclick="eliminarProducto(${p.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarTablaAdmin() {
  const query = document.getElementById('admin-search-input').value.toLowerCase().trim();
  
  const filtrados = productosAdmin.filter(p => {
    const coincideNombre = p.nombre.toLowerCase().includes(query);
    const catsArray = Array.isArray(p.categorias) ? p.categorias : [p.categoria || ''];
    const coincideCategoria = catsArray.some(c => c.toLowerCase().includes(query));
    
    return coincideNombre || coincideCategoria;
  });

  renderAdminTable(filtrados);
}

function addOpcionRow(nombre = '', precio = '') {
  const container = document.getElementById('opciones-container');
  const div = document.createElement('div');
  div.className = 'opcion-row';
  div.style.cssText = 'display:flex; gap:10px; margin-bottom:8px;';
  div.innerHTML = `
    <input type="text" placeholder="Ej: Perdible / Cuenta" value="${nombre}" class="opc-nombre" required>
    <input type="number" placeholder="Precio ($ USD)" value="${precio}" class="opc-precio" style="width: 120px;" required>
    <button type="button" style="background:#ff4757; color:#fff; border:none; width:auto; padding:0 12px; cursor:pointer; border-radius:4px;" onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(div);
}

async function guardarProducto() {
  if (ghConfig.user.startsWith('@')) {
    ghConfig.user = ghConfig.user.substring(1);
  }

  if (!ghConfig.token || !ghConfig.user || !ghConfig.repo) {
    alert("Por favor, completa y guarda primero los datos de configuración de GitHub.");
    return;
  }

  const idEdit = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-nombre').value;
  const fileInput = document.getElementById('prod-file');

  const checkboxes = document.querySelectorAll('input[name="prod-cat-check"]:checked');
  let categoriasSeleccionadas = Array.from(checkboxes).map(cb => cb.value);

  if (categoriasSeleccionadas.length === 0) {
    alert("Debes seleccionar al menos una categoría para el producto.");
    return;
  }
  
  const opcNombres = document.querySelectorAll('.opc-nombre');
  const opcPrecios = document.querySelectorAll('.opc-precio');
  let opciones = [];
  
  opcNombres.forEach((input, i) => {
    opciones.push({
      nombre: input.value,
      precio: parseFloat(opcPrecios[i].value) || 0
    });
  });

  const btnSubmit = document.getElementById('btn-submit');
  btnSubmit.disabled = true;
  btnSubmit.innerText = "⏳ Subiendo a GitHub...";

  try {
    let rutaImagen = "./imagenes/placeholder.jpg";

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const cleanFileName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '_');
      const fileName = `${Date.now()}_${cleanFileName}`;
      rutaImagen = `./imagenes/${fileName}`;

      showToast("Subiendo imagen...");
      await uploadFileToGitHub(`imagenes/${fileName}`, file);
    } else if (idEdit) {
      const prodExistente = productosAdmin.find(p => p.id === parseInt(idEdit));
      if (prodExistente) rutaImagen = prodExistente.imagen;
    }

    if (idEdit) {
      const idx = productosAdmin.findIndex(p => p.id === parseInt(idEdit));
      productosAdmin[idx] = { 
        id: parseInt(idEdit), 
        nombre, 
        categorias: categoriasSeleccionadas, 
        imagen: rutaImagen, 
        opciones 
      };
    } else {
      const newId = productosAdmin.length > 0 ? Math.max(...productosAdmin.map(p => p.id)) + 1 : 1;
      productosAdmin.push({ 
        id: newId, 
        nombre, 
        categorias: categoriasSeleccionadas, 
        imagen: rutaImagen, 
        opciones 
      });
    }

    showToast("Actualizando productos.json en GitHub...");
    await updateJSONInGitHub({ categorias: categoriasAdmin, productos: productosAdmin });

    showToast("¡Publicación exitosa!");
    filtrarTablaAdmin();
    resetForm();

  } catch (err) {
    alert("Error al conectar con la API de GitHub: " + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = "🚀 Publicar en GitHub";
  }
}

async function uploadFileToGitHub(path, file) {
  const base64Content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });

  const url = `https://api.github.com/repos/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;
  
  let sha = null;
  try {
    const getRes = await fetch(url, { 
      headers: { 
        'Authorization': `Bearer ${ghConfig.token}`,
        'Accept': 'application/vnd.github.v3+json'
      } 
    });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }
  } catch (e) {}

  const body = {
    message: `Añadida imagen: ${path} desde Panel Admin`,
    content: base64Content
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ghConfig.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`[HTTP ${res.status}] ${errData.message || 'No se pudo subir la imagen'}`);
  }
}

async function updateJSONInGitHub(contentObject) {
  const path = "productos.json";
  const url = `https://api.github.com/repos/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;

  const getRes = await fetch(url, { 
    headers: { 
      'Authorization': `Bearer ${ghConfig.token}`,
      'Accept': 'application/vnd.github.v3+json'
    } 
  });
  
  if (!getRes.ok) {
    const errData = await getRes.json();
    throw new Error(`[HTTP ${res.status}] No se encontró productos.json: ${errData.message}`);
  }

  const getData = await getRes.json();
  const sha = getData.sha;

  const jsonString = JSON.stringify(contentObject, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ghConfig.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      message: `Actualizado catálogo y categorías desde Panel Admin`,
      content: base64Content,
      sha: sha
    })
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(`[HTTP ${res.status}] ${errData.message || 'No se pudo actualizar productos.json'}`);
  }
}

function editarProducto(id) {
  const p = productosAdmin.find(item => item.id === id);
  if (!p) return;

  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-nombre').value = p.nombre;
  document.getElementById('form-title').innerText = "✏️ Editar Producto";

  const catsArray = Array.isArray(p.categorias) ? p.categorias : [p.categoria];
  const checkboxes = document.querySelectorAll('input[name="prod-cat-check"]');
  checkboxes.forEach(cb => {
    cb.checked = catsArray.includes(cb.value);
  });

  const container = document.getElementById('opciones-container');
  container.innerHTML = '';
  p.opciones.forEach(opc => addOpcionRow(opc.nombre, opc.precio));

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

  productosAdmin = productosAdmin.filter(p => p.id !== id);
  try {
    showToast("Guardando cambios en GitHub...");
    await updateJSONInGitHub({ categorias: categoriasAdmin, productos: productosAdmin });
    filtrarTablaAdmin();
    showToast("Producto eliminado correctamente.");
  } catch (e) {
    alert("Error al eliminar: " + e.message);
  }
}

function resetForm() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').innerText = "➕ Agregar Nuevo Producto";
  
  document.querySelectorAll('input[name="prod-cat-check"]').forEach(cb => cb.checked = false);
  
  document.getElementById('opciones-container').innerHTML = '';
  addOpcionRow("Permanente", 20);
}

function showToast(mensaje) {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  toast.innerHTML = `⚙️ <span>${mensaje}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

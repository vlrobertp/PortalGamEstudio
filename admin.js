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

document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracion();
  cargarProductosDesdeJSON();
  addOpcionRow("Permanente", 20);
});

// 1. Guardar y Cargar Configuración
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

// 2. Cargar Catálogo y Categorías
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
      renderAdminTable();
    })
    .catch(err => console.error("Error al cargar productos.json:", err));
}

// 3. Renderizar Categorías en la Interfaz
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

  const selectCat = document.getElementById('prod-categoria');
  if (selectCat) {
    selectCat.innerHTML = '';
    categoriasAdmin.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = cat.nombre;
      selectCat.appendChild(opt);
    });
  }
}

async function agregarCategoria() {
  const idInput = document.getElementById('new-cat-id');
  const nameInput = document.getElementById('new-cat-name');
  
  const id = idInput.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const nombre = nameInput.value.trim();

  if (!id || !nombre) {
    alert("Por favor completa el ID corto y el Nombre de la categoría.");
    return;
  }

  if (categoriasAdmin.some(c => c.id === id)) {
    alert("Ya existe una categoría con ese ID.");
    return;
  }

  categoriasAdmin.push({ id, nombre });
  renderCategoriasUI();

  idInput.value = '';
  nameInput.value = '';

  try {
    showToast("Guardando nueva categoría en GitHub...");
    await updateJSONInGitHub({ categorias: categoriasAdmin, productos: productosAdmin });
    showToast("Categoría agregada con éxito.");
  } catch (err) {
    alert("Error al guardar categoría: " + err.message);
  }
}

async function eliminarCategoria(catId) {
  if (!confirm(`¿Eliminar la categoría "${catId}"?`)) return;

  categoriasAdmin = categoriasAdmin.filter(c => c.id !== catId);
  renderCategoriasUI();

  try {
    showToast("Guardando cambios en GitHub...");
    await updateJSONInGitHub({ categorias: categoriasAdmin, productos: productosAdmin });
    showToast("Categoría eliminada.");
  } catch (err) {
    alert("Error al eliminar categoría: " + err.message);
  }
}

// 4. Render Tabla de Productos
function renderAdminTable() {
  const tbody = document.getElementById('admin-product-list');
  tbody.innerHTML = '';

  productosAdmin.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.imagen}" onerror="this.src='https://via.placeholder.com/40';"></td>
      <td><strong>${p.nombre}</strong></td>
      <td><span class="badge">${p.categoria}</span></td>
      <td>
        <button class="btn-small" style="background:#ffb703; color:#000; border:none;" onclick="editarProducto(${p.id})">✏️</button>
        <button class="btn-small" style="background:#ff4757; color:#fff; border:none;" onclick="eliminarProducto(${p.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addOpcionRow(nombre = '', precio = '') {
  const container = document.getElementById('opciones-container');
  const div = document.createElement('div');
  div.className = 'opcion-row';
  div.innerHTML = `
    <input type="text" placeholder="Ej: Perdible / Cuenta" value="${nombre}" class="opc-nombre" required>
    <input type="number" placeholder="Precio ($ USD)" value="${precio}" class="opc-precio" style="width: 120px;" required>
    <button type="button" class="btn-small" style="background:#ff4757; color:#fff; border:none;" onclick="this.parentElement.remove()">❌</button>
  `;
  container.appendChild(div);
}

// 5. Guardar / Publicar Producto
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
  const categoria = document.getElementById('prod-categoria').value;
  const fileInput = document.getElementById('prod-file');
  
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

      showToast("Subiendo imagen a la carpeta imagenes/...");
      await uploadFileToGitHub(`imagenes/${fileName}`, file);
    } else if (idEdit) {
      const prodExistente = productosAdmin.find(p => p.id === parseInt(idEdit));
      if (prodExistente) rutaImagen = prodExistente.imagen;
    }

    if (idEdit) {
      const idx = productosAdmin.findIndex(p => p.id === parseInt(idEdit));
      productosAdmin[idx] = { id: parseInt(idEdit), nombre, categoria, imagen: rutaImagen, opciones };
    } else {
      const newId = productosAdmin.length > 0 ? Math.max(...productosAdmin.map(p => p.id)) + 1 : 1;
      productosAdmin.push({ id: newId, nombre, categoria, imagen: rutaImagen, opciones });
    }

    showToast("Actualizando productos.json en GitHub...");
    await updateJSONInGitHub({ categorias: categoriasAdmin, productos: productosAdmin });

    showToast("¡Publicación exitosa!");
    renderAdminTable();
    resetForm();

  } catch (err) {
    alert("Error al conectar con la API de GitHub: " + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = "🚀 Publicar en GitHub";
  }
}

// 6. Subida de Archivos e Interacción con API de GitHub
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
    throw new Error(`[HTTP ${getRes.status}] No se encontró productos.json: ${errData.message}`);
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
  document.getElementById('prod-categoria').value = p.categoria;
  document.getElementById('form-title').innerText = "✏️ Editar Producto";

  const container = document.getElementById('opciones-container');
  container.innerHTML = '';
  p.opciones.forEach(opc => addOpcionRow(opc.nombre, opc.precio));
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

  productosAdmin = productosAdmin.filter(p => p.id !== id);
  try {
    showToast("Guardando cambios en GitHub...");
    await updateJSONInGitHub({ categorias: categoriasAdmin, productos: productosAdmin });
    renderAdminTable();
    showToast("Producto eliminado correctamente.");
  } catch (e) {
    alert("Error al eliminar: " + e.message);
  }
}

function resetForm() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').innerText = "➕ Agregar Nuevo Producto";
  document.getElementById('opciones-container').innerHTML = '';
  addOpcionRow("Permanente", 20);
}

function showToast(mensaje) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `⚙️ <span>${mensaje}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

let productosAdmin = [];
let ghConfig = { user: '', repo: '', token: '' };

document.addEventListener('DOMContentLoaded', () => {
  cargarConfiguracion();
  cargarProductosDesdeJSON();
  addOpcionRow("Permanente", 20); // Opcion inicial por defecto
});

// 1. Guardar y Cargar Configuración en LocalStorage
function guardarConfiguracion() {
  ghConfig.user = document.getElementById('gh-user').value.trim();
  ghConfig.repo = document.getElementById('gh-repo').value.trim();
  ghConfig.token = document.getElementById('gh-token').value.trim();

  localStorage.setItem('portal_gh_config', JSON.stringify(ghConfig));
  document.getElementById('config-status').innerText = "✅ Configuración guardada";
  document.getElementById('config-status').style.color = "#00ff88";
}

function cargarConfiguracion() {
  const saved = localStorage.getItem('portal_gh_config');
  if (saved) {
    ghConfig = JSON.parse(saved);
    document.getElementById('gh-user').value = ghConfig.user || '';
    document.getElementById('gh-repo').value = ghConfig.repo || '';
    document.getElementById('gh-token').value = ghConfig.token || '';
  }
}

// 2. Cargar productos desde el JSON de la tienda
function cargarProductosDesdeJSON() {
  fetch('productos.json')
    .then(res => res.json())
    .then(data => {
      productosAdmin = data;
      renderAdminTable();
    });
}

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

// 3. Manejo dinámico de filas de Opciones y Precios
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

// 4. Guardar / Publicar Producto a GitHub
async function guardarProducto() {
  if (!ghConfig.token || !ghConfig.user || !ghConfig.repo) {
    alert("Por favor, completa y guarda primero los datos de configuración de GitHub.");
    return;
  }

  const idEdit = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-nombre').value;
  const categoria = document.getElementById('prod-categoria').value;
  const fileInput = document.getElementById('prod-file');
  
  // Recopilar Opciones
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

    // Si hay una foto seleccionada, la subimos a GitHub
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const fileName = `${Date.now()}_${file.name.toLowerCase().replace(/\s+/g, '_')}`;
      rutaImagen = `./imagenes/${fileName}`;

      showToast("Subiendo imagen a la carpeta imagenes/...");
      await uploadFileToGitHub(`imagenes/${fileName}`, file);
    } else if (idEdit) {
      // Mantener la imagen previa si estamos editando y no se seleccionó una nueva
      const prodExistente = productosAdmin.find(p => p.id === parseInt(idEdit));
      if (prodExistente) rutaImagen = prodExistente.imagen;
    }

    // Actualizar array de productos
    if (idEdit) {
      const idx = productosAdmin.findIndex(p => p.id === parseInt(idEdit));
      productosAdmin[idx] = { id: parseInt(idEdit), nombre, categoria, imagen: rutaImagen, opciones };
    } else {
      const newId = productosAdmin.length > 0 ? Math.max(...productosAdmin.map(p => p.id)) + 1 : 1;
      productosAdmin.push({ id: newId, nombre, categoria, imagen: rutaImagen, opciones });
    }

    // Subir productos.json actualizado a GitHub
    showToast("Actualizando productos.json en GitHub...");
    await updateJSONInGitHub(productosAdmin);

    showToast("¡Publicación exitosa! La tienda se actualizará en breve.");
    renderAdminTable();
    resetForm();

  } catch (err) {
    alert("Error al conectar con la API de GitHub: " + err.message);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerText = "🚀 Publicar en GitHub";
  }
}

// 5. Funciones auxiliares de GitHub API
async function uploadFileToGitHub(path, file) {
  const base64Content = await fileToBase64(file);
  const cleanBase64 = base64Content.split(',')[1];

  const url = `https://api.github.com/repos/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;
  
  // Verificar si el archivo existe para obtener el SHA (en caso de reescritura)
  let sha = null;
  try {
    const getRes = await fetch(url, { headers: { 'Authorization': `token ${ghConfig.token}` } });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }
  } catch (e) {}

  const body = {
    message: `Añadida imagen: ${path} desde Panel Admin`,
    content: cleanBase64
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${ghConfig.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error("No se pudo subir la imagen.");
}

async function updateJSONInGitHub(contentObject) {
  const path = "productos.json";
  const url = `https://api.github.com/repos/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;

  // Obtener SHA actual del archivo
  const getRes = await fetch(url, { headers: { 'Authorization': `token ${ghConfig.token}` } });
  const getData = await getRes.json();
  const sha = getData.sha;

  const jsonString = JSON.stringify(contentObject, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${ghConfig.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: `Actualizado catálogo de productos desde Panel Admin`,
      content: base64Content,
      sha: sha
    })
  });

  if (!res.ok) throw new Error("No se pudo actualizar productos.json.");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
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
    await updateJSONInGitHub(productosAdmin);
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

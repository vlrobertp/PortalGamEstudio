// CONFIGURACIÓN DE GITHUB API Y ESTADO LOCAL
const STORAGE_KEY_TOKEN = 'portal_admin_github_token';
const STORAGE_KEY_REPO = 'portal_admin_github_repo'; // Formato: "usuario/repositorio"

let GITHUB_TOKEN = localStorage.getItem(STORAGE_KEY_TOKEN) || '';
let GITHUB_REPO = localStorage.getItem(STORAGE_KEY_REPO) || ''; // ej: "tu-usuario/portal-gamestudio"
let FILE_PATH = 'productos.json';

let productosData = {
  categorias: [],
  productos: []
};
let fileSHA = ''; // Requerido por la API de GitHub para actualizar archivos existentes
let productoEditandoId = null;

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  if (GITHUB_TOKEN && GITHUB_REPO) {
    cargarDatosDesdeGitHub();
  }
});

// --- GESTIÓN DE AUTENTICACIÓN Y CONFIGURACIÓN ---

function initAuthUI() {
  const tokenInput = document.getElementById('github-token');
  const repoInput = document.getElementById('github-repo');
  const authStatus = document.getElementById('auth-status');

  if (tokenInput) tokenInput.value = GITHUB_TOKEN;
  if (repoInput) repoInput.value = GITHUB_REPO;

  if (GITHUB_TOKEN && GITHUB_REPO) {
    if (authStatus) {
      authStatus.innerText = "Conectado a GitHub";
      authStatus.style.color = "#4CAF50";
    }
  } else {
    if (authStatus) {
      authStatus.innerText = "Sin configurar (ingresa tu Token y Repositorio)";
      authStatus.style.color = "#FF9800";
    }
  }
}

function guardarConfiguracionGitHub() {
  const tokenInput = document.getElementById('github-token').value.trim();
  const repoInput = document.getElementById('github-repo').value.trim();

  if (!tokenInput || !repoInput) {
    alert("Por favor, ingresa tanto el Token como el Repositorio (usuario/repo).");
    return;
  }

  GITHUB_TOKEN = tokenInput;
  GITHUB_REPO = repoInput;

  localStorage.setItem(STORAGE_KEY_TOKEN, GITHUB_TOKEN);
  localStorage.setItem(STORAGE_KEY_REPO, GITHUB_REPO);

  initAuthUI();
  cargarDatosDesdeGitHub();
}

// Alias para evitar errores si en el HTML se llama guardarConfiguracion()
window.guardarConfiguracion = guardarConfiguracionGitHub;

// --- COMUNICACIÓN CON LA API DE GITHUB ---

async function cargarDatosDesdeGitHub() {
  mostrarCargando(true);
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: No se pudo obtener ${FILE_PATH}`);
    }

    const fileData = await response.json();
    fileSHA = fileData.sha;

    // Decodificar contenido en base64 con soporte para UTF-8 (tildes, caracteres especiales)
    const jsonText = decodeURIComponent(escape(atob(fileData.content.replace(/\s/g, ''))));
    const data = JSON.parse(jsonText);

    if (Array.isArray(data)) {
      productosData = { categorias: [], productos: data };
    } else {
      productosData = {
        categorias: data.categorias || [],
        productos: data.productos || []
      };
    }

    renderizarSelectCategorias();
    renderizarListaProductos(productosData.productos);
    mostrarToast("Datos cargados con éxito desde GitHub.");
  } catch (error) {
    console.error("Error al cargar productos desde GitHub:", error);
    alert(`Error al cargar los datos: ${error.message}`);
  } finally {
    mostrarCargando(false);
  }
}

async function guardarCambiosEnGitHub(mensajeCommit) {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    alert("Configura tu Token y Repositorio antes de guardar cambios.");
    return false;
  }

  mostrarCargando(true);
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    
    // Obtener SHA actual antes de escribir para evitar conflictos
    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getRes.ok) {
      const errData = await getRes.json();
      throw new Error(`[HTTP ${getRes.status}] No se encontró productos.json: ${errData.message}`);
    }

    const currentFileData = await getRes.json();
    fileSHA = currentFileData.sha;

    // Convertir objeto a JSON string y luego a base64 (UTF-8)
    const jsonString = JSON.stringify(productosData, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

    const bodyData = {
      message: mensajeCommit || "Actualización de productos vía Panel de Administración",
      content: contentBase64,
      sha: fileSHA
    };

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(bodyData)
    });

    if (!putRes.ok) {
      const putErr = await putRes.json();
      throw new Error(`[HTTP ${putRes.status}] Error al actualizar: ${putErr.message}`);
    }

    const result = await putRes.json();
    fileSHA = result.content.sha;

    mostrarToast("¡Cambios guardados exitosamente en GitHub!");
    return true;
  } catch (error) {
    console.error("Error al guardar en GitHub:", error);
    alert(`Error al guardar en GitHub: ${error.message}`);
    return false;
  } finally {
    mostrarCargando(false);
  }
}

// --- RENDERIZADO Y BUSCADOR EN EL PANEL ---

function renderizarSelectCategorias() {
  const selectCat = document.getElementById('producto-categoria');
  if (!selectCat) return;

  selectCat.innerHTML = '<option value="">Seleccionar Categoría</option>';
  productosData.categorias.forEach(cat => {
    selectCat.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
  });
}

function renderizarListaProductos(lista) {
  const container = document.getElementById('admin-product-list');
  if (!container) return;

  container.innerHTML = '';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No se encontraron productos.</td></tr>';
    return;
  }

  lista.forEach(prod => {
    let modalidadesText = 'Sin modalidades';
    if (Array.isArray(prod.opciones) && prod.opciones.length > 0) {
      modalidadesText = prod.opciones.map(o => `${o.nombre} ($${o.precio})`).join('<br>');
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${prod.imagen}" width="50" height="50" style="object-fit:cover; border-radius:4px;" onerror="this.src='https://via.placeholder.com/50';"></td>
      <td><strong>${prod.nombre}</strong></td>
      <td>${prod.categoria || (prod.categorias ? prod.categorias.join(', ') : 'N/A')}</td>
      <td><small>${modalidadesText}</small></td>
      <td>
        <button class="btn-edit" onclick="cargarProductoEnFormulario(${prod.id})">✏️ Editar</button>
        <button class="btn-delete" onclick="eliminarProducto(${prod.id})">🗑️ Eliminar</button>
      </td>
    `;
    container.appendChild(tr);
  });
}

function filtrarProductosAdmin() {
  const query = document.getElementById('admin-search-input').value.toLowerCase().trim();
  const filtrados = productosData.productos.filter(p => {
    const nombreMatch = p.nombre.toLowerCase().includes(query);
    const catMatch = (p.categoria && p.categoria.toLowerCase().includes(query)) ||
                     (Array.isArray(p.categorias) && p.categorias.some(c => c.toLowerCase().includes(query)));
    return nombreMatch || catMatch;
  });
  renderizarListaProductos(filtrados);
}

// --- GESTIÓN DE MODALIDADES EN EL FORMULARIO ---

function agregarCampoOpcion(nombre = '', precio = '') {
  const container = document.getElementById('opciones-container');
  if (!container) return;

  const div = document.createElement('div');
  div.className = 'opcion-row';
  div.style.display = 'flex';
  div.style.gap = '8px';
  div.style.marginBottom = '8px';

  div.innerHTML = `
    <input type="text" placeholder="Nombre (ej: Primaria PS5)" value="${nombre}" class="opcion-nombre" required style="flex:2;">
    <input type="number" placeholder="Precio ($ USD)" value="${precio}" class="opcion-precio" step="0.01" required style="flex:1;">
    <button type="button" onclick="this.parentElement.remove()" style="background:#ff4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">X</button>
  `;
  container.appendChild(div);
}

function obtenerOpcionesDelFormulario() {
  const filas = document.querySelectorAll('#opciones-container .opcion-row');
  const opciones = [];

  filas.forEach(fila => {
    const nombre = fila.querySelector('.opcion-nombre').value.trim();
    const precio = parseFloat(fila.querySelector('.opcion-precio').value);

    if (nombre && !isNaN(precio)) {
      opciones.push({ nombre, precio });
    }
  });

  return opciones;
}

// --- GUARDAR / EDITAR / ELIMINAR PRODUCTOS ---

async function guardarProductoFormulario(e) {
  if (e) e.preventDefault();

  const nombre = document.getElementById('producto-nombre').value.trim();
  const imagen = document.getElementById('producto-imagen').value.trim();
  const categoria = document.getElementById('producto-categoria').value;
  const opciones = obtenerOpcionesDelFormulario();

  if (!nombre || !imagen || !categoria) {
    alert("Por favor completa los campos de Nombre, Imagen y Categoría.");
    return;
  }

  if (opciones.length === 0) {
    alert("Agrega al menos una modalidad / opción con precio.");
    return;
  }

  if (productoEditandoId !== null) {
    // Editar existente
    const index = productosData.productos.findIndex(p => p.id === productoEditandoId);
    if (index !== -1) {
      productosData.productos[index] = {
        id: productoEditandoId,
        nombre,
        imagen,
        categoria,
        opciones
      };
    }
  } else {
    // Crear nuevo
    const nuevoId = productosData.productos.length > 0 
      ? Math.max(...productosData.productos.map(p => p.id || 0)) + 1 
      : 1;

    productosData.productos.push({
      id: nuevoId,
      nombre,
      imagen,
      categoria,
      opciones
    });
  }

  const exito = await guardarCambiosEnGitHub(
    productoEditandoId !== null ? `Editar producto: ${nombre}` : `Nuevo producto: ${nombre}`
  );

  if (exito) {
    limpiarFormulario();
    renderizarListaProductos(productosData.productos);
  }
}

function cargarProductoEnFormulario(id) {
  const prod = productosData.productos.find(p => p.id === id);
  if (!prod) return;

  productoEditandoId = prod.id;
  document.getElementById('producto-nombre').value = prod.nombre;
  document.getElementById('producto-imagen').value = prod.imagen;
  document.getElementById('producto-categoria').value = prod.categoria || (prod.categorias ? prod.categorias[0] : '');

  const container = document.getElementById('opciones-container');
  if (container) container.innerHTML = '';

  if (Array.isArray(prod.opciones) && prod.opciones.length > 0) {
    prod.opciones.forEach(opc => agregarCampoOpcion(opc.nombre, opc.precio));
  } else {
    agregarCampoOpcion();
  }

  const btnSubmit = document.getElementById('btn-guardar-producto');
  if (btnSubmit) btnSubmit.innerText = "💾 Actualizar Producto";
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProducto(id) {
  const prod = productosData.productos.find(p => p.id === id);
  if (!prod) return;

  if (!confirm(`¿Estás seguro de que deseas eliminar "${prod.nombre}"?`)) {
    return;
  }

  productosData.productos = productosData.productos.filter(p => p.id !== id);

  const exito = await guardarCambiosEnGitHub(`Eliminar producto ID ${id}: ${prod.nombre}`);
  if (exito) {
    renderizarListaProductos(productosData.productos);
  }
}

function limpiarFormulario() {
  productoEditandoId = null;
  const form = document.getElementById('form-producto');
  if (form) form.reset();

  const container = document.getElementById('opciones-container');
  if (container) {
    container.innerHTML = '';
    agregarCampoOpcion(); // Dejar un campo listo por defecto
  }

  const btnSubmit = document.getElementById('btn-guardar-producto');
  if (btnSubmit) btnSubmit.innerText = "➕ Agregar Producto";
}

// --- UTILIDADES ---

function mostrarCargando(flag) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = flag ? 'flex' : 'none';
  }
}

function mostrarToast(mensaje) {
  const container = document.getElementById('admin-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  toast.innerText = mensaje;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

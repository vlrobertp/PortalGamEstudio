async function uploadFileToGitHub(path, file) {
  // Convertir la imagen a Base64 puro
  const base64Content = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remover la cabecera 'data:image/...;base64,'
      const result = reader.result.split(',')[1];
      resolve(result);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });

  const url = `https://api.github.com/repos/${ghConfig.user}/${ghConfig.repo}/contents/${path}`;
  
  // 1. Comprobar si el archivo ya existe para obtener su SHA
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
  } catch (e) {
    console.log("El archivo es nuevo, no requiere SHA.");
  }

  // 2. Preparar el Payload
  const body = {
    message: `Añadida imagen: ${path} desde Panel Admin`,
    content: base64Content
  };
  if (sha) body.sha = sha;

  // 3. Petición PUT a la API de GitHub
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
    console.error("Detalle del error de GitHub:", errData);
    throw new Error(`Error ${res.status}: ${errData.message || 'No se pudo subir la imagen'}`);
  }
}

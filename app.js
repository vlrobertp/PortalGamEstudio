/* --------------------------------------------------------------------------
   GESTIÓN Y LIMPIEZA DE CESTA
   -------------------------------------------------------------------------- */

function vaciarCesta() {
  cart = [];
  localStorage.removeItem('portal_cart'); // Elimina la clave del almacenamiento local
  actualizarContadorCarrito();
  
  // Limpia visualmente el contenido del modal si sigue abierto
  const container = document.getElementById('cart-items-container');
  if (container) {
    container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 20px;">Tu cesta está vacía.</p>`;
  }
  
  const totalUSDContainer = document.getElementById('cart-total-usd');
  const totalConvertidoContainer = document.getElementById('cart-total-convertido');
  if (totalUSDContainer) totalUSDContainer.innerText = "$0.00 USD";
  if (totalConvertidoContainer) totalConvertidoContainer.innerText = "0.00";
}

function cerrarModalCarrito() {
  // Intenta cerrar por ID tradicional o por clase de modal
  const modal = document.getElementById('cart-modal') || document.querySelector('.cart-modal') || document.querySelector('.modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active', 'show'); // Por si usas clases CSS para mostrar/ocultar
  }
}

function enviarPedidoWhatsApp(event) {
  // Previene que la página se recargue si el botón está dentro de un <form>
  if (event) event.preventDefault();

  if (!cart || cart.length === 0) {
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
  const numeroTelefono = "5350000000"; // Tu número de WhatsApp

  // 4. Abrir la URL de WhatsApp en una pestaña nueva
  const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  // 5. VACÍO FORZADO Y CIERRE DE VENTANA
  vaciarCesta();
  cerrarModalCarrito();
  showToast("¡Pedido enviado! La cesta se ha limpiado.");
}

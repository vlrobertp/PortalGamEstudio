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

  // --- VACÍO Y LIMPIEZA DE CESTA TRAS ENVIAR EL PEDIDO ---
  carrito = [];
  guardarCarrito(); // Actualiza localStorage dejando la cesta vacía
  updateCartUI();   // Actualiza el contador y el contenido del modal de la cesta

  // Ocultar modal del carrito si está abierto
  const modal = document.getElementById('cart-modal');
  if (modal) modal.style.display = 'none';

  // Abrir WhatsApp con el mensaje del pedido
  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

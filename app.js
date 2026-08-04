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

  // Generar ID de pedido único
  const orderId = "ORD-" + Date.now().toString().slice(-6);
  const fecha = new Date().toLocaleString('es-ES');

  let totalUSD = 0;
  carrito.forEach(item => totalUSD += item.precio);

  // Crear objeto del pedido
  const nuevoPedido = {
    id: orderId,
    fecha: fecha,
    cliente: nombre,
    telefono: telefono,
    entrega: deliveryType,
    direccion: deliveryType === 'Domicilio' ? direccion : 'N/A',
    metodoPago: metodoPago,
    items: [...carrito],
    totalUSD: totalUSD,
    estado: 'pendiente' // Estado inicial: pendiente, pagado, completado
  };

  // Guardar en el historial local del navegador
  let historial = JSON.parse(localStorage.getItem('portal_pedidos_historial')) || [];
  historial.unshift(nuevoPedido);
  localStorage.setItem('portal_pedidos_historial', JSON.stringify(historial));

  // Construir mensaje de WhatsApp
  let mensaje = `🎮 *NUEVO PEDIDO (${orderId}) - PORTAL GAMESTUDIO*\n\n`;

  carrito.forEach(item => {
    mensaje += `▪️ *${item.nombre}*\n   Modalidad: ${item.modalidad} ($${item.precio} USD)\n`;
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

  const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

import { Producto, cargarCatalogo, guardarProductos, obtenerSiguienteId } from "./productos.js";
import { cargarCarrito, guardarCarrito, calcularSubtotal, normalizarCarrito } from "./carrito.js";

const pagina = document.body.dataset.page;
const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 0
});
let productos = [];
let carrito = [];
let toastCarga = null;

function escaparHTML(valor) {
  return String(valor).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[caracter]);
}

function notificar(texto, tipo = "info") {
  if (typeof Toastify !== "function") {
    const destino = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
    if (destino) destino.textContent = texto;
    return;
  }

  Toastify({
    text: texto,
    duration: 2800,
    close: true,
    gravity: "top",
    position: "right",
    className: tipo === "error" ? "toast-error" : tipo === "success" ? "toast-success" : "toast-info"
  }).showToast();
}

function mostrarCarga() {
  const estado = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
  if (estado) estado.textContent = "Cargando catálogo…";
  if (typeof Toastify === "function") {
    toastCarga = Toastify({ text: "Cargando menú…", duration: -1, close: false, gravity: "top", position: "right" });
    toastCarga.showToast();
  }
}

function finalizarCarga() {
  if (toastCarga) {
    toastCarga.hideToast();
    toastCarga = null;
  }
  const estado = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
  if (estado) estado.textContent = "";
}

async function iniciarAplicacion() {
  mostrarCarga();
  try {
    productos = await cargarCatalogo();
    carrito = cargarCarrito(productos);
    carrito = normalizarCarrito(carrito, productos);
    guardarCarrito(carrito);

    if (pagina === "menu") {
      renderizarProductos();
      renderizarCarrito();
      configurarMenu();
    } else if (pagina === "admin") {
      renderizarAdministracion();
      configurarAdministracion();
    }
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error);
    const destino = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
    if (destino) destino.textContent = "No se pudo cargar el catálogo. Revisá la conexión o la ubicación de productos.json e intentá recargar la página.";
    notificar("No se pudo cargar el catálogo y no hay datos locales válidos.", "error");
  } finally {
    finalizarCarga();
  }
}

function obtenerCantidadEnCarrito(productoId) {
  return carrito.find((item) => item.productoId === productoId)?.cantidad ?? 0;
}

function renderizarProductos() {
  const contenedor = document.getElementById("contenedor-productos");
  if (!contenedor) return;
  const busqueda = document.getElementById("buscador")?.value.toLocaleLowerCase("es-AR").trim() ?? "";
  const productosFiltrados = productos.filter(({ nombre, categoria }) =>
    `${nombre} ${categoria}`.toLocaleLowerCase("es-AR").includes(busqueda)
  );

  contenedor.replaceChildren();
  if (productosFiltrados.length === 0) {
    contenedor.innerHTML = '<p class="empty-state">No encontramos productos con esa búsqueda.</p>';
    return;
  }

  productosFiltrados.forEach((producto) => {
    const cantidadEnCarrito = obtenerCantidadEnCarrito(producto.id);
    const stockDisponible = Math.max(0, producto.stock - cantidadEnCarrito);
    const tarjeta = document.createElement("article");
    tarjeta.className = "product-card";
    const imagenProducto = producto.imagen || "assets/img/productos/producto-generico.svg";
    tarjeta.innerHTML = `
      <img class="product-image" src="${escaparHTML(imagenProducto)}" alt="${escaparHTML(producto.nombre)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/productos/producto-generico.svg'">
      <div class="product-card-top"><span class="category-tag">${escaparHTML(producto.categoria)}</span><span class="product-symbol" aria-label="${escaparHTML(producto.categoria)}">${iconoCategoria(producto.categoria)}</span></div>
      <h3>${escaparHTML(producto.nombre)}</h3>
      <p class="product-price">${formatoMoneda.format(producto.precio)}</p>
      <p class="stock-label">${stockDisponible > 0 ? `${stockDisponible} disponibles` : "Sin stock disponible"}</p>
      <button class="button button-primary button-wide" type="button" data-agregar="${producto.id}" ${stockDisponible === 0 ? "disabled" : ""}>Agregar al pedido</button>`;
    contenedor.append(tarjeta);
  });

  contenedor.querySelectorAll("[data-agregar]").forEach((boton) => {
    boton.addEventListener("click", () => agregarAlCarrito(Number(boton.dataset.agregar)));
  });
}

function iconoCategoria(categoria) {
  const categoriaNormalizada = categoria.toLocaleLowerCase("es-AR");
  if (categoriaNormalizada.includes("pizza")) return "🍕";
  if (categoriaNormalizada.includes("hamburgues")) return "🍔";
  if (categoriaNormalizada.includes("bebida") || categoriaNormalizada.includes("gaseosa")) return "🥤";
  if (categoriaNormalizada.includes("postre")) return "🍮";
  if (categoriaNormalizada.includes("ensalada")) return "🥗";
  if (categoriaNormalizada.includes("guarnición") || categoriaNormalizada.includes("guarnicion")) return "🍟";
  if (categoriaNormalizada.includes("plato principal")) return "🍽️";
  if (categoriaNormalizada.includes("rápida") || categoriaNormalizada.includes("rapida")) return "🌭";
  return "🍴";
}

function agregarAlCarrito(productoId) {
  const producto = productos.find(({ id }) => id === productoId);
  if (!producto) return;
  const item = carrito.find(({ productoId: id }) => id === productoId);
  if ((item?.cantidad ?? 0) >= producto.stock) {
    notificar(`No hay más stock disponible de ${producto.nombre}.`, "error");
    return;
  }
  item ? item.cantidad++ : carrito.push({ productoId, cantidad: 1 });
  guardarCarrito(carrito);
  limpiarTicket();
  renderizarProductos();
  renderizarCarrito();
  notificar(`${producto.nombre} agregado al pedido.`, "success");
}

function renderizarCarrito() {
  const contenedor = document.getElementById("carrito");
  if (!contenedor) return;
  contenedor.replaceChildren();

  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="empty-state">Todavía no agregaste productos.</p>';
  } else {
    carrito.forEach(({ productoId, cantidad }) => {
      const producto = productos.find(({ id }) => id === productoId);
      if (!producto) return;
      const fila = document.createElement("article");
      fila.className = "cart-item";
      fila.innerHTML = `
        <div class="cart-item-info"><h3>${escaparHTML(producto.nombre)}</h3><p>${formatoMoneda.format(producto.precio)} por unidad</p><strong>${formatoMoneda.format(producto.precio * cantidad)}</strong></div>
        <div class="quantity-control" aria-label="Cantidad de ${escaparHTML(producto.nombre)}">
          <button type="button" data-restar="${producto.id}" aria-label="Quitar una unidad">−</button><span>${cantidad}</span><button type="button" data-sumar="${producto.id}" aria-label="Agregar una unidad" ${cantidad >= producto.stock ? "disabled" : ""}>＋</button>
          <button class="remove-item" type="button" data-quitar="${producto.id}">Quitar</button>
        </div>`;
      contenedor.append(fila);
    });
    contenedor.querySelectorAll("[data-restar]").forEach((boton) => boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.restar), -1)));
    contenedor.querySelectorAll("[data-sumar]").forEach((boton) => boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.sumar), 1)));
    contenedor.querySelectorAll("[data-quitar]").forEach((boton) => boton.addEventListener("click", () => quitarDelCarrito(Number(boton.dataset.quitar))));
  }

  const cantidadTotal = carrito.reduce((acumulado, item) => acumulado + item.cantidad, 0);
  const contador = document.getElementById("contador-carrito");
  if (contador) contador.textContent = String(cantidadTotal);
  calcularTotal();
}

function cambiarCantidad(productoId, cambio) {
  const item = carrito.find(({ productoId: id }) => id === productoId);
  const producto = productos.find(({ id }) => id === productoId);
  if (!item || !producto) return;
  const nuevaCantidad = item.cantidad + cambio;
  if (nuevaCantidad > producto.stock) {
    notificar("No hay stock suficiente para esa cantidad.", "error");
    return;
  }
  if (nuevaCantidad <= 0) {
    quitarDelCarrito(productoId);
    return;
  }
  item.cantidad = nuevaCantidad;
  guardarCarrito(carrito);
  limpiarTicket();
  renderizarCarrito();
  renderizarProductos();
}

function quitarDelCarrito(productoId) {
  carrito = carrito.filter(({ productoId: id }) => id !== productoId);
  guardarCarrito(carrito);
  limpiarTicket();
  renderizarCarrito();
  renderizarProductos();
  notificar("Producto quitado del pedido.", "success");
}

function calcularTotal() {
  const subtotal = calcularSubtotal(carrito, productos);
  const porcentaje = Number(document.querySelector('input[name="propina"]:checked')?.value ?? 0);
  const propina = Math.round(subtotal * porcentaje / 100);
  document.getElementById("subtotal").textContent = formatoMoneda.format(subtotal);
  document.getElementById("monto-propina").textContent = formatoMoneda.format(propina);
  document.getElementById("total").textContent = formatoMoneda.format(subtotal + propina);
}

function limpiarTicket() {
  const ticket = document.getElementById("ticket");
  if (ticket) {
    ticket.hidden = true;
    ticket.replaceChildren();
  }
}

function confirmarCompra() {
  if (carrito.length === 0) {
    notificar("Tu pedido está vacío. Agregá al menos un producto.", "error");
    return;
  }

  const pedidoValido = carrito.every(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    return producto && Number.isInteger(cantidad) && cantidad > 0 && producto.stock >= cantidad;
  });
  if (!pedidoValido) {
    notificar("El stock cambió y no alcanza para completar el pedido. Revisá las cantidades.", "error");
    return;
  }

  const subtotal = calcularSubtotal(carrito, productos);
  const porcentaje = Number(document.querySelector('input[name="propina"]:checked')?.value ?? 0);
  const propina = Math.round(subtotal * porcentaje / 100);
  const totalFinal = subtotal + propina;
  const lineasTicket = carrito.map(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    return { nombre: producto.nombre, cantidad, precio: producto.precio, total: producto.precio * cantidad };
  });

  carrito.forEach(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    producto.vender(cantidad);
  });
  guardarProductos(productos);
  carrito = [];
  guardarCarrito(carrito);
  renderizarProductos();
  renderizarCarrito();
  document.querySelector('input[name="propina"][value="0"]').checked = true;
  renderizarTicket(lineasTicket, subtotal, porcentaje, propina, totalFinal);
  notificar("¡Compra confirmada! Gracias por elegir El Oasis.", "success");
}

function renderizarTicket(lineas, subtotal, porcentaje, propina, total) {
  const ticket = document.getElementById("ticket");
  ticket.replaceChildren();
  ticket.hidden = false;
  const fecha = new Date().toLocaleString("es-AR");
  const encabezado = document.createElement("div");
  encabezado.className = "receipt-heading";
  encabezado.innerHTML = `<img src="assets/img/logo-solo-oasis.jpg" alt="" width="42" height="42"><div><h2>El Oasis</h2><p>Ticket de compra</p></div>`;
  ticket.append(encabezado);
  const fechaTicket = document.createElement("p");
  fechaTicket.className = "receipt-date";
  fechaTicket.textContent = fecha;
  ticket.append(fechaTicket);
  lineas.forEach(({ nombre, cantidad, precio, total: totalLinea }) => {
    const linea = document.createElement("div");
    linea.className = "receipt-line";
    const descripcion = document.createElement("span");
    descripcion.textContent = `${nombre} × ${cantidad} (${formatoMoneda.format(precio)} c/u)`;
    const importe = document.createElement("strong");
    importe.textContent = formatoMoneda.format(totalLinea);
    linea.append(descripcion, importe);
    ticket.append(linea);
  });
  const resumen = document.createElement("div");
  resumen.className = "receipt-summary";
  resumen.innerHTML = `<p><span>Subtotal</span><strong>${formatoMoneda.format(subtotal)}</strong></p><p><span>Propina (${porcentaje}%)</span><strong>${formatoMoneda.format(propina)}</strong></p><p class="receipt-total"><span>Total</span><strong>${formatoMoneda.format(total)}</strong></p>`;
  ticket.append(resumen);
  const gracias = document.createElement("p");
  gracias.className = "receipt-thanks";
  gracias.textContent = "¡Gracias por tu compra!";
  ticket.append(gracias);
  ticket.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function configurarMenu() {
  document.getElementById("buscador")?.addEventListener("input", renderizarProductos);
  document.querySelectorAll('input[name="propina"]').forEach((opcion) => opcion.addEventListener("change", calcularTotal));
  document.getElementById("confirmar-compra")?.addEventListener("click", confirmarCompra);
  document.getElementById("vaciar-carrito")?.addEventListener("click", () => {
    if (carrito.length === 0) {
      notificar("El pedido ya está vacío.", "info");
      return;
    }
    carrito = [];
    guardarCarrito(carrito);
    limpiarTicket();
    renderizarCarrito();
    renderizarProductos();
    notificar("Pedido vaciado correctamente.", "success");
  });
}

function renderizarAdministracion() {
  const contenedor = document.getElementById("lista-admin");
  if (!contenedor) return;
  const busqueda = document.getElementById("buscador-admin")?.value.toLocaleLowerCase("es-AR").trim() ?? "";
  const filtrados = productos.filter(({ nombre, categoria }) => `${nombre} ${categoria}`.toLocaleLowerCase("es-AR").includes(busqueda));
  contenedor.replaceChildren();
  document.getElementById("cantidad-productos").textContent = `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`;

  if (filtrados.length === 0) {
    contenedor.innerHTML = '<p class="empty-state">No hay productos que coincidan con la búsqueda.</p>';
    return;
  }

  filtrados.forEach((producto) => {
    const fila = document.createElement("article");
    fila.className = "admin-product-row";
    fila.innerHTML = `
      <div class="admin-product-main"><span class="admin-product-icon" aria-hidden="true">${iconoCategoria(producto.categoria)}</span><div><h3>${escaparHTML(producto.nombre)}</h3><p>${escaparHTML(producto.categoria)} · ${formatoMoneda.format(producto.precio)}</p></div></div>
      <div class="admin-stock"><span>Stock</span><div class="quantity-control"><button type="button" data-stock="-1" data-id="${producto.id}" aria-label="Restar una unidad de stock">−</button><strong>${producto.stock}</strong><button type="button" data-stock="1" data-id="${producto.id}" aria-label="Sumar una unidad de stock">＋</button></div></div>
      <button class="button button-danger" type="button" data-eliminar="${producto.id}">Eliminar</button>`;
    contenedor.append(fila);
  });
  contenedor.querySelectorAll("[data-stock]").forEach((boton) => boton.addEventListener("click", () => ajustarStock(Number(boton.dataset.id), Number(boton.dataset.stock))));
  contenedor.querySelectorAll("[data-eliminar]").forEach((boton) => boton.addEventListener("click", () => eliminarProducto(Number(boton.dataset.eliminar))));
}

function configurarAdministracion() {
  document.getElementById("buscador-admin")?.addEventListener("input", renderizarAdministracion);
  document.getElementById("formulario-producto")?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nombre = document.getElementById("nombre").value.trim();
    const precio = Number(document.getElementById("precio").value);
    const categoria = document.getElementById("categoria").value.trim();
    const stock = Number(document.getElementById("stock").value);

    if (!nombre || !categoria || !Number.isFinite(precio) || precio <= 0 || !Number.isInteger(stock) || stock < 0) {
      notificar("Completá todos los campos con valores válidos.", "error");
      return;
    }
    const nombreDuplicado = productos.some(({ nombre: existente }) => existente.toLocaleLowerCase("es-AR") === nombre.toLocaleLowerCase("es-AR"));
    if (nombreDuplicado) {
      notificar("Ya existe un producto con ese nombre.", "error");
      return;
    }

    productos.push(new Producto(obtenerSiguienteId(productos), nombre, precio, categoria, stock));
    guardarProductos(productos);
    evento.currentTarget.reset();
    renderizarAdministracion();
    notificar("Producto agregado al catálogo.", "success");
  });
}

function ajustarStock(productoId, cambio) {
  const producto = productos.find(({ id }) => id === productoId);
  if (!producto) return;
  const nuevoStock = producto.stock + cambio;
  if (nuevoStock < 0) {
    notificar("El stock no puede ser menor que cero.", "error");
    return;
  }
  if (cambio < 0 && carrito.some((item) => item.productoId === productoId && item.cantidad > nuevoStock)) {
    notificar("No podés bajar el stock por debajo de las unidades que hay en un pedido.", "error");
    return;
  }
  producto.stock = nuevoStock;
  guardarProductos(productos);
  renderizarAdministracion();
  notificar("Stock actualizado.", "success");
}

function eliminarProducto(productoId) {
  const producto = productos.find(({ id }) => id === productoId);
  if (!producto) return;
  productos = productos.filter(({ id }) => id !== productoId);
  carrito = carrito.filter(({ productoId: id }) => id !== productoId);
  guardarProductos(productos);
  guardarCarrito(carrito);
  renderizarAdministracion();
  notificar(`${producto.nombre} fue eliminado del catálogo.`, "success");
}

iniciarAplicacion();

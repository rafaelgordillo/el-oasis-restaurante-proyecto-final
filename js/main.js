

import { Producto, cargarCatalogo, guardarProductos, obtenerSiguienteId } from "./productos.js";
import { cargarCarrito, guardarCarrito, calcularSubtotal, normalizarCarrito } from "./carrito.js";

/*
 * VARIABLES GENERALES
 */

// Obtiene el valor del atributo data-page del body del HTML.
// Según sea "menu" o "admin", la aplicación ejecuta una interfaz diferente.
const pagina = document.body.dataset.page;

// Configura el formato de moneda para Argentina.
// Intl.NumberFormat permite mostrar importes como moneda argentina,
// sin tener que construir manualmente el símbolo y los separadores.
const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 0
});

// Array que contendrá los productos del catálogo.
let productos = [];

// Array que contendrá los productos agregados al carrito.
let carrito = [];

// Guarda la notificación de carga para poder ocultarla cuando termine la carga.
let toastCarga = null;


/*
 * SEGURIDAD AL INSERTAR TEXTO EN HTML
 */

function escaparHTML(valor) {
  // Convierte el valor recibido a texto y reemplaza caracteres especiales
  // por entidades HTML. Esto ayuda a evitar que datos del catálogo se interpreten
  // como etiquetas o código HTML cuando se insertan mediante innerHTML.
  return String(valor).replace(/[&<>"']/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[caracter]);
}


/*
 * NOTIFICACIONES
 */

function notificar(texto, tipo = "info") {
  // Si Toastify no está disponible, utiliza un elemento del HTML para mostrar
  // el mensaje. El operador ternario elige el elemento según la página actual.
  if (typeof Toastify !== "function") {
    const destino = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
    if (destino) destino.textContent = texto;
    return;
  }

  // Si Toastify está disponible, crea una notificación emergente.
  // El parámetro tipo tiene "info" como valor predeterminado.
  Toastify({
    text: texto,
    duration: 2800,
    close: true,
    gravity: "top",
    position: "right",
    // Elige una clase CSS según el tipo de mensaje.
    className: tipo === "error" ? "toast-error" : tipo === "success" ? "toast-success" : "toast-info"
  }).showToast();
}


/*
 * INDICADORES DE CARGA
 */

function mostrarCarga() {
  // Selecciona el elemento de estado correspondiente a la página actual.
  const estado = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");

  // Muestra un mensaje de carga dentro de la página.
  if (estado) estado.textContent = "Cargando catálogo…";

  // Si Toastify está disponible, muestra una notificación que permanece visible
  // hasta que se oculte explícitamente.
  if (typeof Toastify === "function") {
    toastCarga = Toastify({ text: "Cargando menú…", duration: -1, close: false, gravity: "top", position: "right" });
    toastCarga.showToast();
  }
}

function finalizarCarga() {
  // Oculta la notificación de carga, si fue creada.
  if (toastCarga) {
    toastCarga.hideToast();

    // Restablece la variable para indicar que ya no hay una notificación activa.
    toastCarga = null;
  }

  // Limpia el mensaje de estado al finalizar la carga.
  const estado = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
  if (estado) estado.textContent = "";
}


/*
 * INICIALIZACIÓN DE LA APLICACIÓN
 */

async function iniciarAplicacion() {
  // Muestra el indicador antes de comenzar a recuperar los datos.
  mostrarCarga();

  try {
    // await espera el resultado de cargarCatalogo(), que devuelve una promesa.
    // El resultado se guarda en el array de productos.
    productos = await cargarCatalogo();

    // Recupera el carrito almacenado en el navegador.
    carrito = cargarCarrito(productos);

    // Ajusta el carrito según los productos y el stock disponibles.
    carrito = normalizarCarrito(carrito, productos);

    // Guarda el carrito ya normalizado para mantener los datos actualizados.
    guardarCarrito(carrito);

    // Determina qué interfaz debe mostrarse según la página.
    if (pagina === "menu") {
      renderizarProductos();
      renderizarCarrito();
      configurarMenu();
    } else if (pagina === "admin") {
      renderizarAdministracion();
      configurarAdministracion();
    }

  } catch (error) {
    // Si falla la carga, registra el error en la consola para facilitar
    // la depuración durante el desarrollo.
    console.error("No se pudo cargar el catálogo:", error);

    // Muestra un mensaje de error en la interfaz.
    const destino = document.getElementById(pagina === "admin" ? "estado-admin" : "estado-catalogo");
    if (destino) destino.textContent = "No se pudo cargar el catálogo. Revisá la conexión o la ubicación de productos.json e intentá recargar la página.";

    // Informa al usuario mediante una notificación.
    notificar("No se pudo cargar el catálogo y no hay datos locales válidos.", "error");

  } finally {
    // finally se ejecuta tanto si todo salió bien como si ocurrió un error.
    // Así se oculta el indicador de carga en ambos casos.
    finalizarCarga();
  }
}


/*
 * CONSULTA DE CANTIDADES DEL CARRITO
 */

function obtenerCantidadEnCarrito(productoId) {
  // find() busca el primer elemento cuyo ID coincida.
  // El operador ?. evita un error si no se encuentra el elemento.
  // ?? devuelve cero si la cantidad es null o undefined.
  return carrito.find((item) => item.productoId === productoId)?.cantidad ?? 0;
}


/*
 * RENDERIZADO DEL CATÁLOGO
 * Renderizar significa construir o actualizar elementos de la interfaz.
 */

function renderizarProductos() {
  // Busca el contenedor HTML donde se mostrarán las tarjetas.
  const contenedor = document.getElementById("contenedor-productos");

  // Si el elemento no existe en esta página, termina la función.
  if (!contenedor) return;

  // Recupera el texto del buscador, lo convierte a minúsculas y elimina
  // espacios al principio y al final. Si no existe el buscador, usa texto vacío.
  const busqueda = document.getElementById("buscador")?.value.toLocaleLowerCase("es-AR").trim() ?? "";

  // filter() crea un nuevo array con los productos cuyo nombre o categoría
  // contienen el texto buscado.
  const productosFiltrados = productos.filter(({ nombre, categoria }) =>
    `${nombre} ${categoria}`.toLocaleLowerCase("es-AR").includes(busqueda)
  );

  // Elimina los elementos anteriores del contenedor para dibujar el catálogo actualizado.
  contenedor.replaceChildren();

  // Si la búsqueda no devuelve resultados, muestra un mensaje y termina.
  if (productosFiltrados.length === 0) {
    contenedor.innerHTML = '<p class="empty-state">No encontramos productos con esa búsqueda.</p>';
    return;
  }

  // forEach() recorre los productos filtrados y crea una tarjeta para cada uno.
  productosFiltrados.forEach((producto) => {
    // Consulta cuántas unidades de ese producto ya están en el carrito.
    const cantidadEnCarrito = obtenerCantidadEnCarrito(producto.id);

    // Calcula el stock disponible para agregar al pedido.
    // Math.max() impide mostrar un valor negativo.
    const stockDisponible = Math.max(0, producto.stock - cantidadEnCarrito);

    // Crea un elemento article que representará la tarjeta del producto.
    const tarjeta = document.createElement("article");
    tarjeta.className = "product-card";

    // Utiliza la imagen del producto o una imagen genérica si no tiene una.
    const imagenProducto = producto.imagen || "assets/img/productos/producto-generico.svg";

    // Construye el contenido HTML de la tarjeta.
    // escaparHTML() protege los datos dinámicos que se insertan como texto o atributos.
    tarjeta.innerHTML = `
      <img class="product-image" src="${escaparHTML(imagenProducto)}" alt="${escaparHTML(producto.nombre)}" loading="lazy" onerror="this.onerror=null;this.src='assets/img/productos/producto-generico.svg'">
      <div class="product-card-top"><span class="category-tag">${escaparHTML(producto.categoria)}</span><span class="product-symbol" aria-label="${escaparHTML(producto.categoria)}">${iconoCategoria(producto.categoria)}</span></div>
      <h3>${escaparHTML(producto.nombre)}</h3>
      <p class="product-price">${formatoMoneda.format(producto.precio)}</p>
      <p class="stock-label">${stockDisponible > 0 ? `${stockDisponible} disponibles` : "Sin stock disponible"}</p>
      <button class="button button-primary button-wide" type="button" data-agregar="${producto.id}" ${stockDisponible === 0 ? "disabled" : ""}>Agregar al pedido</button>`;

    // Inserta la tarjeta creada dentro del contenedor del catálogo.
    contenedor.append(tarjeta);
  });

  // Busca los botones de las tarjetas y les agrega un evento click.
  // dataset.agregar permite recuperar el ID guardado en data-agregar.
  contenedor.querySelectorAll("[data-agregar]").forEach((boton) => {
    boton.addEventListener("click", () => agregarAlCarrito(Number(boton.dataset.agregar)));
  });
}


/*
 * ICONOS SEGÚN LA CATEGORÍA
 */

function iconoCategoria(categoria) {
  // Convierte la categoría a minúsculas para que la comparación no dependa
  // de cómo estén escritas las mayúsculas.
  const categoriaNormalizada = categoria.toLocaleLowerCase("es-AR");

  // includes() comprueba si la categoría contiene determinadas palabras.
  // Según la coincidencia, devuelve un emoji representativo.
  if (categoriaNormalizada.includes("pizza")) return "🍕";
  if (categoriaNormalizada.includes("hamburgues")) return "🍔";
  if (categoriaNormalizada.includes("bebida") || categoriaNormalizada.includes("gaseosa")) return "🥤";
  if (categoriaNormalizada.includes("postre")) return "🍮";
  if (categoriaNormalizada.includes("ensalada")) return "🥗";
  if (categoriaNormalizada.includes("guarnición") || categoriaNormalizada.includes("guarnicion")) return "🍟";
  if (categoriaNormalizada.includes("plato principal")) return "🍽️";
  if (categoriaNormalizada.includes("rápida") || categoriaNormalizada.includes("rapida")) return "🌭";

  // Si no coincide con ninguna categoría específica, devuelve un emoji genérico.
  return "🍴";
}


/*
 * AGREGAR PRODUCTOS AL CARRITO
 */

function agregarAlCarrito(productoId) {
  // Busca el producto del catálogo que tiene el ID recibido.
  const producto = productos.find(({ id }) => id === productoId);

  // Si el producto no existe, no continúa.
  if (!producto) return;

  // Busca si ese producto ya está en el carrito.
  // La desestructuración renombra productoId como id dentro del parámetro.
  const item = carrito.find(({ productoId: id }) => id === productoId);

  // Comprueba que no se supere el stock disponible.
  if ((item?.cantidad ?? 0) >= producto.stock) {
    notificar(`No hay más stock disponible de ${producto.nombre}.`, "error");
    return;
  }

  // Si ya existe, aumenta su cantidad.
  // Si todavía no existe, agrega un nuevo objeto al array.
  item ? item.cantidad++ : carrito.push({ productoId, cantidad: 1 });

  // Guarda el estado actualizado del carrito.
  guardarCarrito(carrito);

  // Invalida el ticket anterior porque el pedido cambió.
  limpiarTicket();

  // Actualiza la interfaz del catálogo y del carrito.
  renderizarProductos();
  renderizarCarrito();

  // Confirma visualmente que se agregó el producto.
  notificar(`${producto.nombre} agregado al pedido.`, "success");
}


/*
 * RENDERIZADO DEL CARRITO
 */

function renderizarCarrito() {
  // Obtiene el contenedor del carrito.
  const contenedor = document.getElementById("carrito");
  if (!contenedor) return;

  // Limpia el contenido anterior antes de dibujar el estado actual.
  contenedor.replaceChildren();

  // Si el carrito está vacío, muestra un mensaje.
  if (carrito.length === 0) {
    contenedor.innerHTML = '<p class="empty-state">Todavía no agregaste productos.</p>';
  } else {
    // Recorre cada elemento del carrito.
    carrito.forEach(({ productoId, cantidad }) => {
      // Busca los datos completos del producto en el catálogo.
      const producto = productos.find(({ id }) => id === productoId);
      if (!producto) return;

      // Crea una fila para mostrar el producto y sus controles de cantidad.
      const fila = document.createElement("article");
      fila.className = "cart-item";

      // Muestra nombre, precio unitario, importe y botones de interacción.
      fila.innerHTML = `
        <div class="cart-item-info"><h3>${escaparHTML(producto.nombre)}</h3><p>${formatoMoneda.format(producto.precio)} por unidad</p><strong>${formatoMoneda.format(producto.precio * cantidad)}</strong></div>
        <div class="quantity-control" aria-label="Cantidad de ${escaparHTML(producto.nombre)}">
          <button type="button" data-restar="${producto.id}" aria-label="Quitar una unidad">−</button><span>${cantidad}</span><button type="button" data-sumar="${producto.id}" aria-label="Agregar una unidad" ${cantidad >= producto.stock ? "disabled" : ""}>＋</button>
          <button class="remove-item" type="button" data-quitar="${producto.id}">Quitar</button>
        </div>`;

      // Agrega la fila al contenedor del carrito.
      contenedor.append(fila);
    });

    // Configura los botones para restar una unidad, sumar una unidad o quitar
    // completamente el producto. Number() convierte los IDs del HTML a números.
    contenedor.querySelectorAll("[data-restar]").forEach((boton) => boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.restar), -1)));
    contenedor.querySelectorAll("[data-sumar]").forEach((boton) => boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.sumar), 1)));
    contenedor.querySelectorAll("[data-quitar]").forEach((boton) => boton.addEventListener("click", () => quitarDelCarrito(Number(boton.dataset.quitar))));
  }

  // reduce() suma las cantidades de todos los productos para obtener
  // el total de unidades del carrito.
  const cantidadTotal = carrito.reduce((acumulado, item) => acumulado + item.cantidad, 0);

  // Actualiza el contador visible del carrito.
  const contador = document.getElementById("contador-carrito");
  if (contador) contador.textContent = String(cantidadTotal);

  // Recalcula los importes mostrados en la página.
  calcularTotal();
}


/*
 * MODIFICAR LA CANTIDAD DE UN PRODUCTO
 */

function cambiarCantidad(productoId, cambio) {
  // Busca el elemento correspondiente tanto en el carrito como en el catálogo.
  const item = carrito.find(({ productoId: id }) => id === productoId);
  const producto = productos.find(({ id }) => id === productoId);
  if (!item || !producto) return;

  // Calcula la nueva cantidad sumando el cambio recibido.
  // Por ejemplo, cambio = 1 suma una unidad y cambio = -1 resta una unidad.
  const nuevaCantidad = item.cantidad + cambio;

  // Impide superar el stock disponible.
  if (nuevaCantidad > producto.stock) {
    notificar("No hay stock suficiente para esa cantidad.", "error");
    return;
  }

  // Si la cantidad llega a cero o es menor, elimina el producto del carrito.
  if (nuevaCantidad <= 0) {
    quitarDelCarrito(productoId);
    return;
  }

  // Actualiza la cantidad del elemento.
  item.cantidad = nuevaCantidad;

  // Guarda los cambios y actualiza la interfaz.
  guardarCarrito(carrito);
  limpiarTicket();
  renderizarCarrito();
  renderizarProductos();
}


/*
 * QUITAR UN PRODUCTO DEL CARRITO
 */

function quitarDelCarrito(productoId) {
  // filter() crea un nuevo array que excluye el producto cuyo ID coincide.
  carrito = carrito.filter(({ productoId: id }) => id !== productoId);

  // Persiste el carrito actualizado y limpia el ticket anterior.
  guardarCarrito(carrito);
  limpiarTicket();

  // Refresca el carrito y el catálogo.
  renderizarCarrito();
  renderizarProductos();

  notificar("Producto quitado del pedido.", "success");
}


/*
 * CÁLCULO DE IMPORTES
 */

function calcularTotal() {
  // Obtiene el subtotal mediante la función importada desde carrito.js.
  const subtotal = calcularSubtotal(carrito, productos);

  // Busca la opción de propina seleccionada en el HTML.
  // Si no hay ninguna seleccionada, utiliza cero.
  const porcentaje = Number(document.querySelector('input[name="propina"]:checked')?.value ?? 0);

  // Calcula la propina y redondea el resultado al entero más cercano.
  const propina = Math.round(subtotal * porcentaje / 100);

  // Actualiza los importes visibles utilizando el formato de moneda argentina.
  document.getElementById("subtotal").textContent = formatoMoneda.format(subtotal);
  document.getElementById("monto-propina").textContent = formatoMoneda.format(propina);
  document.getElementById("total").textContent = formatoMoneda.format(subtotal + propina);
}


/*
 * LIMPIAR EL TICKET ANTERIOR
 */

function limpiarTicket() {
  const ticket = document.getElementById("ticket");

  // Si existe el contenedor del ticket, lo oculta y elimina su contenido.
  if (ticket) {
    ticket.hidden = true;
    ticket.replaceChildren();
  }
}


/*
 * CONFIRMAR LA COMPRA
 */

function confirmarCompra() {
  // No permite confirmar un pedido sin productos.
  if (carrito.length === 0) {
    notificar("Tu pedido está vacío. Agregá al menos un producto.", "error");
    return;
  }

  // every() comprueba que todos los elementos del carrito cumplan las condiciones:
  // que el producto exista, la cantidad sea un entero positivo y haya stock suficiente.
  const pedidoValido = carrito.every(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    return producto && Number.isInteger(cantidad) && cantidad > 0 && producto.stock >= cantidad;
  });

  // Si al menos un elemento no es válido, se cancela la compra.
  if (!pedidoValido) {
    notificar("El stock cambió y no alcanza para completar el pedido. Revisá las cantidades.", "error");
    return;
  }

  // Calcula subtotal, porcentaje de propina, importe de propina y total final.
  const subtotal = calcularSubtotal(carrito, productos);
  const porcentaje = Number(document.querySelector('input[name="propina"]:checked')?.value ?? 0);
  const propina = Math.round(subtotal * porcentaje / 100);
  const totalFinal = subtotal + propina;

  // map() crea un array con los datos que necesita el ticket.
  // Se conserva esta información antes de vaciar el carrito.
  const lineasTicket = carrito.map(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    return { nombre: producto.nombre, cantidad, precio: producto.precio, total: producto.precio * cantidad };
  });

  // Recorre los productos del carrito y utiliza el método vender()
  // de cada objeto Producto para descontar las unidades compradas.
  carrito.forEach(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    producto.vender(cantidad);
  });

  // Guarda los productos con el stock actualizado.
  guardarProductos(productos);

  // Vacía el carrito y persiste ese estado.
  carrito = [];
  guardarCarrito(carrito);

  // Actualiza el catálogo y el carrito luego de la compra.
  renderizarProductos();
  renderizarCarrito();

  // Restablece la selección de propina al 0 %.
  document.querySelector('input[name="propina"][value="0"]').checked = true;

  // Genera el ticket con los datos calculados previamente.
  renderizarTicket(lineasTicket, subtotal, porcentaje, propina, totalFinal);

  // Informa que la operación finalizó correctamente.
  notificar("¡Compra confirmada! Gracias por elegir El Oasis.", "success");
}


/*
 * CONSTRUCCIÓN DEL TICKET DE COMPRA
 */

function renderizarTicket(lineas, subtotal, porcentaje, propina, total) {
  // Obtiene el contenedor del ticket, limpia su contenido y lo muestra.
  const ticket = document.getElementById("ticket");
  ticket.replaceChildren();
  ticket.hidden = false;

  // Genera la fecha y hora actual con formato regional argentino.
  const fecha = new Date().toLocaleString("es-AR");

  // Crea el encabezado del ticket con el logo y el nombre del restaurante.
  const encabezado = document.createElement("div");
  encabezado.className = "receipt-heading";
  encabezado.innerHTML = `<img src="assets/img/logo-solo-oasis.jpg" alt="" width="42" height="42"><div><h2>El Oasis</h2><p>Ticket de compra</p></div>`;
  ticket.append(encabezado);

  // Crea y agrega el elemento que muestra la fecha.
  const fechaTicket = document.createElement("p");
  fechaTicket.className = "receipt-date";
  fechaTicket.textContent = fecha;
  ticket.append(fechaTicket);

  // Recorre las líneas de compra y crea una fila por cada producto.
  lineas.forEach(({ nombre, cantidad, precio, total: totalLinea }) => {
    const linea = document.createElement("div");
    linea.className = "receipt-line";

    // textContent inserta el contenido como texto, sin interpretarlo como HTML.
    const descripcion = document.createElement("span");
    descripcion.textContent = `${nombre} × ${cantidad} (${formatoMoneda.format(precio)} c/u)`;

    // Crea el importe correspondiente a esa línea.
    const importe = document.createElement("strong");
    importe.textContent = formatoMoneda.format(totalLinea);

    // Inserta la descripción y el importe dentro de la fila.
    linea.append(descripcion, importe);
    ticket.append(linea);
  });

  // Construye el resumen con subtotal, propina y total final.
  const resumen = document.createElement("div");
  resumen.className = "receipt-summary";
  resumen.innerHTML = `<p><span>Subtotal</span><strong>${formatoMoneda.format(subtotal)}</strong></p><p><span>Propina (${porcentaje}%)</span><strong>${formatoMoneda.format(propina)}</strong></p><p class="receipt-total"><span>Total</span><strong>${formatoMoneda.format(total)}</strong></p>`;
  ticket.append(resumen);

  // Agrega el mensaje final de agradecimiento.
  const gracias = document.createElement("p");
  gracias.className = "receipt-thanks";
  gracias.textContent = "¡Gracias por tu compra!";
  ticket.append(gracias);

  // Desplaza la página suavemente hasta el ticket para que el usuario lo vea.
  ticket.scrollIntoView({ behavior: "smooth", block: "nearest" });
}


/*
 * CONFIGURACIÓN DE EVENTOS DEL MENÚ
 */

function configurarMenu() {
  // Cada vez que cambia el texto del buscador, vuelve a renderizar los productos.
  document.getElementById("buscador")?.addEventListener("input", renderizarProductos);

  // Cuando cambia la opción de propina, recalcula los importes.
  document.querySelectorAll('input[name="propina"]').forEach((opcion) => opcion.addEventListener("change", calcularTotal));

  // El botón de confirmar compra ejecuta la función correspondiente.
  document.getElementById("confirmar-compra")?.addEventListener("click", confirmarCompra);

  // Configura el botón para vaciar completamente el carrito.
  document.getElementById("vaciar-carrito")?.addEventListener("click", () => {
    // Si ya está vacío, informa al usuario y no hace nada más.
    if (carrito.length === 0) {
      notificar("El pedido ya está vacío.", "info");
      return;
    }

    // Vacía el carrito, guarda el cambio y actualiza la interfaz.
    carrito = [];
    guardarCarrito(carrito);
    limpiarTicket();
    renderizarCarrito();
    renderizarProductos();
    notificar("Pedido vaciado correctamente.", "success");
  });
}


/*
 * RENDERIZADO DEL PANEL DE ADMINISTRACIÓN
 */

function renderizarAdministracion() {
  // Busca el contenedor donde se mostrarán los productos administrables.
  const contenedor = document.getElementById("lista-admin");
  if (!contenedor) return;

  // Recupera y normaliza el texto del buscador administrativo.
  const busqueda = document.getElementById("buscador-admin")?.value.toLocaleLowerCase("es-AR").trim() ?? "";

  // Filtra los productos por nombre o categoría.
  const filtrados = productos.filter(({ nombre, categoria }) => `${nombre} ${categoria}`.toLocaleLowerCase("es-AR").includes(busqueda));

  // Limpia la lista anterior.
  contenedor.replaceChildren();

  // Muestra el número total de productos, usando singular o plural según corresponda.
  document.getElementById("cantidad-productos").textContent = `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`;

  // Si no hay coincidencias, muestra un mensaje y termina.
  if (filtrados.length === 0) {
    contenedor.innerHTML = '<p class="empty-state">No hay productos que coincidan con la búsqueda.</p>';
    return;
  }

  // Crea una fila administrativa para cada producto filtrado.
  filtrados.forEach((producto) => {
    const fila = document.createElement("article");
    fila.className = "admin-product-row";

    // Muestra el nombre, la categoría, el precio, el stock y los botones de acción.
    fila.innerHTML = `
      <div class="admin-product-main"><span class="admin-product-icon" aria-hidden="true">${iconoCategoria(producto.categoria)}</span><div><h3>${escaparHTML(producto.nombre)}</h3><p>${escaparHTML(producto.categoria)} · ${formatoMoneda.format(producto.precio)}</p></div></div>
      <div class="admin-stock"><span>Stock</span><div class="quantity-control"><button type="button" data-stock="-1" data-id="${producto.id}" aria-label="Restar una unidad de stock">−</button><strong>${producto.stock}</strong><button type="button" data-stock="1" data-id="${producto.id}" aria-label="Sumar una unidad de stock">＋</button></div></div>
      <button class="button button-danger" type="button" data-eliminar="${producto.id}">Eliminar</button>`;

    // Agrega la fila al panel.
    contenedor.append(fila);
  });

  // Asocia los botones de stock con ajustarStock().
  // data-id identifica el producto y data-stock indica si se suma o resta.
  contenedor.querySelectorAll("[data-stock]").forEach((boton) => boton.addEventListener("click", () => ajustarStock(Number(boton.dataset.id), Number(boton.dataset.stock))));

  // Asocia los botones de eliminación con eliminarProducto().
  contenedor.querySelectorAll("[data-eliminar]").forEach((boton) => boton.addEventListener("click", () => eliminarProducto(Number(boton.dataset.eliminar))));
}


/*
 * CONFIGURACIÓN DE EVENTOS DEL PANEL ADMINISTRATIVO
 */

function configurarAdministracion() {
  // Actualiza la lista cuando cambia el texto de búsqueda.
  document.getElementById("buscador-admin")?.addEventListener("input", renderizarAdministracion);

  // Escucha el envío del formulario para crear un producto.
  document.getElementById("formulario-producto")?.addEventListener("submit", (evento) => {
    // Evita que el navegador recargue la página al enviar el formulario.
    evento.preventDefault();

    // Obtiene los valores ingresados. trim() elimina espacios exteriores
    // y Number() convierte los campos numéricos a números.
    const nombre = document.getElementById("nombre").value.trim();
    const precio = Number(document.getElementById("precio").value);
    const categoria = document.getElementById("categoria").value.trim();
    const stock = Number(document.getElementById("stock").value);

    // Valida que los campos tengan contenido y que los números sean válidos.
    // El precio debe ser finito y positivo; el stock debe ser un entero no negativo.
    if (!nombre || !categoria || !Number.isFinite(precio) || precio <= 0 || !Number.isInteger(stock) || stock < 0) {
      notificar("Completá todos los campos con valores válidos.", "error");
      return;
    }

    // Comprueba que no exista otro producto con el mismo nombre,
    // sin distinguir entre mayúsculas y minúsculas.
    const nombreDuplicado = productos.some(({ nombre: existente }) => existente.toLocaleLowerCase("es-AR") === nombre.toLocaleLowerCase("es-AR"));
    if (nombreDuplicado) {
      notificar("Ya existe un producto con ese nombre.", "error");
      return;
    }

    // Crea una instancia de Producto utilizando la clase importada.
    // obtenerSiguienteId() permite generar el próximo identificador.
    // push() agrega el nuevo producto al array del catálogo.
    productos.push(new Producto(obtenerSiguienteId(productos), nombre, precio, categoria, stock));

    // Persiste el catálogo, limpia el formulario y actualiza la lista.
    guardarProductos(productos);
    evento.currentTarget.reset();
    renderizarAdministracion();
    notificar("Producto agregado al catálogo.", "success");
  });
}


/*
 * AJUSTAR EL STOCK DE UN PRODUCTO
 */

function ajustarStock(productoId, cambio) {
  // Busca el producto que se desea modificar.
  const producto = productos.find(({ id }) => id === productoId);
  if (!producto) return;

  // Calcula el nuevo stock sumando el cambio recibido.
  const nuevoStock = producto.stock + cambio;

  // Impide que el stock sea negativo.
  if (nuevoStock < 0) {
    notificar("El stock no puede ser menor que cero.", "error");
    return;
  }

  // Si se intenta reducir el stock, verifica que el nuevo valor no quede
  // por debajo de la cantidad de ese producto que ya figura en el carrito.
  if (cambio < 0 && carrito.some((item) => item.productoId === productoId && item.cantidad > nuevoStock)) {
    notificar("No podés bajar el stock por debajo de las unidades que hay en un pedido.", "error");
    return;
  }

  // Actualiza el stock del objeto y guarda el catálogo.
  producto.stock = nuevoStock;
  guardarProductos(productos);

  // Actualiza la lista administrativa y muestra una confirmación.
  renderizarAdministracion();
  notificar("Stock actualizado.", "success");
}


/*
 * ELIMINAR UN PRODUCTO DEL CATÁLOGO
 */

function eliminarProducto(productoId) {
  // Busca el producto para comprobar que exista y recuperar su nombre.
  const producto = productos.find(({ id }) => id === productoId);
  if (!producto) return;

  // filter() crea un catálogo nuevo sin el producto eliminado.
  productos = productos.filter(({ id }) => id !== productoId);

  // También lo quita del carrito para evitar referencias a productos inexistentes.
  carrito = carrito.filter(({ productoId: id }) => id !== productoId);

  // Guarda ambos arrays actualizados.
  guardarProductos(productos);
  guardarCarrito(carrito);

  // Actualiza el panel y notifica al usuario.
  renderizarAdministracion();
  notificar(`${producto.nombre} fue eliminado del catálogo.`, "success");
}


/*
 * PUNTO DE ENTRADA
 */

// Ejecuta la inicialización cuando el navegador carga este módulo.
// La función es async porque necesita esperar la carga del catálogo.
iniciarAplicacion();

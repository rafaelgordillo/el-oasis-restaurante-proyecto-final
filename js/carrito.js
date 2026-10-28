
 // Clave que se utiliza para guardar y recuperar el carrito en localStorage.
const CLAVE_CARRITO = "elOasisCarrito";

// Recupera el carrito guardado en el navegador y comprueba que sus datos sean válidos.
export function cargarCarrito(productos) {
  try {
    // Obtiene los datos guardados como texto y los convierte en un array u objeto JavaScript
    // mediante JSON.parse(). Si no hay datos guardados (null), utiliza un array vacío.
    const datosGuardados = JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? "[]");

    // Verifica que los datos recuperados sean un array.
    // Si no lo son, devuelve un carrito vacío.
    if (!Array.isArray(datosGuardados)) return [];

    // filter() recorre los elementos guardados y conserva únicamente los que cumplen
    // las condiciones de validación.
    return datosGuardados.filter((item) => {
      // some() comprueba si existe al menos un producto del catálogo cuyo ID coincida
      // con el producto guardado en el carrito.
      // Number() convierte productoId a número antes de compararlo.
      const productoExiste = productos.some((producto) => producto.id === Number(item.productoId));

      // El producto debe existir y la cantidad debe ser un número entero mayor que cero.
      // Number.isInteger() verifica que la cantidad no tenga decimales.
      return productoExiste && Number.isInteger(Number(item.cantidad)) && Number(item.cantidad) > 0;

    // map() transforma los elementos válidos para que productoId y cantidad
    // queden almacenados como números, aunque originalmente fueran texto.
    }).map(({ productoId, cantidad }) => ({
      // Desestructuración: obtiene estas propiedades del objeto y las convierte a número.
      productoId: Number(productoId),
      cantidad: Number(cantidad)
    }));

  // Si ocurre un error al leer o interpretar los datos guardados,
  // catch captura el error y devuelve un carrito vacío.
  } catch {
    return [];
  }
}

// Guarda el carrito actual en el almacenamiento local del navegador.
export function guardarCarrito(carrito) {
  // JSON.stringify() convierte el array de objetos en texto JSON,
  // porque localStorage almacena los valores como cadenas de texto.
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

// Calcula el importe total de los productos que están en el carrito.
export function calcularSubtotal(carrito, productos) {
  // reduce() recorre el carrito y acumula el precio total de sus productos.
  // subtotal es el acumulador; comienza en cero.
  // La desestructuración obtiene productoId y cantidad de cada elemento.
  return carrito.reduce((subtotal, { productoId, cantidad }) => {

    // find() busca en el catálogo el producto cuyo ID coincide con el del carrito.
    // La desestructuración obtiene directamente la propiedad id.
    const producto = productos.find(({ id }) => id === productoId);

    // Si el producto existe, suma precio por cantidad al subtotal.
    // Si no existe, suma cero para evitar un error.
    return subtotal + (producto ? producto.precio * cantidad : 0);

  }, 0);
}

// Comprueba y ajusta los elementos del carrito según el catálogo y el stock disponible.
export function normalizarCarrito(carrito, productos) {
  // flatMap() permite transformar cada elemento y, si corresponde,
  // eliminarlo devolviendo un array vacío.
  return carrito.flatMap(({ productoId, cantidad }) => {

    // Busca el producto correspondiente en el catálogo.
    const producto = productos.find(({ id }) => id === productoId);

    // Si el producto no existe o no tiene stock, lo excluye del carrito.
    if (!producto || producto.stock <= 0) return [];

    // Math.min() elige el menor valor entre la cantidad solicitada
    // y el stock disponible, evitando superar las existencias.
    const cantidadValida = Math.min(cantidad, producto.stock);

    // Si la cantidad ajustada es mayor que cero, devuelve un nuevo objeto
    // con el producto y la cantidad válida; de lo contrario, lo excluye.
    return cantidadValida > 0 ? [{ productoId, cantidad: cantidadValida }] : [];
  });
}

const CLAVE_CARRITO = "elOasisCarrito";

export function cargarCarrito(productos) {
  try {
    const datosGuardados = JSON.parse(localStorage.getItem(CLAVE_CARRITO) ?? "[]");
    if (!Array.isArray(datosGuardados)) return [];

    return datosGuardados.filter((item) => {
      const productoExiste = productos.some((producto) => producto.id === Number(item.productoId));
      return productoExiste && Number.isInteger(Number(item.cantidad)) && Number(item.cantidad) > 0;
    }).map(({ productoId, cantidad }) => ({
      productoId: Number(productoId),
      cantidad: Number(cantidad)
    }));
  } catch {
    return [];
  }
}

export function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

export function calcularSubtotal(carrito, productos) {
  return carrito.reduce((subtotal, { productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    return subtotal + (producto ? producto.precio * cantidad : 0);
  }, 0);
}

export function normalizarCarrito(carrito, productos) {
  return carrito.flatMap(({ productoId, cantidad }) => {
    const producto = productos.find(({ id }) => id === productoId);
    if (!producto || producto.stock <= 0) return [];
    const cantidadValida = Math.min(cantidad, producto.stock);
    return cantidadValida > 0 ? [{ productoId, cantidad: cantidadValida }] : [];
  });
}

const CLAVE_PRODUCTOS = "elOasisProductos";
const RUTA_PRODUCTOS = new URL("../data/productos.json", import.meta.url);

export class Producto {
  constructor(id, nombre, precio, categoria, stock, imagen = "assets/img/productos/producto-generico.svg") {
    this.id = Number(id);
    this.nombre = String(nombre).trim();
    this.precio = Number(precio);
    this.categoria = String(categoria).trim();
    this.stock = Number(stock);
    this.imagen = String(imagen || "assets/img/productos/producto-generico.svg");
  }

  vender(cantidad) {
    if (!Number.isInteger(cantidad) || cantidad < 1 || this.stock < cantidad) {
      return false;
    }

    this.stock -= cantidad;
    return true;
  }
}

function catalogoValido(datos) {
  return Array.isArray(datos) && datos.every((producto) =>
    producto !== null &&
    Number.isInteger(Number(producto.id)) && Number(producto.id) > 0 &&
    typeof producto.nombre === "string" && producto.nombre.trim() !== "" &&
    Number.isFinite(Number(producto.precio)) && Number(producto.precio) > 0 &&
    typeof producto.categoria === "string" && producto.categoria.trim() !== "" &&
    Number.isInteger(Number(producto.stock)) && Number(producto.stock) >= 0
  );
}

export function leerProductosGuardados() {
  try {
    const datosGuardados = localStorage.getItem(CLAVE_PRODUCTOS);
    if (datosGuardados === null) return null;

    const datos = JSON.parse(datosGuardados);
    return catalogoValido(datos) ? datos.map((producto) => new Producto(
      producto.id, producto.nombre, producto.precio, producto.categoria, producto.stock, producto.imagen
    )) : null;
  } catch {
    return null;
  }
}

export function guardarProductos(productos) {
  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
}

export async function cargarCatalogo() {
  const productosGuardados = leerProductosGuardados();

  try {
    const respuesta = await fetch(RUTA_PRODUCTOS);
    if (!respuesta.ok) throw new Error(`La carga del catálogo respondió con HTTP ${respuesta.status}.`);

    const datos = await respuesta.json();
    if (!catalogoValido(datos)) throw new Error("El archivo JSON no contiene un catálogo válido.");

    if (productosGuardados !== null) {
      // Actualiza las rutas de imágenes del catálogo base sin perder stock ni cambios guardados.
      const imagenesPorId = new Map(datos.map(({ id, imagen }) => [Number(id), imagen]));
      const productosActualizados = productosGuardados.map((producto) => {
        const imagenDelCatalogo = imagenesPorId.get(Number(producto.id));
        if (imagenDelCatalogo) producto.imagen = imagenDelCatalogo;
        return producto;
      });
      guardarProductos(productosActualizados);
      return productosActualizados;
    }

    const productosIniciales = datos.map(({ id, nombre, precio, categoria, stock, imagen }) =>
      new Producto(id, nombre, precio, categoria, stock, imagen)
    );
    guardarProductos(productosIniciales);
    return productosIniciales;
  } catch (error) {
    if (productosGuardados !== null) return productosGuardados;
    throw error;
  }
}

export function obtenerSiguienteId(productos) {
  return productos.reduce((mayorId, { id }) => Math.max(mayorId, id), 0) + 1;
}

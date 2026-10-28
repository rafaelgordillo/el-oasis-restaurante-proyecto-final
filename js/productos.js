
// Clave utilizada para guardar y recuperar los productos en localStorage.
const CLAVE_PRODUCTOS = "elOasisProductos";

// Construye la ruta del archivo JSON que contiene el catálogo inicial.
// import.meta.url representa la URL del módulo actual.
// new URL() permite obtener una ruta relativa a ese módulo.
const RUTA_PRODUCTOS = new URL("../data/productos.json", import.meta.url);


/*
 * CLASE PRODUCTO
 */

// Define el modelo de cada producto del restaurante.
// Una clase permite crear múltiples objetos con las mismas propiedades y métodos.
export class Producto {

  // El constructor se ejecuta al crear una instancia con new Producto(...).
  // Recibe los datos del producto. imagen tiene un valor predeterminado
  // si no se proporciona ese argumento.
  constructor(id, nombre, precio, categoria, stock, imagen = "assets/img/productos/producto-generico.svg") {

    // Number() convierte el identificador a número.
    this.id = Number(id);

    // String() convierte el nombre a texto y trim() elimina los espacios
    // que pueda tener al principio o al final.
    this.nombre = String(nombre).trim();

    // Guarda el precio como número.
    this.precio = Number(precio);

    // Guarda la categoría como texto sin espacios exteriores.
    this.categoria = String(categoria).trim();

    // Guarda el stock como número.
    this.stock = Number(stock);

    // Si imagen tiene un valor válido, lo convierte a texto.
    // Si es un valor falsy, utiliza la ruta de la imagen genérica.
    this.imagen = String(imagen || "assets/img/productos/producto-generico.svg");
  }

  // Método que intenta vender una cantidad determinada del producto.
  vender(cantidad) {

    // Comprueba que la cantidad sea un entero, que sea al menos 1
    // y que exista stock suficiente.
    // Si alguna condición falla, devuelve false y no modifica el stock.
    if (!Number.isInteger(cantidad) || cantidad < 1 || this.stock < cantidad) {
      return false;
    }

    // Si la venta es válida, descuenta las unidades del stock.
    this.stock -= cantidad;

    // Devuelve true para indicar que la operación se realizó correctamente.
    return true;
  }
}


/*
 * VALIDACIÓN DEL CATÁLOGO
 */

function catalogoValido(datos) {

  // Comprueba que los datos sean un array y que todos sus productos
  // cumplan las condiciones definidas dentro de every().
  // every() devuelve true únicamente si todos los elementos pasan la validación.
  return Array.isArray(datos) && datos.every((producto) =>

    // El producto no puede ser null.
    producto !== null &&

    // El ID debe poder convertirse en un entero mayor que cero.
    Number.isInteger(Number(producto.id)) && Number(producto.id) > 0 &&

    // El nombre debe ser texto y no puede estar vacío ni contener solamente espacios.
    typeof producto.nombre === "string" && producto.nombre.trim() !== "" &&

    // El precio debe ser un número finito mayor que cero.
    Number.isFinite(Number(producto.precio)) && Number(producto.precio) > 0 &&

    // La categoría debe ser texto y no puede estar vacía.
    typeof producto.categoria === "string" && producto.categoria.trim() !== "" &&

    // El stock debe ser un entero igual o mayor que cero.
    Number.isInteger(Number(producto.stock)) && Number(producto.stock) >= 0
  );
}


/*
 * LEER PRODUCTOS GUARDADOS EN EL NAVEGADOR
 */

export function leerProductosGuardados() {
  try {
    // Recupera de localStorage el texto guardado con la clave del catálogo.
    const datosGuardados = localStorage.getItem(CLAVE_PRODUCTOS);

    // Si la clave no existe, devuelve null para indicar que no hay
    // un catálogo guardado disponible.
    if (datosGuardados === null) return null;

    // Convierte el texto JSON recuperado en datos de JavaScript.
    const datos = JSON.parse(datosGuardados);

    // Si el catálogo es válido, map() recorre los productos y crea
    // una instancia de la clase Producto para cada uno.
    // Si la validación falla, devuelve null.
    return catalogoValido(datos) ? datos.map((producto) => new Producto(
      producto.id, producto.nombre, producto.precio, producto.categoria, producto.stock, producto.imagen
    )) : null;

  // Si ocurre un error al acceder a localStorage o interpretar el JSON,
  // catch lo captura y devuelve null.
  } catch {
    return null;
  }
}


/*
 * GUARDAR PRODUCTOS EN EL NAVEGADOR
 */

export function guardarProductos(productos) {

  // JSON.stringify() convierte el array de productos a texto JSON.
  // localStorage almacena los valores como cadenas de texto.
  localStorage.setItem(CLAVE_PRODUCTOS, JSON.stringify(productos));
}


/*
 * CARGAR EL CATÁLOGO
 */

// async permite utilizar await dentro de la función.
// Esta función devuelve una promesa con el catálogo cargado.
export async function cargarCatalogo() {

  // Intenta recuperar primero el catálogo que ya está guardado en el navegador.
  const productosGuardados = leerProductosGuardados();

  try {
    // fetch() solicita el archivo JSON de productos.
    // await espera a que se complete la solicitud.
    const respuesta = await fetch(RUTA_PRODUCTOS);

    // Comprueba si la respuesta HTTP fue exitosa.
    // Si no lo fue, lanza un error que será gestionado por catch.
    if (!respuesta.ok) throw new Error(`La carga del catálogo respondió con HTTP ${respuesta.status}.`);

    // Convierte el contenido de la respuesta en datos JavaScript.
    // json() también devuelve una promesa, por eso se utiliza await.
    const datos = await respuesta.json();

    // Valida la estructura y el contenido del catálogo recibido.
    // Si no cumple las condiciones, genera un error.
    if (!catalogoValido(datos)) throw new Error("El archivo JSON no contiene un catálogo válido.");

    // Si ya había productos guardados, se conservan sus cambios
    // y se actualizan las rutas de imágenes usando el catálogo base.
    if (productosGuardados !== null) {

      // Map crea una colección de pares clave-valor:
      // el ID numérico es la clave y la imagen del catálogo base es el valor.
      const imagenesPorId = new Map(datos.map(({ id, imagen }) => [Number(id), imagen]));

      // Recorre los productos guardados y busca la imagen actualizada
      // correspondiente a cada ID.
      const productosActualizados = productosGuardados.map((producto) => {
        const imagenDelCatalogo = imagenesPorId.get(Number(producto.id));

        // Si encuentra una imagen, actualiza la propiedad imagen.
        // Las demás propiedades, como el stock, se conservan.
        if (imagenDelCatalogo) producto.imagen = imagenDelCatalogo;

        // Devuelve el producto actualizado para incluirlo en el nuevo array.
        return producto;
      });

      // Guarda los productos actualizados y los devuelve.
      guardarProductos(productosActualizados);
      return productosActualizados;
    }

    // Si todavía no existe un catálogo guardado, crea los productos iniciales
    // a partir de los objetos obtenidos del archivo JSON.
    const productosIniciales = datos.map(({ id, nombre, precio, categoria, stock, imagen }) =>
      new Producto(id, nombre, precio, categoria, stock, imagen)
    );

    // Guarda el catálogo inicial para conservarlo en futuras visitas.
    guardarProductos(productosIniciales);

    // Devuelve el catálogo inicial.
    return productosIniciales;

  } catch (error) {

    // Si falla la carga del archivo JSON pero había un catálogo guardado válido,
    // utiliza esos datos como alternativa.
    if (productosGuardados !== null) return productosGuardados;

    // Si tampoco hay datos guardados válidos, propaga el error
    // para que pueda manejarlo la función que llamó a cargarCatalogo().
    throw error;
  }
}


/*
 * GENERAR EL SIGUIENTE ID
 */

export function obtenerSiguienteId(productos) {

  // reduce() recorre los productos y conserva el ID más alto encontrado.
  // El acumulador comienza en cero.
  // Math.max() compara el ID acumulado con el ID del producto actual.
  // Al finalizar, se suma uno para obtener el siguiente identificador.
  return productos.reduce((mayorId, { id }) => Math.max(mayorId, id), 0) + 1;
}


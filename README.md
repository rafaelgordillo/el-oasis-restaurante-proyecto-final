# El Oasis — Simulador de restaurante

Aplicación web educativa desarrollada para el proyecto final del curso de JavaScript de Coderhouse. Simula la experiencia de un cliente que arma un pedido y un panel de administración para gestionar el catálogo.

## Funcionalidades

### Menú del cliente
- Carga inicial del catálogo desde `data/productos.json` mediante Fetch API.
- Búsqueda de productos por nombre o categoría.
- Carrito con aumento/disminución de cantidades y eliminación de artículos.
- Validación del stock disponible.
- Cálculo automático de subtotal, propina (0%, 10%, 15% o 20%) y total.
- Confirmación de compra, descuento de stock y generación de ticket.
- Persistencia del catálogo y del carrito mediante `localStorage`.

### Administración
- Alta de productos con validación de nombre, categoría, precio y stock.
- Actualización del stock desde el listado.
- Eliminación de productos del catálogo.
- Búsqueda dentro del catálogo.
- Los cambios se reflejan al volver al menú porque ambas páginas comparten el almacenamiento del mismo navegador.

## Tecnologías
- HTML5 y CSS3 responsive.
- JavaScript moderno con módulos ES.
- DOM y eventos.
- Arrays, objetos, clases y funciones de orden superior (`map`, `filter`, `find`, `some`, `reduce`, `forEach`, `flatMap`).
- Fetch API, `async/await`, `try/catch/finally`.
- `localStorage` y JSON.
- Toastify JS para notificaciones.

## Cómo ejecutar

`fetch()` necesita que el proyecto se abra mediante un servidor HTTP local. No abras `index.html` directamente con `file://`.

1. Descargá o cloná el repositorio.
2. Abrí la carpeta del proyecto en Visual Studio Code.
3. Iniciá Live Server desde `index.html`.
4. Abrí `index.html` para el menú del cliente.
5. Entrá a **Administración** desde la navegación para gestionar el catálogo.

## Estructura

```text
El-Oasis/
├── index.html
├── pages/
│   └── administracion.html
├── css/
│   └── style.css
├── js/
│   ├── productos.js
│   ├── carrito.js
│   └── main.js
├── data/
│   └── productos.json
├── assets/
│   └── img/
│       ├── logo-horizontal.png
│       ├── logo.svg
│       └── productos/
└── README.md
```

## Nota sobre la persistencia

Los cambios administrativos se guardan en `localStorage` del navegador actual y no modifican el archivo JSON del repositorio. Si se necesita restaurar el catálogo inicial durante las pruebas, se puede borrar las claves `elOasisProductos` y `elOasisCarrito` desde la consola del navegador y recargar la página.

Este proyecto es un simulador académico. La página de administración no tiene autenticación y no debe considerarse un panel seguro para producción.

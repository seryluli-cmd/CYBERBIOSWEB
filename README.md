# Gastos — CyberBIOS

PWA en JavaScript vanilla (sin build, sin frameworks) para que **CyberBIOS**
⌨️ registre gastos, facturación diaria y un checklist de ideas/metas del
negocio. La usa el dueño (admin) y sus empleados desde el celular como app
instalada (Firestore la mantiene sincronizada entre todos los dispositivos en
tiempo real, con soporte offline).

Este proyecto es una **copia adaptada** de la app "Gastos — Recreo & Pablo"
(carpeta hermana `HELADERIA Y PANCHERIA`, sociedad de 3 personas + 2
negocios) — comparten toda la base de código y arquitectura, pero **son
proyectos de Firebase, deploys y repos completamente separados**. Ningún
dato de un proyecto es visible desde el otro.

## Diferencias clave respecto al proyecto del que se copió

- **Un solo dueño, sin reparto de gastos.** No hay "socios" que se dividen
  cuentas — `socios` en Firestore tiene un único nombre (vos), que es
  siempre admin. La pestaña **Balance** (quién le debe a quién) se oculta
  sola cuando `socios.length <= 1` (ver `renderAjustesSocios()` en app.js).
- **Un solo negocio.** `NEGOCIOS` tiene un único elemento — la pantalla de
  "elegir negocio" se saltea sola al identificarte (`goToNegocioOrHome()`
  en app.js). Si algún día sumás un segundo negocio bajo este mismo
  proyecto, alcanza con agregar un objeto más a `NEGOCIOS` y todo lo demás
  ya sabe manejar N negocios.
- **Empleados editables desde la app, no solo en el setup.** A diferencia
  del proyecto original (donde los colaboradores solo se cargaban una vez
  al principio), acá en **Ajustes → Empleados** el admin puede agregar o
  quitar gente en cualquier momento (`agregarColaboradorDesdeAjustes()` /
  `quitarColaborador()`), usando `arrayUnion`/`arrayRemove` de Firestore.
- **Marca violeta** (`--series-1: #7c3aed`) en vez del azul original, e
  ícono ⌨️ en vez del "$" genérico.

El resto (Firestore + Auth anónima + Storage, identidad por PIN, editar/
borrar gastos y cierres siendo admin, Ideas/Metas compartidas con votos,
exportar CSV, service worker red-primero) funciona exactamente igual que en
el proyecto original — ver ahí el detalle técnico completo si hace falta
profundizar; acá va un resumen adaptado.

## Stack

- **Sin build ni npm.** HTML/CSS/JS servidos tal cual.
- **Firebase** (cargado por CDN): Firestore (tiempo real), Auth anónima
  (solo para que las reglas exijan `request.auth != null`), Storage (fotos
  de facturas, comprimidas en el navegador antes de subir).
- **Service worker** ([service-worker.js](service-worker.js)) — app shell
  offline, estrategia **red primero, caché como respaldo** (cualquier
  deploy nuevo se ve solo, sin quedar pegado a una versión vieja).
- **manifest.json** — "Agregar a pantalla de inicio" como app nativa.

## Archivos

| Archivo | Contenido |
|---|---|
| [index.html](index.html) | Todas las pantallas y modales del DOM. Un solo archivo, se muestra/oculta con clases `.screen`/`.active`. |
| [app.js](app.js) | Toda la lógica: estado en memoria, Firebase, render, event listeners. |
| [styles.css](styles.css) | Variables CSS (`:root`) para tema claro/oscuro automático. |
| [manifest.json](manifest.json) / [service-worker.js](service-worker.js) | Configuración PWA. |
| [icons/](icons/) | Íconos de la app (192/512/maskable). |

## Modelo de datos (Firestore)

- **`config/socios`** (un solo documento) —
  `{ socios: [string], colaboradores: string[], admins: string[], pins: { [nombre]: "1234" } }`.
  `socios` tiene un único nombre (vos, el dueño) y `admins` siempre lo
  incluye — no hay checkbox de admin en el setup porque no hace falta
  elegir. `colaboradores` (empleados) se puede editar después desde Ajustes.
- **`gastos`** — `{ importe, descripcion, categoria, pagadoPor, negocio, fecha, creadoEn, fotoUrl?, fotoPath? }`.
- **`facturacion`** — `{ importe, turno, registradoPor, negocio, fecha, creadoEn }`.
  `turno` es `"mañana"` | `"tarde"` | `"noche"` (constante `TURNOS` en app.js) —
  CyberBIOS tiene 3 turnos por día, cada uno carga su propia caja como un
  cierre separado. `turnoActual()` propone el turno según la hora (mañana
  06-14, tarde 14-22, noche 22-06) al abrir "Nuevo cierre", pero se puede
  cambiar a mano. La pantalla de Facturado suma los de **hoy** aparte
  (`facturado-total-hoy` / `facturado-turnos-hoy`, "X de 3 turnos cargados")
  además del total del mes. El **Resumen mensual** también tiene una
  sección "Facturado por día y turno" que agrupa los cierres del mes por
  día calendario y muestra el total de cada turno dentro de ese día.
- **`ideas`** — `{ texto, estado, votos, propuestoPor, creadoEn }`. `estado`
  es `"pendiente"` o `"concretada"`; `votos` es un array de nombres (🔥,
  toggle libre). Pendientes ordenadas por cantidad de votos. Cualquiera
  crea/vota/tilda; solo el admin borra.
- **Storage**: fotos en `recibos/{negocio}/{timestamp}_{random}.jpg`, se
  borran solas a los 4 meses (el gasto nunca se borra, solo la foto).

## Identidad y permisos (PIN + admin)

Cada persona se identifica con su nombre + un PIN de 4 dígitos (una vez por
celular, se recuerda hasta usar "Cambiar de usuario" en Ajustes). El admin
(vos) ve botones ✏️/🗑️ para editar y borrar gastos/cierres; los empleados
solo cargan y ven.

⚠️ **No es una capa de seguridad real** — cualquier dispositivo con la
`firebaseConfig` puede leer/escribir todo en Firestore sin pasar por el PIN
de la app. Sirve para identificar quién usa cada celular, no para proteger
los datos de alguien mal intencionado con la config.

## Navegación de pantallas

```
screen-quien-sos (identificarte con PIN)
  └─ screen-seccion (auto-entra directo, un solo negocio — elegir
       Gastos / Facturado / Resumen mensual / Ideas-Metas)
       ├─ screen-app       (tabs: Gastos, Balance*, Ajustes)
       ├─ screen-facturado
       ├─ screen-resumen
       └─ screen-ideas
screen-negocio (queda casi sin uso con un solo negocio — solo se ve si
  algún día se agrega un segundo negocio a NEGOCIOS)
screen-ajustes → screen-fotos (fotos guardadas)
```
\* la pestaña Balance está oculta por default (un solo dueño = balance
siempre trivial); reaparecería sola si `socios.length` pasa a ser > 1.

⚠️ Ojo con este punto si se toca la navegación: como `goToNegocioOrHome()`
saltea `screen-negocio` de una, **Ideas necesita su propio acceso directo
en `screen-seccion`** (ver `SECCIONES` en `renderSeccionCards()`) — si se
saca de ahí sin dejar otro camino, queda con código andando pero
inalcanzable desde la UI (pasó una vez, quedó documentado para no repetirlo).

## Exportar datos (CSV)

Ajustes → "Exportar datos" baja gastos y facturación como `.csv` (se abre
en Excel/Sheets), armado en el navegador con un `Blob`, sin librerías.

## Cómo probarlo en local

```bash
npx serve .
# o, si no hay Node instalado:
python -m http.server 5177
```

## Configurar Firebase (proyecto propio, separado del de Recreo & Pablo)

1. Crear proyecto gratis en `console.firebase.google.com` (con **otra
   cuenta o el mismo Google, pero un proyecto nuevo** — nunca reusar el
   proyecto `controlnegocios` de la otra sociedad).
2. Agregar una app "Web" y copiar el objeto `firebaseConfig`.
3. Activar **Firestore Database** (modo producción) y **Authentication →
   Anonymous**.
4. En Firestore → Reglas: `allow read, write: if request.auth != null;`
5. Activar **Storage** si se van a subir fotos de facturas (requiere plan
   Blaze — tiene cuota gratis amplia, ver la charla sobre esto en el
   proyecto original si hace falta el detalle).

## Estado del repo

Todavía no es un repositorio git ni tiene deploy — se creó copiando la
carpeta `HELADERIA Y PANCHERIA` y adaptándola. Avisar cuando se quiera
inicializar git y/o desplegar (Netlify, igual que el otro proyecto).

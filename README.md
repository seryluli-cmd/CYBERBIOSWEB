# Gastos — CyberBIOS

PWA en JavaScript vanilla (sin build, sin frameworks) para que **CyberBIOS**
⌨️ registre gastos, facturación diaria y un checklist de ideas/metas del
negocio. La usa el dueño (admin) y sus colaboradores desde el celular como app
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
  sola cuando `socios.length <= 1` (ver `renderAjustesSocios()` en
  ajustes.js).
- **Un solo negocio.** `NEGOCIOS` tiene un único elemento — la pantalla de
  "elegir negocio" se saltea sola al identificarte (`goToNegocioOrHome()`
  en sesion.js). Si algún día sumás un segundo negocio bajo este mismo
  proyecto, alcanza con agregar un objeto más a `NEGOCIOS` y todo lo demás
  ya sabe manejar N negocios.
- **Colaboradores editables desde la app, no solo en el setup.** A diferencia
  del proyecto original (donde los colaboradores solo se cargaban una vez
  al principio), acá en **Ajustes → Colaboradores** el admin puede agregar o
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

`app.js` importa de todos los módulos de abajo — arranca la app y cablea
los event listeners de la UI, pero ya no tiene la lógica de cada pantalla.

| Archivo | Contenido |
|---|---|
| [index.html](index.html) | Todas las pantallas y modales del DOM. Un solo archivo, se muestra/oculta con clases `.screen`/`.active`. |
| [state.js](state.js) | Estado compartido entre pantallas (`state`) y las constantes fijas (config de Firebase, negocios, categorías default, PIN, etc.). |
| [utils.js](utils.js) | Funciones puras/DOM sin estado: plata, fechas, turnos, colores por nombre, CSV, compresión de fotos. |
| [firebase.js](firebase.js) | Carga del SDK de Firebase por CDN e inicio de sesión/conexión (`connectAndBoot`). |
| [identidad.js](identidad.js) | Chips de pagador compartidos y color por nombre. |
| [sesion.js](sesion.js) | Pantalla "¿Quién sos?" + PIN, socios/colaboradores en vivo, estado de conectividad. |
| [navegacion.js](navegacion.js) | Tarjetas de negocio/sección y cambio de pestañas dentro de `screen-app`. |
| [setup.js](setup.js) | Pantalla de configuración inicial (pegar `firebaseConfig` a mano). |
| [gastos.js](gastos.js) | Pantalla Gastos y Gastos S/Admin: listado, modal, fotos, chips de pagador, CSV. |
| [facturado.js](facturado.js) | Pantalla Facturado / Cierre de Turno, incluida la detección de cajas faltantes. |
| [resumen.js](resumen.js) | Resumen mensual y Balance entre socios. |
| [checklist.js](checklist.js) | Fábrica compartida por Ideas y Reportes de Mantenimiento (`crearModuloChecklist`). |
| [ideas.js](ideas.js) / [reportes.js](reportes.js) | Configuran `checklist.js` con su colección, ids del DOM y textos puntuales. |
| [ajustes.js](ajustes.js) | Pantalla Ajustes: socios/colaboradores, categorías, tema, exportar CSV, reset. |
| [app.js](app.js) | Arranque (`start()`/`attemptReconnect()`) y cableado de todos los `addEventListener` de la UI. |
| [styles.css](styles.css) | Variables CSS (`:root`) para tema claro/oscuro automático. |
| [manifest.json](manifest.json) / [service-worker.js](service-worker.js) | Configuración PWA. |
| [icons/](icons/) | Íconos de la app (192/512/maskable). |

## Modelo de datos (Firestore)

- **`config/socios`** (un solo documento) —
  `{ socios: [string], colaboradores: string[], admins: string[], pins: { [nombre]: "1234" }, categoriasGastos: string[] }`.
  `socios` tiene un único nombre (vos, el dueño) y `admins` siempre lo
  incluye — no hay checkbox de admin en el setup porque no hace falta
  elegir. El campo `colaboradores` se puede editar después desde Ajustes.
- **`gastos`** — `{ importe, descripcion, categoria, pagadoPor, negocio, fecha, creadoEn, soloAdmin?, fotoUrl?, fotoPath? }`.
  `categoria` es el nombre de una de las categorías editables desde Ajustes
  → "Categorías de gastos" (ver `categoriasGastos` arriba) — ya no son
  opciones fijas en el HTML, y no tienen ninguna noción de privacidad.
  `soloAdmin` sí es lo que marca un gasto individual como privado
  (checkbox "🔒 Gasto Admin" en el modal) — ver "Identidad y permisos"
  abajo.
- **`facturacion`** — `{ importe, turno, registradoPor, negocio, fecha, creadoEn }`.
  `turno` es `"mañana"` | `"tarde"` | `"noche"` de lunes a sábado — pero
  **el domingo es distinto: solo 2 turnos de 12hs, `"t1"` (06-18) y `"t2"`
  (18-06)**, en vez de los 3 de siempre. `turnosDelDia(fecha)` en utils.js
  es el único lugar que decide qué esquema aplica a una fecha dada; de ahí
  toman la lista tanto el selector de turno del modal (los chips se arman
  según el día elegido) como la grilla de cajas faltantes y el desglose por
  turno de Resumen — nadie más pregunta "¿es domingo?" por su cuenta. Cada
  turno carga su propia caja como un cierre separado. `turnoActual()`
  propone el turno según la hora (mañana 06-14, tarde 14-22, noche 22-06;
  domingo t1 06-18, t2 18-06) al abrir "Nuevo cierre", pero se puede
  cambiar a mano. Si se cambia la fecha a un día del otro esquema, el
  turno se vuelve a proponer según la hora
  (`turnoSugeridoParaFecha()`) para que nunca quede sin elegir — salvo
  editando un cierre ya cargado, donde se deselecciona a propósito para
  no reescribirle el turno a un dato histórico. La pantalla de Facturado suma los de **hoy** aparte
  (`facturado-total-hoy` / `facturado-turnos-hoy`, "X de N turnos
  cargados", N según el día) además del total del mes. El **Resumen
  mensual** también tiene una sección "Facturado por día y turno" que
  agrupa los cierres del mes por día calendario y muestra el total de cada
  turno dentro de ese día.
- **Detección de cajas faltantes** (`turnosDelMes()` / `turnoVencimiento()`
  en utils.js, usadas desde facturado.js): la lista de "Cierre de Turno" arma la grilla completa del mes
  en curso (día 1 a hoy, orden Mañana → Tarde → Noche —o T1 → T2 los
  domingos—, más reciente primero). Cualquier turno cuya ventana + los 40 min de gracia ya pasaron
  y todavía no tiene cierre cargado aparece como fila roja "⚠️ CAJA NO
  CARGADA" con un botón **Cargar** — lo puede usar cualquiera (admin o
  colaborador) en cualquier momento, abre "Nuevo cierre" con esa fecha/turno
  ya preseleccionados. Un turno todavía en curso (no venció) simplemente no
  se muestra hasta que se cargue o venza. Esto no se reconstruye para
  meses anteriores a hoy — ahí la lista sigue mostrando solo lo real, sin
  grilla de faltantes.
- **`ideas`** — `{ texto, estado, votos, propuestoPor, creadoEn }`. `estado`
  es `"pendiente"` o `"concretada"`; `votos` es un array de nombres (🔥,
  toggle libre). Pendientes ordenadas por cantidad de votos. Cualquiera
  crea/vota/tilda; solo el admin borra.
- **`reportes`** — misma estructura y mecánica que `ideas` (ver arriba),
  pero para "Reportes de Mantenimiento" 🔨: `{ texto, estado, votos,
  propuestoPor, resueltoPor?, creadoEn }` con `estado` `"pendiente"` o
  `"resuelto"` (en vez de `"concretada"`, para que tenga sentido con "se
  arregló"). `resueltoPor` solo existe mientras está resuelto — se guarda
  con quién lo tildó (`toggleReporteEstado()`) y se borra si se reabre; la
  tarjeta muestra "Reportado por X" y, si corresponde, "Resuelto por Y"
  debajo. Es una sección aparte, debajo de "Caja de IDEAS" en `SECCIONES`
  (`renderSeccionCards()` en navegacion.js), con su propia colección de
  Firestore — no comparte datos con `ideas`. Toda la mecánica vive en
  checklist.js (compartida con Ideas, ver `crearModuloChecklist()`) —
  reportes.js solo configura la colección, los ids del DOM y los textos
  puntuales.
- **Storage**: fotos en `recibos/{negocio}/{timestamp}_{random}.jpg`, se
  borran solas a los 4 meses (el gasto nunca se borra, solo la foto).

## Identidad y permisos (PIN + admin)

Cada persona se identifica con su nombre + un PIN de 4 dígitos (una vez por
celular, se recuerda hasta usar "Cambiar de usuario" en Ajustes). El admin
(vos) ve botones ✏️/🗑️ para editar y borrar gastos/cierres; los colaboradores
solo cargan y ven.

Además, dos vistas con totales mensuales/históricos son **solo para el
admin** (los colaboradores no las ven en absoluto, ni la tarjeta para entrar):
- La sección **"Resumen mensual"** (`soloAdmin` en `SECCIONES`, dentro de
  `renderSeccionCards()` en navegacion.js) — no aparece como tarjeta para
  colaboradores.
- El bloque **"Facturado este mes"** dentro de "Cierre de Turno"
  (`#facturado-total-mes-wrap`, ocultado en `renderFacturado()` —
  facturado.js — según `esAdmin`) — los colaboradores solo ven el total de
  "Hoy".

**Categorías de gasto editables**: el admin puede crear/borrar categorías
desde Ajustes → "Categorías de gastos" (`categoriasGastos` en Firestore,
arriba) — son simples nombres, sin ninguna noción de privacidad.

**Gastos privados ("Gasto Admin")**: al cargar o editar un gasto, el admin
(y solo el admin — un colaborador ni ve el campo) puede tildar el
checkbox **"🔒 Gasto Admin"**, que guarda `soloAdmin: true` en ese gasto
puntual — de cualquier categoría, no hace falta que la categoría sea
especial. `renderGastos()` y `exportGastosCSV()` (gastos.js) filtran los gastos con
`soloAdmin` cuando `!esAdmin`, así un colaborador nunca los ve ni en la
lista ni en el CSV. Para cargarlos/verlos rápido sin scrollear entre los
gastos públicos, tienen su propia pantalla **"Gastos S/Admin"** (`soloAdmin`
en `SECCIONES`, misma lógica que "Resumen mensual" de arriba) — no
reemplaza la lista común: el admin que entra a "Gastos" sigue viendo
también los privados mezclados (con un aviso "🔒 Solo admin" en la fila
para distinguirlos). El total sí entra en Resumen mensual (ya admin-only)
como cualquier otro gasto. Borrar una categoría no toca los gastos que ya
la tienen cargada, solo deja de poder elegirse para gastos nuevos.

⚠️ **No es una capa de seguridad real** — cualquier dispositivo con la
`firebaseConfig` puede leer/escribir todo en Firestore sin pasar por el PIN
de la app. Sirve para identificar quién usa cada celular, no para proteger
los datos de alguien mal intencionado con la config.

## Navegación de pantallas

```
screen-quien-sos (identificarte con PIN)
  └─ screen-seccion (auto-entra directo, un solo negocio — elegir
       Gastos / Facturado / Resumen mensual / Caja de IDEAS)
       ├─ screen-app       (tabs: Gastos, Balance*, Ajustes)
       ├─ screen-facturado
       ├─ screen-gastos-admin (Gastos S/Admin***)
       ├─ screen-resumen
       ├─ screen-ideas
       └─ screen-mantenimiento
screen-negocio (queda casi sin uso con un solo negocio — solo se ve si
  algún día se agrega un segundo negocio a NEGOCIOS)
screen-ajustes → screen-fotos (fotos guardadas)
```
\* la pestaña Balance está oculta por default (un solo dueño = balance
siempre trivial); reaparecería sola si `socios.length` pasa a ser > 1.
\*\*\* "Gastos S/Admin" es `soloAdmin` en `SECCIONES` — no aparece como
tarjeta para colaboradores, igual que "Resumen mensual".

⚠️ Ojo con este punto si se toca la navegación: como `goToNegocioOrHome()`
(sesion.js) saltea `screen-negocio` de una, **Ideas y Mantenimiento
necesitan su propio acceso directo en `screen-seccion`** (ver `SECCIONES`
en `renderSeccionCards()`, navegacion.js) — si se sacan de ahí sin dejar
otro camino, quedan
con código andando pero inalcanzables desde la UI (pasó una vez con Ideas,
quedó documentado para no repetirlo).

## Exportar datos (CSV)

Ajustes → "Exportar datos" baja gastos y facturación como `.csv` (se abre
en Excel/Sheets), armado en el navegador con un `Blob`, sin librerías.

## Cómo probarlo en local

```bash
npx serve .
# o, si no hay Node instalado:
python -m http.server 5179
```

## Configurar Firebase (proyecto propio, separado del de Recreo & Pablo)

La config de Firebase de este negocio (proyecto `controlinterno-659c4`) ya
viene incluida en el código (`DEFAULT_FIREBASE_CONFIG` en state.js) — por eso
al abrir la app por primera vez en un dispositivo nuevo no hay que pegar
nada, `attemptReconnect()` la usa sola y entra directo. La pantalla de
pegar `firebaseConfig` (`screen-setup`) sigue existiendo como respaldo
manual (botón "Configurar de nuevo" si falla la conexión) y para el caso de
arrancar un negocio distinto desde cero:

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

Repositorio git con remoto en GitHub (`seryluli-cmd/CYBERBIOSWEB`). El
deploy es automático: Netlify (plan personal/pago, que además habilita
password protection del sitio y Netlify Identity si algún día hace falta
login real en vez del PIN) está conectado a este repo y publica solo con
cada push a `master` — no hace falta generar ni subir ningún `.zip` a
mano.

**App en producción: https://cyberbios.netlify.app**

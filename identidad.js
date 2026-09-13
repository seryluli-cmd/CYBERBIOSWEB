// ============================================================
// Identidad / permisos compartidos entre pantallas — quién es cada
// "pagador" (socio o colaborador) y su color. No incluye el flujo de
// login (¿Quién sos? + PIN) — eso vive en sesion.js.
// ============================================================
import { state, NEUTRAL_VAR } from "./state.js";
import { $, socioColorVar, colorDesdeNombre } from "./utils.js";

export function allPagadores() {
  return state.socios.concat(state.colaboradores);
}

// Chips de "¿quién es?" — mismo componente en 2 modales (Nuevo gasto y
// Nuevo cierre), solo cambia dónde se guarda el nombre elegido (ver
// onSeleccionar) y en qué wrap del DOM se dibuja.
export function renderPagadorChipsEn(wrapId, onSeleccionar) {
  const wrap = $(wrapId);
  wrap.innerHTML = "";
  allPagadores().forEach((nombre) => {
    const chip = document.createElement("div");
    chip.className = "pagador-chip";
    chip.textContent = nombre;
    chip.style.setProperty("--chip-color", payerColorVar(nombre));
    chip.addEventListener("click", () => {
      onSeleccionar(nombre);
      wrap.querySelectorAll(".pagador-chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
    });
    wrap.appendChild(chip);
  });
}

// Color de identidad para cualquier "pagador": el dueño tiene su color
// categórico propio (el de siempre); cada colaborador tiene su propio
// color estable derivado de su nombre, para distinguirlos a simple vista
// igual que al dueño.
export function payerColorVar(name) {
  const idx = state.socios.indexOf(name);
  if (idx !== -1) return socioColorVar(idx);
  if (state.colaboradores.indexOf(name) !== -1) return colorDesdeNombre(name);
  return NEUTRAL_VAR;
}

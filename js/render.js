/**
 * FUNCIONES DE RENDERIZADO
 * Generan el HTML para las diferentes secciones del portal
 */

/**
 * Renderiza la tarjeta de la próxima clase
 * @param {Object} c - Datos de la clase
 * @returns {string} HTML de la tarjeta
 */
function esSinClase(c) {
  return String(c?.tipo || "").toLowerCase().includes("sin clase");
}

function obtenerTipoVisual(c) {
  if (esSinClase(c)) {
    return {
      clase: "badge-sin-clase",
      etiqueta: "Sin Clase",
    };
  }

  return c?.tipo?.includes("virtual")
    ? { clase: "badge-virtual", etiqueta: "Virtual" }
    : { clase: "badge-presencial", etiqueta: "Presencial" };
}

function renderNoClassCard(c) {
  const fechaFmt = formatearFecha(c.fecha);
  const motivosHtml = c.temas?.length
    ? c.temas.map(t => `<span class="topic-chip topic-chip-muted">${escapeHtml(t.texto)}</span>`).join("")
    : '<span class="topic-chip topic-chip-muted">Sin detalle cargado</span>';

  return `
    <div class="no-class-card">
      <div class="no-class-eyebrow">Sin Clase</div>
      <div class="no-class-date">${fechaFmt.dia} <span>· ${fechaFmt.hora}</span></div>
      <div class="badges no-class-badges">
        <span class="badge badge-sin-clase">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="8"></circle>
            <path d="M8.5 8.5l7 7"></path>
          </svg>
          Sin Clase
        </span>
      </div>
      <div class="block-label">Motivo</div>
      <div class="topics-list no-class-topics" style="margin-bottom:0">${motivosHtml}</div>
    </div>`;
}

function renderNextCard(c) {
  const fechaFmt = formatearFecha(c.fecha);
  const tipoVisual = obtenerTipoVisual(c);

  const tieneLab = c.cierres?.some(x => x.texto?.toLowerCase().includes("lab"));
  const temasBadge = c.cierres?.length
    ? `<span class="badge ${tieneLab ? "badge-lab" : "badge-entrega"}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M9 3h6l1 9H8L9 3z"/>
          <path d="M6 12l-2 9h16l-2-9"/>
        </svg>
        ${escapeHtml(c.cierres[0].texto)}
       </span>`
    : "";

  const temasHtml = c.temas?.length
    ? c.temas.map(t => {
        if (t.url && isValidUrl(t.url)) {
          return `<a class="topic-link" href="${t.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.texto)}</a>`;
        }
        return `<span class="topic-chip">${escapeHtml(t.texto)}</span>`;
      }).join("")
    : '<span class="topic-chip" style="opacity:.5">Sin temas cargados</span>';

  const recursos = [];
  if (c.lecturas?.filter(r => r.url && isValidUrl(r.url)).length) {
    recursos.push(...c.lecturas.filter(r => r.url && isValidUrl(r.url)).map(r => ({ ...r, tipo: "lectura", tipoLabel: "Lectura previa" })));
  }
  if (c.ejercicios?.filter(r => r.url && isValidUrl(r.url)).length) {
    recursos.push(...c.ejercicios.filter(r => r.url && isValidUrl(r.url)).map(r => ({ ...r, tipo: "ejercicios", tipoLabel: "Ejercicios" })));
  }
  if (c.cierres?.filter(r => r.url && isValidUrl(r.url)).length) {
    recursos.push(...c.cierres.filter(r => r.url && isValidUrl(r.url)).map(r => ({ ...r, tipo: "lab", tipoLabel: "Lab / Entrega" })));
  }
  if (c.juegos?.filter(r => r.url && isValidUrl(r.url)).length) {
    recursos.push(...c.juegos.filter(r => r.url && isValidUrl(r.url)).map(r => ({ ...r, tipo: "juego", tipoLabel: "Juego" })));
  }

  const recursosHtml = recursos.length
    ? `<div class="card-divider"></div>
       <div class="block-label">Recursos para esta clase</div>
       <div class="links-grid">
         ${recursos.map(r => `
           <a class="res-link" href="${r.url}" target="_blank" rel="noopener noreferrer">
             <div class="res-icon ${r.tipo}">${iconoTipo(r.tipo)}</div>
             <div class="res-text">
               <div class="res-name">${escapeHtml(r.texto)}</div>
               <div class="res-type">${r.tipoLabel}</div>
             </div>
           </a>
         `).join("")}
       </div>`
    : "";

  return `
    <div class="next-card" id="next-card">
      <div class="next-eyebrow">Clase ${escapeHtml(c.numero)}</div>
      <div class="next-date">${fechaFmt.dia} <span>· ${fechaFmt.hora}</span></div>
      <div class="badges">
        <span class="badge ${tipoVisual.clase}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5 21v-2a7 7 0 0 1 14 0v2"/>
          </svg>
          ${tipoVisual.etiqueta}
        </span>
        ${temasBadge}
      </div>
      <div class="block-label">Temas</div>
      <div class="topics-list" style="margin-bottom:0">${temasHtml}</div>
      ${recursosHtml}
    </div>`;
}

/**
 * Renderiza la tarjeta de una clase pasada
 * @param {Object} c - Datos de la clase
 * @returns {string} HTML de la tarjeta
 */
function renderPastCard(c) {
  const fechaFmt = formatearFecha(c.fecha);
  const tipoVisual = obtenerTipoVisual(c);

  const topicsHtml = c.temas?.slice(0, 3)
    .map(t => `<span class="past-topic">${escapeHtml(t.texto)}</span>`)
    .join("") || "";

  const miniLinks = esSinClase(c)
    ? ""
    : (() => {
        const todosLinks = [...(c.temas || []), ...(c.lecturas || []), ...(c.ejercicios || []), ...(c.cierres || [])];
        const linksConUrl = todosLinks.filter(r => r.url && isValidUrl(r.url)).slice(0, 4);
        return linksConUrl.map(r =>
          `<a class="mini-link" href="${r.url}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(r.texto)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>`
        ).join("");
      })();

  return `
    <div class="past-card ${esSinClase(c) ? "past-card-no-class" : ""}">
      <div class="past-date-col">
        <div class="past-num">Clase ${escapeHtml(c.numero)}</div>
        <div style="font-size:12px">${fechaFmt.corto}</div>
        <div style="margin-top:5px">
          <span class="badge ${tipoVisual.clase}" style="font-size:10px;padding:3px 7px">
            ${tipoVisual.etiqueta}
          </span>
        </div>
      </div>
      <div class="past-topics">
        ${topicsHtml}
        ${c.temas?.length > 3 ? `<span class="past-topic" style="opacity:.5">+${c.temas.length - 3} más</span>` : ""}
      </div>
      <div class="past-links-mini">${miniLinks}</div>
    </div>`;
}

/**
 * Renderiza el mensaje de "sin más clases"
 * @returns {string} HTML del mensaje
 */
function renderDoneCard() {
  return `
    <div class="done-card">
      <div class="emoji">🎓</div>
      <div>¡Terminaron las clases del cuatrimestre!</div>
      <div style="margin-top:8px;font-size:13px;color:var(--text-dim)">Revisá las clases anteriores para repasar el material.</div>
    </div>`;
}

/**
 * Renderiza el estado de error
 * @param {string} mensaje - Mensaje de error
 * @returns {string} HTML del error
 */
function renderErrorCard(mensaje) {
  return `
    <div class="state-card error">
      Error al cargar los datos del curso.<br>
      <small>${escapeHtml(mensaje)}</small>
    </div>`;
}
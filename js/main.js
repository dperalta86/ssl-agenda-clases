/**
 * MAIN - ORQUESTADOR PRINCIPAL
 * Inicializa el portal, maneja eventos y actualiza la UI
 */

// Variables globales del módulo
let clasesGlobales = [];
let snapshotDatosActuales = "";
let mensajesGlobales = [];

// Intervalo de refresh automático
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
let refreshTimer = null;
let refreshEnCurso = false;
let refreshPendiente = false;
let stickyObserver = null;
let listenersConfigurados = false;
let eventosConfigurados = false;

function crearSnapshotDatos(datos) {
  const payload = {
    clases: Array.isArray(datos?.clases) ? datos.clases : [],
    entregas: Array.isArray(datos?.entregas) ? datos.entregas : [],
    messages: Array.isArray(datos?.messages) ? datos.messages : [],
  };
  return JSON.stringify(payload);
}

function esSinClase(clase) {
  const tipo = String(clase?.tipo || "").toLowerCase();
  return /(sin\s+clase|sin\s+actividad|feriado|suspendid|no\s+hay\s+clase)/.test(tipo);
}

/**
 * Convierte una fecha del backend a timestamp local para comparaciones.
 * @param {string} fecha - Fecha en cualquier formato parseable por Date.
 * @returns {number} Timestamp en milisegundos o NaN si no se pudo parsear.
 */
function normalizarFechaClase(fecha) {
  if (!fecha) return NaN;

  const timestamp = Date.parse(fecha);
  if (!Number.isNaN(timestamp)) return timestamp;

  const fechaIso = new Date(`${fecha}T00:00:00`);
  return fechaIso.getTime();
}

/**
 * Ordena timestamps con soporte para valores inválidos al final.
 * @param {Object} a - Clase con timestamp normalizado.
 * @param {Object} b - Clase con timestamp normalizado.
 * @param {number} direction - 1 para ascendente, -1 para descendente.
 * @returns {number}
 */
function compararFechas(a, b, direction = 1) {
  const aValida = Number.isFinite(a._fechaTimestamp);
  const bValida = Number.isFinite(b._fechaTimestamp);

  if (aValida && bValida) {
    return direction * (a._fechaTimestamp - b._fechaTimestamp);
  }

  if (aValida) return -1;
  if (bValida) return 1;
  return 0;
}

/**
 * @param {Array} clases - Lista de todas las clases
 */
function renderPortal(clases) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyTimestamp = hoy.getTime();
  
  const clasesConFecha = clases
    .map(c => ({ ...c, _fechaTimestamp: normalizarFechaClase(c.fecha) }));

  // Todas las clases pasadas (incluyendo Sin Clase, que irán al historial)
  const pasadas = clasesConFecha
    .filter(c => Number.isFinite(c._fechaTimestamp) && c._fechaTimestamp < hoyTimestamp)
    .sort((a, b) => compararFechas(a, b, -1));

  const futuras = clasesConFecha
    .filter(c => !Number.isFinite(c._fechaTimestamp) || c._fechaTimestamp >= hoyTimestamp)
    .sort((a, b) => compararFechas(a, b, 1));

  // Sin Clase que están en los próximos 7 días desde hoy
  const diasEnMs = 7 * 24 * 60 * 60 * 1000;
  const proximosSieteDias = hoyTimestamp + diasEnMs;
  const clasesSinClase = futuras
    .filter(c => esSinClase(c) && Number.isFinite(c._fechaTimestamp) && c._fechaTimestamp <= proximosSieteDias)
    .sort((a, b) => compararFechas(a, b, 1));
  
  // La próxima clase real (Presencial o Virtual, excluyendo suspensiones)
  const clasesRealesFuturas = futuras.filter(c => !esSinClase(c));
  const proxima = clasesRealesFuturas[0] || null;
  const avisoSinClaseHtml = clasesSinClase.length
    ? `<div class="no-class-stack">${clasesSinClase.map(renderNoClassCard).join("")}</div>`
    : "";
  
  const nextContainer = document.getElementById("next-container");
  
  // Renderizar próxima clase o mensaje de fin
  if (!proxima && !avisoSinClaseHtml) {
    nextContainer.innerHTML = renderDoneCard();
  } else {
    nextContainer.innerHTML = `${avisoSinClaseHtml}${proxima ? renderNextCard(proxima) : renderDoneCard()}`;
  }
  
  // Renderizar avisos
  const noticesSection = document.getElementById("notices-section");
  const noticesList = document.getElementById("notices-list");
  // Mostrar mensajes desde la planilla si existen, sino fallback a CONFIG.avisos
  const mensajes = (Array.isArray(mensajesGlobales) && mensajesGlobales.length > 0)
    ? mensajesGlobales.slice(0, 2).map(m => ({
        texto: `${escapeHtml(m.usuario)} ${escapeHtml(m.mensaje)}`,
        tiempo: m.fecha,
        canal: m.canal,
      }))
    : (Array.isArray(CONFIG.avisos) ? CONFIG.avisos.slice(0, 2) : []);

  if (mensajes.length > 0) {
    noticesSection.style.display = "";
    noticesList.innerHTML = mensajes.map(a => `
      <div class="notice-card">
        <div class="notice-dot"></div>
        <div>
          <div class="notice-text">${a.texto}</div>
          <div class="notice-time">${escapeHtml(a.tiempo)}${a.canal ? ` <span class="notice-channel">${escapeHtml(a.canal)}</span>` : ""}</div>
        </div>
      </div>
    `).join("");
  } else {
    noticesSection.style.display = "none";
  }
  
  // Renderizar clases pasadas
  const pastSection = document.getElementById("past-section");
  const pastList = document.getElementById("past-list");
  
  if (pasadas.length > 0) {
    pastSection.style.display = "";
    pastList.innerHTML = pasadas.map(renderPastCard).join("");
  } else {
    pastSection.style.display = "none";
  }
  
  // Configurar observer para botón sticky
  const nextEl = nextContainer.firstElementChild;
  if (stickyObserver) {
    stickyObserver.disconnect();
    stickyObserver = null;
  }

  if (nextEl) {
    const stickyTarget = nextContainer.querySelector(".next-card") || nextEl;
    stickyObserver = new IntersectionObserver(
      (entries) => {
        const stickyBtn = document.getElementById("sticky-btn");
        if (stickyBtn) {
          stickyBtn.classList.toggle("show", !entries[0].isIntersecting);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -20px 0px" }
    );
    stickyObserver.observe(stickyTarget);
  } else {
    const stickyBtn = document.getElementById("sticky-btn");
    if (stickyBtn) {
      stickyBtn.classList.remove("show");
    }
  }
}

/**
 * Actualiza los datos visibles del header y los links rápidos.
 */
function actualizarHeader() {
  const brandSsl = document.querySelector(".brand-ssl");
  const institutionEl = document.getElementById("brand-institution");
  const subjectEl = document.getElementById("brand-subject");
  const coursesEl = document.getElementById("brand-courses");

  if (brandSsl) brandSsl.textContent = CONFIG.materiaCorta || "SSL";
  if (institutionEl) institutionEl.textContent = CONFIG.institucion;
  if (subjectEl) subjectEl.textContent = CONFIG.materiaNombre;
  if (coursesEl) {
    coursesEl.textContent = CONFIG.cursos.join(" • ");
  }

  const zoomLink = document.getElementById("zoom-link");
  const discordLink = document.getElementById("discord-link");
  const onenoteLink = document.getElementById("onenote-link");
  const notebooklmLink = document.getElementById("notebooklm-link");

  if (zoomLink && CONFIG.linksRapidos.zoom !== "#") {
    zoomLink.href = CONFIG.linksRapidos.zoom;
  }

  if (discordLink && CONFIG.linksRapidos.discord !== "#") {
    discordLink.href = CONFIG.linksRapidos.discord;
  }

  if (onenoteLink && CONFIG.linksRapidos.onenote !== "#") {
    onenoteLink.href = CONFIG.linksRapidos.onenote;
  }

  if (notebooklmLink && CONFIG.linksRapidos.notebooklm !== "#") {
    notebooklmLink.href = CONFIG.linksRapidos.notebooklm;
  }
}

/**
 * Renderiza un banner con las entregas próximas y atrasadas
 * @param {Array} entregas - Lista de entregas con fecha, tipo y URL
 * @returns {void}
 */
function renderBannerEntregas(entregas) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const DIAS_FUTURO = 10;
  const DIAS_PASADO = 3;

  const items = entregas
    .map(e => {
      if (!e.fecha) return null;
      const fecha = new Date(e.fecha);
      fecha.setHours(0, 0, 0, 0);
      const diff = Math.round((fecha - hoy) / 86400000); // días
      return { ...e, diff };
    })
    .filter(e => e && e.diff >= -DIAS_PASADO && e.diff <= DIAS_FUTURO)
    .sort((a, b) => a.diff - b.diff);

  const banner = document.getElementById("entregas-banner");
  if (!banner) return;

  if (items.length === 0) {
    banner.style.display = "none";
    return;
  }

  const urgentes = items.filter(e => e.diff >= 0 && e.diff <= 3).length;
  const badgeHtml = urgentes > 0
    ? `<span class="eb-badge">${urgentes}</span>`
    : "";

  const itemsHtml = items.map(e => {
    let estado, etiqueta;
    if (e.diff < 0) {
      estado = "dead";
      etiqueta = e.diff === -1 ? "ayer" : `hace ${Math.abs(e.diff)}d`;
    } else if (e.diff === 0) {
      estado = "urgent";
      etiqueta = "hoy";
    } else if (e.diff <= 3) {
      estado = "urgent";
      etiqueta = `en ${e.diff}d`;
    } else {
      estado = "upcoming";
      etiqueta = `en ${e.diff}d`;
    }

    const icono = { Lab: "🧪", TP: "📦", Parcial: "⚡", Cuestionario: "📝", Práctica: "✏️" }[e.tipo] || "📌";
    const link = e.url ? `href="${e.url}" target="_blank" rel="noopener"` : "";
    const tag = e.url ? "a" : "div";

    return `
      <${tag} class="eb-item eb-${estado}" ${link}>
        <span class="eb-icon">${icono}</span>
        <span class="eb-nombre">${escapeHtml(e.nombre)}</span>
        <span class="eb-fecha">${etiqueta}</span>
      </${tag}>`;
  }).join("");

  banner.innerHTML = `
    <div class="eb-inner">
      <span class="eb-titulo">// entregas ${badgeHtml}</span>
      <div class="eb-lista">${itemsHtml}</div>
    </div>`;
  banner.style.display = "";
}

async function refrescarDatos() {
  if (refreshEnCurso) {
    refreshPendiente = true;
    console.info("[Refresh] Ya hay una actualización en curso, se difiere una sola repetición");
    return;
  }

  refreshEnCurso = true;
  try {
    const datos = await cargarClasesDesdeAPI();
    const nuevasClases = Array.isArray(datos.clases) ? datos.clases : [];
    const nuevasEntregas = Array.isArray(datos.entregas) ? datos.entregas : [];
    const nuevasMensajes = Array.isArray(datos.messages) ? datos.messages : [];
    const snapshotNuevo = crearSnapshotDatos({ clases: nuevasClases, entregas: nuevasEntregas, messages: nuevasMensajes });

    // Comparar con snapshot actual para ver si algo cambió
    const haycambios = snapshotNuevo !== snapshotDatosActuales;

    if (haycambios) {
      clasesGlobales = nuevasClases;
      mensajesGlobales = nuevasMensajes;
      snapshotDatosActuales = snapshotNuevo;
      renderPortal(clasesGlobales);
      renderBannerEntregas(nuevasEntregas);
      mostrarToast("// datos actualizados");
      console.info("[Refresh] Cambios detectados, portal re-renderizado");
    } else {
      console.info("[Refresh] Sin cambios");
    }
  } catch (err) {
    console.warn("[Refresh] Error silencioso:", err.message);
    // No mostramos nada al usuario si falla el refresh
  } finally {
    refreshEnCurso = false;

    if (refreshPendiente) {
      refreshPendiente = false;
      refrescarDatos();
    }
  }
}

function mostrarToast(mensaje) {
  const existing = document.getElementById("refresh-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "refresh-toast";
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  // Forzar reflow para que la animación arranque
  toast.getBoundingClientRect();
  toast.classList.add("toast-visible");

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/**
 * Carga los datos y renderiza el portal
 */
async function inicializarPortal() {
  try {
    // Mostrar loader
    const nextContainer = document.getElementById("next-container");
    nextContainer.innerHTML = `
      <div class="state-card">
        <div class="spinner"></div>
        Cargando datos del curso...
      </div>
    `;

    // Pintar header con la configuración disponible y refrescarlo cuando llegue la remota.
    actualizarHeader();
    if (typeof cargarConfiguracionRemota === "function") {
      cargarConfiguracionRemota()
        .then(actualizarHeader)
        .catch((error) => {
          console.warn("[Main] Error al cargar la configuración remota:", error?.message || error);
        });
    }

    // Arrancar la carga de clases sin esperar la configuración remota.
    const datos = await cargarClasesDesdeAPI();
    clasesGlobales = Array.isArray(datos.clases) ? datos.clases : [];
    const entregas = Array.isArray(datos.entregas) ? datos.entregas : [];
    mensajesGlobales = Array.isArray(datos.messages) ? datos.messages : [];
    snapshotDatosActuales = crearSnapshotDatos({ clases: clasesGlobales, entregas, messages: mensajesGlobales });
    renderBannerEntregas(entregas);
    
    // Validar estructura mínima de los datos
    if (!clasesGlobales.every(c => c.numero && c.temas)) {
      console.warn("[Main] Algunas clases tienen estructura incompleta");
    }
    
    // Renderizar portal
    renderPortal(clasesGlobales);
    
    // Configurar eventos después del renderizado
    configurarEventos();

    // Refresh automático al volver a la pestaña (si hubo cambios)
    if (!listenersConfigurados) {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          refrescarDatos();
        }
      });

      // Safari iOS puede restaurar desde bfcache sin recargar recursos.
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
          refrescarDatos();
        }
      });

      window.addEventListener("focus", () => {
        refrescarDatos();
      });
      listenersConfigurados = true;
    }

    // Refresh automático silencioso (página abierta)
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refrescarDatos, REFRESH_INTERVAL_MS);
    
  } catch (error) {
    console.error("[Main] Error al inicializar:", error);
    const nextContainer = document.getElementById("next-container");
    nextContainer.innerHTML = renderErrorCard(error.message);
  }
}

/**
 * Configura todos los eventos de la página
 */
function configurarEventos() {
  const header = document.querySelector(".header");
  const menuToggle = document.getElementById("menu-toggle");
  actualizarHeader();

  if (eventosConfigurados) {
    return;
  }

  if (menuToggle && header) {
    const closeMenu = () => {
      header.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menú");
    };

    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = header.classList.toggle("menu-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    });

    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    document.querySelectorAll("#quick-links .qlink").forEach(link => {
      link.addEventListener("click", closeMenu);
    });
  }

  eventosConfigurados = true;
  
  // Botón "volver a próxima clase" (dentro de la sección de clases pasadas)
  const backBtn = document.getElementById("back-to-next-btn");
  if (backBtn) {
    backBtn.addEventListener("click", scrollToNext);
  }
  
  // Botón sticky flotante
  const stickyBtn = document.getElementById("sticky-btn");
  if (stickyBtn) {
    stickyBtn.addEventListener("click", scrollToNext);
  }
  
}

/**
 * Scroll suave hacia la próxima clase
 */
function scrollToNext() {
  const nextCard = document.getElementById("next-card");
  const nextContainer = document.getElementById("next-container");
  const element = nextCard || nextContainer;
  
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializarPortal);
} else {
  inicializarPortal();
}
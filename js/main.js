/**
 * MAIN - ORQUESTADOR PRINCIPAL
 * Inicializa el portal, maneja eventos y actualiza la UI
 */

// Variables globales del módulo
let clasesGlobales = [];

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
 * Renderiza todo el portal con los datos cargados
 * @param {Array} clases - Lista de todas las clases
 */
function renderPortal(clases) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyTimestamp = hoy.getTime();
  
  const clasesConFecha = clases
    .map(c => ({ ...c, _fechaTimestamp: normalizarFechaClase(c.fecha) }));

  // Separar clases pasadas y futuras usando fechas reales
  const pasadas = clasesConFecha
    .filter(c => Number.isFinite(c._fechaTimestamp) && c._fechaTimestamp < hoyTimestamp)
    .sort((a, b) => compararFechas(a, b, -1));

  const futuras = clasesConFecha
    .filter(c => !Number.isFinite(c._fechaTimestamp) || c._fechaTimestamp >= hoyTimestamp)
    .sort((a, b) => compararFechas(a, b, 1));

  const proxima = futuras[0] || null;
  
  const nextContainer = document.getElementById("next-container");
  
  // Renderizar próxima clase o mensaje de fin
  if (!proxima) {
    nextContainer.innerHTML = renderDoneCard();
  } else {
    nextContainer.innerHTML = renderNextCard(proxima);
  }
  
  // Renderizar avisos
  const noticesSection = document.getElementById("notices-section");
  const noticesList = document.getElementById("notices-list");
  
  if (CONFIG.avisos && CONFIG.avisos.length > 0) {
    noticesSection.style.display = "";
    noticesList.innerHTML = CONFIG.avisos.map(a => `
      <div class="notice-card">
        <div class="notice-dot"></div>
        <div>
          <div class="notice-text">${a.texto}</div>
          <div class="notice-time">${escapeHtml(a.tiempo)}</div>
        </div>
      </div>
    `).join("");
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
  if (nextEl) {
    const observer = new IntersectionObserver(
      (entries) => {
        const stickyBtn = document.getElementById("sticky-btn");
        stickyBtn.classList.toggle("show", !entries[0].isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px -20px 0px" }
    );
    observer.observe(nextEl);
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
      cargarConfiguracionRemota().then(actualizarHeader);
    }

    // Arrancar la carga de clases sin esperar la configuración remota.
    clasesGlobales = await cargarClasesDesdeAPI();
    
    // Validar estructura mínima de los datos
    if (!clasesGlobales.every(c => c.numero && c.temas)) {
      console.warn("[Main] Algunas clases tienen estructura incompleta");
    }
    
    // Renderizar portal
    renderPortal(clasesGlobales);
    
    // Configurar eventos después del renderizado
    configurarEventos();
    
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
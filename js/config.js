/**
 * CONFIGURACIÓN DEL CURSO
 * Editar solo esta sección para personalizar el portal
 * TODO: Validar si es .env o si lo hacemos mediante endpoint para evitar redeploy
 */

function obtenerAppsScriptUrlPorDefecto() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const esLocal =
      window.location.protocol === "file:" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1";

    if (esLocal) {
      return "https://script.google.com/macros/s/AKfycbweAxR3Kr5RS4fooSAtLww1ahIkI4fuY-CUgb7RsUNRCE5svpNPyguFQZN38fzH14fN/exec";
    }
  }

  return "/api/clases";
}

const CONFIG = {
  // URL del endpoint de clases (en Vercel usa /api/clases; en local cae al Apps Script)
  appsScriptUrl: obtenerAppsScriptUrlPorDefecto(),
  
  // Datos de la institución y materia
  institucion: "UTN - FRBA",
  materiaCorta: "SSL",
  materiaNombre: "Sintaxis y Semántica de los Lenguajes",
  cursos: ["K2001", "K2101", "K2051", "K2151"],
  
  // Links de acceso rápido
  linksRapidos: {
    zoom: "https://utn.zoom.us/j/92986126057",
    discord: "https://discord.gg/RUp9WsuF",
    onenote: "https://1drv.ms/u/s!AtF4l4L_a6hzgg3tRhA-xop5NY9Y",
    notebooklm: "#",
  },
  
  // Avisos manuales (se muestran debajo de la próxima clase)
  // Agregar los más recientes primero
  // TODO: Implementar webhook o bot de discord para publicar avisos automáticamente desde un canal específico
  avisos: [
    {
      texto: "@Estudiantes ¡Hola a todos! 👋 ¿Cómo están? Espero que muy bien! 🙂 Les compartimos una breve encuesta de feedback sobre estas primeras clases: https://forms.gle/6adHMzetTirKFQCF7 Es anónima, corta y les va a llevar solo unos minutos completarla. La idea es poder entender qué les está resultando útil, qué podríamos mejorar y cómo seguir ajustando la cursada para que les aporte el mayor valor posible. Con los resultados, vamos a compartir en la próxima clase tanto un resumen cuantitativo como cualitativo para que tengan visibilidad de los resultados. Aprovecho también para felicitarlos por el trabajo que vienen haciendo en la cursada y la práctica del día de ayer. Muy buena participación! Que tengan una excelente semana 🙌 Quedamos a disposición, como siempre, para lo que necesiten. Docentes - SSL",
      tiempo: "28 de abril · #avisos"
    },
    {
      texto: "Buenas! @Estudiantes Como estan? Por motivo de las consultas realizadas pasamos a avisarles que la clase presencial de mañana se mantiene. Que tengan un buen domingo! 😁",
      tiempo: "26 de abril · #avisos"
    }
  ]
};

/**
 * Aplica una configuración remota sobre los valores locales.
 * En Vercel se usa para inyectar valores desde variables de entorno.
 * @param {Object} remoteConfig - Configuración remota.
 */
function aplicarConfiguracionRemota(remoteConfig) {
  if (!remoteConfig || typeof remoteConfig !== "object") return;

  const nextConfig = { ...remoteConfig };

  if (Array.isArray(nextConfig.cursos)) {
    nextConfig.cursos = nextConfig.cursos.map(curso => String(curso).trim()).filter(Boolean);
  } else if (typeof nextConfig.cursos === "string") {
    nextConfig.cursos = nextConfig.cursos.split(",").map(curso => curso.trim()).filter(Boolean);
  }

  if (nextConfig.linksRapidos && typeof nextConfig.linksRapidos === "object") {
    nextConfig.linksRapidos = {
      ...CONFIG.linksRapidos,
      ...nextConfig.linksRapidos,
    };
  }

  Object.assign(CONFIG, nextConfig);
}

/**
 * Carga la configuración desde el endpoint de Vercel si existe.
 * Devuelve false si no se pudo obtener configuración remota.
 * @returns {Promise<boolean>}
 */
async function cargarConfiguracionRemota() {
  try {
    const response = await fetch(`/api/config?_ts=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (!data.ok || !data.config) return false;

    aplicarConfiguracionRemota(data.config);
    return true;
  } catch {
    return false;
  }
}

// DATOS MOCK (se usan si appsScriptUrl empieza con "TU_")
// Reemplazalos con la estructura real de tu Google Sheet
const MOCK_CLASES = [
  {
    numero: "01", fecha: "2025-03-18", tipo: "presencial",
    temas: [
      { texto: "Presentación de la asignatura", url: null },
      { texto: "Lenguajes Formales y Expresiones Regulares", url: null },
      { texto: "Introducción al proceso de compilación", url: "https://docs.google.com/presentation/d/ejemplo" },
      { texto: "Presentación del TP n° 0", url: "https://docs.google.com/document/d/ejemplo" },
    ],
    cierres: [],
    lecturas: [],
    ejercicios: [],
    juegos: [],
  },
  {
    numero: "02", fecha: "2025-03-25", tipo: "presencial",
    temas: [
      { texto: "Autómatas finitos deterministas", url: null },
      { texto: "Construcción de AFD", url: "https://docs.google.com/presentation/d/ejemplo2" },
    ],
    cierres: [{ texto: "Cierre Cuestionario 1", url: null }],
    lecturas: [{ texto: "Muchnik cap. 2 pp. 14-28", url: null }],
    ejercicios: [{ texto: "Práctica AFD", url: "https://docs.google.com/document/d/ejemplo3" }],
    juegos: [],
  },
  {
    numero: "03", fecha: "2025-04-01", tipo: "virtual",
    temas: [
      { texto: "AFN y equivalencia con AFD", url: "https://docs.google.com/presentation/d/ejemplo4" },
      { texto: "Algoritmo de Thompson", url: null },
    ],
    cierres: [{ texto: "Entrega TP0", url: "https://github.com/tu-repo/tp0" }],
    lecturas: [{ texto: "Muchnik cap. 3", url: null }],
    ejercicios: [],
    juegos: [{ texto: "Juego AFN", url: "https://ejemplo.com/juego" }],
  },
  {
    numero: "04", fecha: "2025-05-06", tipo: "presencial",
    temas: [
      { texto: "Análisis léxico", url: "https://docs.google.com/presentation/d/ejemplo5" },
      { texto: "Construcción de tokenizadores", url: null },
      { texto: "Implementación con ER", url: "https://docs.google.com/presentation/d/ejemplo6" },
    ],
    cierres: [{ texto: "Lab 01 · tokenizador", url: "https://github.com/tu-repo/lab01" }],
    lecturas: [{ texto: "Muchnik cap. 4 pp. 44-60", url: null }],
    ejercicios: [{ texto: "Práctica Léxico", url: "https://docs.google.com/document/d/ejemplo7" }],
    juegos: [],
  },
  {
    numero: "05", fecha: "2025-05-13", tipo: "presencial",
    temas: [{ texto: "Análisis sintáctico — intro", url: null }],
    cierres: [],
    lecturas: [],
    ejercicios: [],
    juegos: [],
  },
];

const MOCK_ENTREGAS = [
  { tipo: "Lab",      nombre: "Lab 03 · Tokenizador",     fecha: "2026-05-12", url: "https://github.com/...", notas: null },
  { tipo: "TP",       nombre: "TP1 · Analizador Léxico",  fecha: "2026-05-18", url: "https://github.com/...", notas: null },
  { tipo: "Parcial",  nombre: "Primer Parcial",            fecha: "2026-06-10", url: null, notas: "Aula 302" },
];
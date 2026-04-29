/**
 * UTILIDADES GENERALES
 * Funciones helper para fechas, sanitización, íconos, etc.
 */

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} str - Texto a sanitizar
 * @returns {string} Texto seguro
 */
function sanitizeText(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Escapa HTML para uso seguro en innerHTML
 * @param {string} str - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Valida que una URL sea segura (http/https)
 * @param {string} url - URL a validar
 * @returns {boolean} true si es segura
 */
function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns {string} Fecha actual
 */
function fechaHoy() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha ISO a formato legible en español
 * @param {string} iso - Fecha en formato YYYY-MM-DD o cadena largo con zona horaria
 * @returns {Object} Objeto con diferentes formatos
 */
function formatearFecha(iso) {
  if (!iso) {
    return { dia: "Fecha por confirmar", hora: "", corto: "—" };
  }
  
  // Extraer YYYY-MM-DD si viene una cadena larga con zona horaria
  let dateStr = String(iso).trim();
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    dateStr = `${match[1]}-${match[2]}-${match[3]}`;
  }
  
  // Parsear como UTC (sin desplazamiento de zona horaria)
  const [y, m, d] = dateStr.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  
  const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  
  return {
    dia: `${dias[fecha.getUTCDay()]} ${d} de ${meses[m - 1]}`,
    hora: "TM 08:30hs - TN 19:00 hs", // Se puede traer desde sheet, pero no justifica
    corto: `${dias[fecha.getUTCDay()].slice(0, 3)} ${d}/${m}`,
  };
}

/**
 * Retorna el ícono/emoji según el tipo de recurso
 * @param {string} tipo - Tipo de recurso
 * @returns {string} Emoji o texto representativo
 */
function iconoTipo(tipo) {
  const map = {
    docs: "📄",
    ejercicios: "✏️",
    lab: "🧪",
    lectura: "📖",
    github: "🐙",
    juego: "🎮"
  };
  return map[tipo] || "🔗";
}

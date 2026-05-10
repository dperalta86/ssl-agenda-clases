/**
 * API y CARGA DE DATOS
 * Maneja la comunicación con Apps Script y los datos mock
 */

/**
 * Carga las clases desde Apps Script o usa mock como fallback
 * @returns {Promise<{clases: Array, entregas: Array}>} Objeto con clases y entregas
 */
async function cargarClasesDesdeAPI() {
  // Si la URL es de ejemplo, usar datos mock
  if (CONFIG.appsScriptUrl.startsWith("TU_")) {
    console.info("[API] Usando datos mock - Reemplazar appsScriptUrl en config.js");
    return { clases: [...MOCK_CLASES], entregas: [...MOCK_ENTREGAS] };
  }

  // Validar que la URL sea HTTPS (seguridad)
  if (!CONFIG.appsScriptUrl.startsWith("https://")) {
    console.warn("[API] URL no usa HTTPS, puede ser insegura");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s
    const requestUrl = `${CONFIG.appsScriptUrl}${CONFIG.appsScriptUrl.includes("?") ? "&" : "?"}_ts=${Date.now()}`;

    const response = await fetch(requestUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("primera fecha:", data.clases?.[0]?.fecha);
    
    if (!data.ok) {
      throw new Error(data.error || "Error desconocido desde el servidor");
    }
    
    if (!data.clases || !Array.isArray(data.clases)) {
      throw new Error("La respuesta no contiene un array de clases válido");
    }
    console.info(`[API] Clases: ${data.clases.length} | Entregas: ${(data.entregas || []).length} | Mensajes: ${(data.messages || []).length}`);
    return { clases: data.clases, entregas: data.entregas || [], messages: data.messages || [] };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("[API] Timeout al cargar los datos");
      throw new Error("Tiempo de espera agotado. Verificar conexión.");
    }
    console.error("[API] Error:", error);
    throw error;
  }
}
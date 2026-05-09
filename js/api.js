/**
 * API y CARGA DE DATOS
 * Maneja la comunicación con Apps Script y los datos mock
 */

/**
 * Carga las clases desde Apps Script o usa mock como fallback
 * @returns {Promise<Array>} Lista de clases
 */
async function cargarClasesDesdeAPI() {
  // Si la URL es de ejemplo, usar datos mock
  if (CONFIG.appsScriptUrl.startsWith("TU_")) {
    console.info("[API] Usando datos mock - Reemplazar appsScriptUrl en config.js");
    return [...MOCK_CLASES];
  }

  // Validar que la URL sea HTTPS (seguridad)
  if (!CONFIG.appsScriptUrl.startsWith("https://")) {
    console.warn("[API] URL no usa HTTPS, puede ser insegura");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s

    const response = await fetch(CONFIG.appsScriptUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
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
    console.info(`[API] Clases: ${data.clases.length} | Entregas: ${(data.entregas || []).length}`);
    return { clases: data.clases, entregas: data.entregas || [] };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("[API] Timeout al cargar los datos");
      throw new Error("Tiempo de espera agotado. Verificar conexión.");
    }
    console.error("[API] Error:", error);
    throw error;
  }
}
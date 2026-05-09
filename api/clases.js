module.exports = async (req, res) => {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  res.setHeader("Content-Type", "application/json");
  // Forzar revalidación en cada request para evitar datos viejos en CDN/browser.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (!appsScriptUrl) {
    res.status(500).json({
      ok: false,
      error: "Falta la variable de entorno APPS_SCRIPT_URL",
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const cacheBuster = Date.now();
    const urlObj = new URL(appsScriptUrl);
    urlObj.searchParams.set("_ts", String(cacheBuster));

    const response = await fetch(urlObj.toString(), {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      res.status(response.status).json({
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    if (error.name === "AbortError") {
      res.status(504).json({
        ok: false,
        error: "Tiempo de espera agotado al consultar Google Sheets",
      });
      return;
    }

    res.status(502).json({
      ok: false,
      error: "No se pudo obtener la información desde Apps Script",
    });
  }
};

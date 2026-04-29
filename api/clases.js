module.exports = async (req, res) => {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

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

    const response = await fetch(appsScriptUrl, {
      signal: controller.signal,
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

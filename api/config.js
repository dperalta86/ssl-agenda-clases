module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/json");

  res.status(200).json({
    ok: true,
    config: {
      appsScriptUrl: process.env.APPS_SCRIPT_URL || "",
      institucion: process.env.INSTITUCION || "UTN - FRBA",
      materiaCorta: process.env.MATERIA_CORTA || "SSL",
      materiaNombre: process.env.MATERIA_NOMBRE || "Sintaxis y Semántica de los Lenguajes",
      cursos: process.env.CURSOS ? process.env.CURSOS.split(",").map(curso => curso.trim()).filter(Boolean) : ["K2001", "K2101", "K2051", "K2151"],
      linksRapidos: {
        zoom: process.env.ZOOM_URL || "#",
        discord: process.env.DISCORD_URL || "#",
        onenote: process.env.ONENOTE_URL || "#",
      },
    },
  });
};

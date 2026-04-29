# Portal SSL

Portal web para la cursada de **Sintaxis y Semántica de los Lenguajes (SSL)** de la **UTN - FRBA**.

La web muestra:
- la próxima clase en una card principal,
- las clases anteriores en cards secundarias,
- recursos por clase,
- avisos manuales,
- accesos rápidos a Zoom, Discord y OneNote.

## Cómo funciona

La aplicación es una web estática con JavaScript simple.

1. `js/config.js` define la configuración local por defecto.
2. `js/config.js` también intenta cargar configuración remota desde `/api/config`.
3. `api/config.js` expone variables de entorno en Vercel.
4. `api/clases.js` hace de proxy seguro al Apps Script y habilita cache HTTP.
5. `js/api.js` consume el endpoint de clases.
6. `js/main.js` ordena las clases, decide cuál es la próxima y renderiza la UI.
7. `js/render.js` arma el HTML de las cards.

## Flujo de datos

- La información de clases vive en Google Sheets.
- Un Apps Script publica esos datos como JSON.
- En Vercel, `api/clases.js` actúa como proxy y el frontend consume ese endpoint same-origin.
- El frontend transforma ese JSON en la agenda visual.
- Si no existe config remota, la web usa los valores locales del repo como fallback.

## Variables de entorno en Vercel

Estas variables se leen desde `api/config.js`:

- `APPS_SCRIPT_URL`
- `ZOOM_URL`
- `DISCORD_URL`
- `ONENOTE_URL`
- `NOTEBOOKLM_URL`
- `INSTITUCION`
- `MATERIA_CORTA`
- `MATERIA_NOMBRE`
- `CURSOS` (separados por coma, por ejemplo: `K2001,K2101,K2051,K2151`)

## Desarrollo local

No hace falta un archivo `.env` para que la web funcione en local.

El motivo es que el proyecto ya tiene fallback en `js/config.js` y la carga remota de `/api/config` solo se usa cuando existe esa ruta en Vercel.

Si querés probar valores distintos en local, lo más simple es:
- editar `js/config.js`, o
- levantar un entorno que implemente `/api/config`.

Para probar el proxy de clases en local, además necesitás una ruta `/api/clases` o usar el Apps Script directo desde `js/config.js`.

## Archivos principales

- `index.html`: estructura general de la página.
- `css/style.css`: estilos visuales.
- `js/config.js`: configuración base y fallback local.
- `js/api.js`: carga de datos desde Apps Script.
- `js/main.js`: orquestación y render principal.
- `js/render.js`: templates HTML de las cards.
- `js/utils.js`: helpers de fechas, URLs y escape HTML.
- `api/config.js`: endpoint de configuración para Vercel.

## Notas

- El proyecto no usa framework.
- No requiere build step para funcionar en el navegador.
- Si cambian los datos de la cursada, el punto de mantenimiento principal es la Google Sheet + Apps Script.

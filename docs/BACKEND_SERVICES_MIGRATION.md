# Migración backend conservando frontend

## Objetivo

Migrar la aplicación hacia una estructura de servicios backend sin modificar el frontend actual.

## Regla principal

No tocar estos archivos durante esta fase:

```txt
public/index.html
public/app.js
public/styles.css
index.html
```

## Enfoque

La migración debe hacerse desde el servidor hacia servicios internos:

```txt
server.js
↓
src/http/*
↓
src/services/*
↓
src/repositories/*
```

## Primeros servicios creados

```txt
src/http/security-headers.js
src/http/responses.js
src/http/routes.js
```

## Próximo paso

Refactorizar `server.js` para usar estos helpers sin cambiar rutas ni comportamiento visible.

## Criterios de aceptación

- `/` sigue mostrando exactamente el mismo frontend.
- `/app.js` sigue sirviendo el mismo archivo.
- `/styles.css` sigue sirviendo el mismo archivo.
- `/health` sigue respondiendo OK.
- No se cambia HTML, CSS ni JS de frontend.

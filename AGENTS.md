# AGENTS.md: CLI `eclass`

Las reglas comunes de trabajo (forma de pensar, idioma, seguridad, tests, commits) son las del
repo `template_nodejs` (secciones 1 a 4, 10 y 12 de su AGENTS.md). Este archivo solo agrega lo
propio del CLI.

## Qué es

- CLI que crea proyectos nuevos a partir de una plantilla: `npx @eclass/cli start <nombre> [plantilla]`.
- **No** se despliega en la plataforma de aplicaciones: se ejecuta en la máquina de quien lo usa.
- Estado (23-10-2026): publicado en npm como `@eclass/cli@0.1.4`; plantilla `nodejs` funcionando.
  Plantilla `python` agregada en el código (repo `eclass/apps/template_python`), **pendiente de
  publicar** una versión nueva del CLI y de subir ese repo a GitLab. `php` anunciada sin repo.

## Stack y reglas propias

- **JavaScript con `// @ts-check`** y tipos en JSDoc, revisados con `npm run typecheck`
  (`tsc` con `checkJs`). No TypeScript: Node no borra tipos de archivos dentro de `node_modules`, y
  ahí es donde corre un paquete instalado con `npx`.
- **Sin dependencias de runtime.** Solo la librería estándar de Node (`parseArgs`, `fs`,
  `child_process`). Cada dependencia la descarga cada `npx`.
- Node `>=22` (lo que tenga quien lo ejecuta). Los proyectos generados piden Node 24.
- Mensajes en español, con qué pasó y qué hacer.
- **Nunca dejar una carpeta a medias:** si algo falla al crear, se borra lo creado.
- **Nunca pisar una carpeta existente.**

## Cómo funciona `start`

1. Valida el nombre con la regla más estricta de sus cuatro usos (carpeta, paquete npm, servicio de
   Cloud Run con máximo 49 caracteres, subdominio sin guion bajo).
2. Trae la plantilla: `git clone --depth 1` del repo de `src/templates.js`, o copia la carpeta de
   `--from`. Sin `.git` ni `node_modules`.
3. Reemplaza el placeholder (`template-nodejs`, `template-python`) y `<servicio>` por el nombre en
   todos los archivos de texto (omite binarios: archivos con un byte NUL).
4. Deja la versión en `0.1.0`: `package.json` y `package-lock.json` (Node) o el archivo `VERSION`
   (Python). Al copiar con `--from` omite `.git`, `node_modules`, `.venv` y las cachés de Python.
5. `git init -b main` y muestra los pasos para programar (según la plantilla) y publicar.

## Contrato con las plantillas

- El placeholder de cada plantilla está en `src/templates.js` y debe coincidir con el nombre que la
  plantilla usa: `name` de `package.json` en Node, `APP_NAME` de `app/__init__.py` en Python. Un
  test lo verifica si `template_nodejs` o `template_python` están clonados al lado.
- Si una plantilla cambia su placeholder, se cambian los dos repos en el mismo día.

## Publicar una versión

- Subir `version` en `package.json` (`npm version patch|minor`), luego `npm publish` con una cuenta
  de la organización `eclass` de npm (exige 2FA o token granular con bypass 2FA). El registro tarda
  unos minutos en mostrar la versión nueva.

## Verificación antes de publicar una versión

- `npm run typecheck` y `npm test`.
- Prueba real: `npx --yes <ruta-a-este-repo> start demo-x --from ../template_nodejs` en una carpeta
  temporal; en el proyecto generado, `npm ci`, `npm run typecheck`, `npm test` y `/info`. Lo mismo
  con `start demo-py python --from ../template_python`: `make install`, `make typecheck`,
  `make test` y `/info` (hecho el 23-10-2026 con el código de esta versión: todo en verde).

## Pendientes

- Plantilla `php`: crear su repo y completar `src/templates.js`.
- Publicar la versión con la plantilla `python` (`npm version minor` → `0.2.0` y `npm publish`)
  después de que el usuario suba `template_python` a `eclass/apps/template_python` en GitLab. Si
  el repo queda en otra ruta, corregir `repo` en `src/templates.js`.

## Decisiones del usuario

- 15-10-2026: comando `npx eclass start <nombre-proyecto> [plantilla]`, al estilo del CLI de Ionic;
  plantillas `nodejs`, `php`, `python`. Los repos los crea y publica el usuario en GitLab.
- 19-10-2026: el repo del CLI se movió a GitHub: `https://github.com/eclass/cli.git`. Las
  plantillas siguen en GitLab (`src/templates.js`).
- 20-10-2026: las plantillas y los proyectos viven en el grupo `eclass/apps` de GitLab (antes
  `eclass/mvps_internos`). `template_nodejs` se movió a `eclass/apps/template_nodejs`, y los pasos
  para publicar piden la variable `SUBDOMAIN` (antes `MVP_SUBDOMAIN`), que es la que lee el pipeline
  compartido (`eclass/apps/templates_aplicaciones`).
- 20-10-2026: `SUBDOMAIN` lleva el dominio completo (`mi-app.eclass.com`), no solo el subdominio,
  porque eClass tiene otros dominios habilitados y una app puede publicarse en cualquiera de ellos.
  Los pasos del CLI sugieren `<nombre>.eclass.com` como valor por defecto. (Se probó pedir solo el
  subdominio en 0.1.3 y se revirtió en 0.1.4.)
- 19-10-2026: se publica en npm público como `@eclass/cli` (organización `eclass` de npm), con
  `publishConfig.access = public` y licencia `UNLICENSED` (uso exclusivo interno). El binario sigue
  llamándose `eclass`. Para publicar, npm exige 2FA en la cuenta.
- 23-10-2026: se agrega la plantilla `python` (`template_python`, Python 3.12 + FastAPI), paralela
  a `template_nodejs`. Uso: `npx @eclass/cli start <nombre> python`; `nodejs` sigue siendo la
  plantilla por defecto.

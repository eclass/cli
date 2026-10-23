# @eclass/cli

CLI para crear proyectos nuevos internos de eClass a partir de una
plantilla: llegar, crear, programar y subir a producción.

```bash
npx @eclass/cli start <nombre-proyecto> [plantilla]
```

- `nombre-proyecto`: será la carpeta, el nombre del paquete, el servicio de Cloud Run y el
  subdominio (`<nombre>.eclass.com`). Solo minúsculas, números y guiones medios (2 a 49).
- `plantilla`: `nodejs` (por defecto, Node 24 + Express 5 + TypeScript sin build) o `python`
  (Python 3.12 + FastAPI). `php`: próximamente.

```bash
npx @eclass/cli start mi-app            # Node.js
npx @eclass/cli start mi-api python     # Python
```

El CLI clona la plantilla por SSH desde GitLab (necesitas acceso a `eclass/apps`),
reemplaza el nombre, deja la versión en `0.1.0` (`package.json` en Node, `VERSION` en Python),
inicia un repo git en `main` y muestra los pasos para programar y publicar.

## Opciones

| Opción | Para qué |
|---|---|
| `--from <ruta\|url>` | Usar otra fuente de plantilla: una carpeta local (para probar cambios de la plantilla sin publicarlos) o un repo git |
| `-h`, `--help` | Ayuda |
| `-v`, `--version` | Versión |

## Cómo se instala

No se instala: `npx @eclass/cli start …` lo descarga desde npm (paquete `@eclass/cli`).

Antes de publicarse en npm, o para probar otra rama, funciona directo desde GitHub:

```bash
npx github:eclass/cli start mi-app
```

## Agregar una plantilla

1. Crear el repo de la plantilla en `eclass/apps` (por ejemplo `template_php`), usando un
   nombre fijo como placeholder (`template-php`) en todos los lugares donde va el nombre del
   proyecto, y `<servicio>` donde va el nombre del servicio.
2. Completar su entrada en `src/templates.js` (`repo` y `placeholder`) y sus pasos para programar
   en `DEV_STEPS` (`src/cli.js`). Si guarda la versión en otro archivo, sumarlo a `resetVersion`.
3. Probar: `node bin/eclass.js start prueba-x php --from ../template_php`.

## Desarrollo

```bash
nvm use
npm install
npm run typecheck && npm test
```

// @ts-check
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { TEMPLATES, DEFAULT_TEMPLATE } from "./templates.js";
import { validateName, createProject } from "./start.js";

const pkg = createRequire(import.meta.url)("../package.json");

const HELP = `eclass ${pkg.version}: crea proyectos para la plataforma de aplicaciones de eClass

Uso:
  npx @eclass/cli start <nombre-proyecto> [plantilla]

Plantillas:
${Object.entries(TEMPLATES)
  .map(([key, t]) => `  ${key.padEnd(8)} ${t.description}${key === DEFAULT_TEMPLATE ? " (por defecto)" : ""}`)
  .join("\n")}

Opciones:
  --from <ruta|url>  Usa otra fuente para la plantilla (una carpeta local o un repo git)
  -h, --help         Muestra esta ayuda
  -v, --version      Muestra la versión

Ejemplos:
  npx @eclass/cli start mi-app            # Node.js
  npx @eclass/cli start mi-app python`;

// Cómo empezar a programar, según la plantilla.
/** @type {Record<string, string>} */
const DEV_STEPS = {
  nodejs: `  nvm use && npm install
  npm run dev                      # http://localhost:8080`,
  python: `  python3.12 -m venv .venv && make install
  make dev                         # http://localhost:8080`,
};

/**
 * @param {string} name
 * @param {string} dest
 * @param {string} templateKey
 */
function nextSteps(name, dest, templateKey) {
  const repo = name.replaceAll("-", "_");
  return `
Proyecto creado en ${dest}

Para programar:
  cd ${name}
${DEV_STEPS[templateKey] ?? DEV_STEPS[DEFAULT_TEMPLATE]}

Para publicar (una vez):
  1. Crea el repo en GitLab: eclass/apps/${repo}
  2. Variables del proyecto (Settings → CI/CD → Variables):
       CLOUD_RUN_SERVICE = ${name}
       SUBDOMAIN         = ${name}.eclass.com   (verifica en Cloudflare que esté libre)
  3. git add -A && git commit -m "feat: proyecto inicial"
     git remote add origin git@gitlab.com:eclass/apps/${repo}.git
     git push -u origin main         # push a main = deploy a https://${name}.eclass.com

Reglas de trabajo y paso a producción: AGENTS.md`;
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, log?: (msg: string) => void, error?: (msg: string) => void }} [io]
 * @returns {number} código de salida
 */
export function main(argv, io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const log = io.log ?? console.log;
  const error = io.error ?? console.error;

  /** @type {ReturnType<typeof parseArgs>} */
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        from: { type: "string" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (err) {
    error(`${err instanceof Error ? err.message : err}\n\n${HELP}`);
    return 1;
  }
  const { values, positionals } = parsed;

  if (values.version) {
    log(pkg.version);
    return 0;
  }
  const [command, name, templateKey = DEFAULT_TEMPLATE] = positionals;
  if (values.help || !command) {
    log(HELP);
    return 0;
  }
  if (command !== "start") {
    error(`Comando desconocido: ${command}\n\n${HELP}`);
    return 1;
  }

  const nameError = validateName(name);
  if (nameError) {
    error(nameError);
    return 1;
  }
  const template = TEMPLATES[templateKey];
  if (!template) {
    error(`Plantilla desconocida: ${templateKey}. Disponibles: ${Object.keys(TEMPLATES).join(", ")}`);
    return 1;
  }
  const from = typeof values.from === "string" ? values.from : null;
  const source = from ?? template.repo;
  if (!source) {
    error(`La plantilla ${templateKey} todavía no está disponible. Por ahora: ${DEFAULT_TEMPLATE}.`);
    return 1;
  }

  try {
    log(`Creando ${name} con la plantilla ${templateKey}…`);
    const dest = createProject({ name: /** @type {string} */ (name), source, placeholder: template.placeholder, cwd });
    log(nextSteps(/** @type {string} */ (name), dest, templateKey));
    return 0;
  } catch (err) {
    error(`No se pudo crear el proyecto: ${err instanceof Error ? err.message : err}`);
    if (!from) error("Si falló el clon, revisa tu acceso SSH a gitlab.com/eclass (ssh -T git@gitlab.com).");
    return 1;
  }
}

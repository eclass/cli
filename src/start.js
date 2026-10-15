// @ts-check
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

// Cloud Run limita el nombre del servicio a 49 caracteres, y el subdominio no admite guion bajo.
// El nombre del proyecto es a la vez carpeta, paquete, servicio y subdominio, así que debe
// cumplir la regla más estricta de todas.
const NAME_RE = /^[a-z][a-z0-9-]{0,47}[a-z0-9]$/;

/**
 * Devuelve un mensaje de error en español o null si el nombre sirve.
 * @param {string | undefined} name
 * @returns {string | null}
 */
export function validateName(name) {
  if (!name) return "Falta el nombre del proyecto. Ejemplo: npx eclass start mi-app";
  if (name.includes("_")) {
    return `"${name}" tiene guion bajo: el subdominio no lo admite. Usa guiones medios (${name.replaceAll("_", "-")}).`;
  }
  if (!NAME_RE.test(name)) {
    return `"${name}" no sirve: solo minúsculas, números y guiones medios, parte con letra, termina en letra o número, de 2 a 49 caracteres.`;
  }
  if (name.includes("--")) return `"${name}" tiene dos guiones seguidos.`;
  return null;
}

// Carpetas que nunca se copian ni se recorren.
const SKIP_DIRS = new Set([".git", "node_modules"]);

/**
 * Reemplaza el placeholder y `<servicio>` en todos los archivos de texto del proyecto.
 * Un archivo con un byte NUL se considera binario y no se toca.
 * @param {string} dir
 * @param {string} placeholder
 * @param {string} name
 * @returns {string[]} archivos modificados (relativos a dir)
 */
export function replaceInTree(dir, placeholder, name) {
  /** @type {string[]} */
  const changed = [];
  /** @param {string} current */
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const buf = readFileSync(full);
      if (buf.includes(0)) continue;
      const text = buf.toString("utf8");
      const next = text.replaceAll(placeholder, name).replaceAll("<servicio>", name);
      if (next !== text) {
        writeFileSync(full, next);
        changed.push(path.relative(dir, full));
      }
    }
  };
  walk(dir);
  return changed;
}

/**
 * Un proyecto nuevo parte en 0.1.0, no en la versión de la plantilla.
 * @param {string} dir
 */
export function resetVersion(dir) {
  for (const file of ["package.json", "package-lock.json"]) {
    const full = path.join(dir, file);
    if (!existsSync(full)) continue;
    const json = JSON.parse(readFileSync(full, "utf8"));
    json.version = "0.1.0";
    if (json.packages?.[""]) json.packages[""].version = "0.1.0";
    writeFileSync(full, JSON.stringify(json, null, 2) + "\n");
  }
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} [cwd]
 */
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.error) throw new Error(`No se pudo ejecutar ${cmd}: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} terminó con código ${r.status}`);
}

/**
 * Trae la plantilla a `dest`: si `source` es una carpeta local la copia (sirve para probar
 * una plantilla sin publicarla); si no, la clona con git (profundidad 1).
 * @param {string} source
 * @param {string} dest
 */
export function fetchTemplate(source, dest) {
  if (existsSync(source) && statSync(source).isDirectory()) {
    cpSync(source, dest, {
      recursive: true,
      filter: (src) => !SKIP_DIRS.has(path.basename(src)),
    });
    return;
  }
  run("git", ["clone", "--quiet", "--depth", "1", source, dest]);
  rmSync(path.join(dest, ".git"), { recursive: true, force: true });
}

/**
 * Crea el proyecto completo. Devuelve la ruta creada.
 * @param {{ name: string, source: string, placeholder: string, cwd: string, gitInit?: boolean }} opts
 * @returns {string}
 */
export function createProject({ name, source, placeholder, cwd, gitInit = true }) {
  const dest = path.resolve(cwd, name);
  if (existsSync(dest)) throw new Error(`La carpeta ${dest} ya existe. Elige otro nombre o bórrala.`);
  try {
    fetchTemplate(source, dest);
    replaceInTree(dest, placeholder, name);
    resetVersion(dest);
    if (gitInit) run("git", ["init", "--quiet", "-b", "main"], dest);
  } catch (err) {
    // Sin carpeta a medias: si algo falló, el usuario puede reintentar con el mismo nombre.
    rmSync(dest, { recursive: true, force: true });
    throw err;
  }
  return dest;
}

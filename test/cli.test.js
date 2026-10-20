// @ts-check
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { main } from "../src/cli.js";
import { validateName } from "../src/start.js";
import { TEMPLATES } from "../src/templates.js";

/** @type {string} */
let work;
/** @type {string} */
let fixture;

// Plantilla mínima de prueba: lo justo para verificar copia, reemplazo y exclusiones.
beforeEach(() => {
  work = mkdtempSync(path.join(tmpdir(), "eclass-cli-"));
  fixture = path.join(work, "fixture");
  mkdirSync(path.join(fixture, "node_modules", "dep"), { recursive: true });
  mkdirSync(path.join(fixture, "src"));
  writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ name: "template-nodejs", version: "3.2.1" }));
  writeFileSync(path.join(fixture, "package-lock.json"), JSON.stringify({
    name: "template-nodejs", version: "3.2.1", packages: { "": { name: "template-nodejs", version: "3.2.1" } },
  }));
  writeFileSync(path.join(fixture, "README.md"), "# template-nodejs\nhttps://<servicio>.eclass.com\n");
  writeFileSync(path.join(fixture, "src", "logo.bin"), Buffer.from([0, 1, 2, ...Buffer.from("template-nodejs")]));
  writeFileSync(path.join(fixture, "node_modules", "dep", "index.js"), "template-nodejs");
});

afterEach(() => rmSync(work, { recursive: true, force: true }));

/** @param {string[]} argv */
function runCli(argv) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const err = [];
  const code = main(argv, { cwd: work, log: (m) => out.push(m), error: (m) => err.push(m) });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

test("validateName acepta nombres de servicio válidos", () => {
  for (const ok of ["sso", "mi-app", "a1", "panel-ventas-2"]) assert.equal(validateName(ok), null, ok);
});

test("validateName rechaza lo que Cloud Run o el subdominio no admiten", () => {
  for (const bad of [undefined, "", "a", "Mi-App", "mi_app", "1app", "app-", "-app", "mi--app", "a".repeat(50)]) {
    assert.notEqual(validateName(bad), null, String(bad));
  }
  assert.match(validateName("mi_app") ?? "", /mi-app/);
});

test("start crea el proyecto: reemplaza el nombre, resetea la versión y omite node_modules", () => {
  const r = runCli(["start", "mi-app", "nodejs", "--from", fixture]);
  assert.equal(r.code, 0, r.err);
  const dest = path.join(work, "mi-app");

  const pkg = JSON.parse(readFileSync(path.join(dest, "package.json"), "utf8"));
  assert.deepEqual([pkg.name, pkg.version], ["mi-app", "0.1.0"]);
  const lock = JSON.parse(readFileSync(path.join(dest, "package-lock.json"), "utf8"));
  assert.deepEqual([lock.name, lock.version, lock.packages[""].name, lock.packages[""].version], ["mi-app", "0.1.0", "mi-app", "0.1.0"]);
  assert.equal(readFileSync(path.join(dest, "README.md"), "utf8"), "# mi-app\nhttps://mi-app.eclass.com\n");

  // Binario intacto, node_modules sin copiar, repo git nuevo.
  assert.ok(readFileSync(path.join(dest, "src", "logo.bin")).includes("template-nodejs"));
  assert.equal(existsSync(path.join(dest, "node_modules")), false);
  assert.equal(existsSync(path.join(dest, ".git")), true);

  assert.match(r.out, /CLOUD_RUN_SERVICE = mi-app/);
  assert.match(r.out, /eclass\/apps\/mi_app/);
});

test("start sin plantilla usa nodejs", () => {
  assert.equal(runCli(["start", "otra-app", "--from", fixture]).code, 0);
});

test("start no pisa una carpeta existente", () => {
  mkdirSync(path.join(work, "mi-app"));
  const r = runCli(["start", "mi-app", "--from", fixture]);
  assert.equal(r.code, 1);
  assert.match(r.err, /ya existe/);
});

test("start rechaza plantillas desconocidas o aún no disponibles", () => {
  assert.match(runCli(["start", "mi-app", "ruby"]).err, /Plantilla desconocida/);
  assert.match(runCli(["start", "mi-app", "php"]).err, /todavía no está disponible/);
  assert.equal(existsSync(path.join(work, "mi-app")), false);
});

test("si la fuente falla no queda una carpeta a medias", () => {
  const r = runCli(["start", "mi-app", "--from", path.join(work, "no-existe")]);
  assert.equal(r.code, 1);
  assert.equal(existsSync(path.join(work, "mi-app")), false);
});

test("ayuda y comando desconocido", () => {
  assert.match(runCli([]).out, /npx @eclass\/cli start/);
  assert.equal(runCli(["crear"]).code, 1);
});

// Contrato con el otro repo: si template_nodejs está al lado, su package.json debe usar el
// placeholder que este CLI reemplaza (si alguien lo renombra allá, esto avisa).
test("el placeholder coincide con el nombre en template_nodejs", (t) => {
  const sibling = path.resolve(import.meta.dirname, "..", "..", "template_nodejs", "package.json");
  if (!existsSync(sibling)) return t.skip("template_nodejs no está clonado al lado");
  assert.equal(JSON.parse(readFileSync(sibling, "utf8")).name, TEMPLATES.nodejs.placeholder);
});

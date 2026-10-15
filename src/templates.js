// @ts-check

/**
 * Plantillas disponibles para `eclass start`.
 * - repo: de dónde se clona (necesita acceso SSH a GitLab de eClass).
 * - placeholder: texto que la plantilla usa como nombre del proyecto y que se reemplaza
 *   por el nombre nuevo (package.json, package-lock.json, README, etc.).
 * Una plantilla con repo null todavía no existe: se anuncia pero no se puede usar.
 *
 * @typedef {{ repo: string | null, placeholder: string, description: string }} Template
 * @type {Record<string, Template>}
 */
export const TEMPLATES = {
  nodejs: {
    repo: "git@gitlab.com:eclass/mvps_internos/template_nodejs.git",
    placeholder: "template-nodejs",
    description: "Node 24 + Express 5 + TypeScript sin build",
  },
  php: {
    repo: null,
    placeholder: "template-php",
    description: "PHP 8.4 (próximamente)",
  },
  python: {
    repo: null,
    placeholder: "template-python",
    description: "Python 3.12 (próximamente)",
  },
};

export const DEFAULT_TEMPLATE = "nodejs";

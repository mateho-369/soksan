/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SokSan REST API, e.g. https://api.soksan.app/api/v1 */
  readonly VITE_API_BASE_URL?: string;
  /** When set, the Vite dev server proxies this prefix to the given target. */
  readonly VITE_DEV_PROXY?: string;
  /** "false" disables the in-browser demo backend (real API mode). */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

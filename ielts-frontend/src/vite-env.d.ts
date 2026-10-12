/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Bỏ trống khi dùng proxy của Vite ở dev; đặt URL đầy đủ khi build production */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

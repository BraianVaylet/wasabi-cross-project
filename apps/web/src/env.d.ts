interface ImportMetaEnv {
  /** La URL de la API. Sin ella, el front le pega al mismo origen. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

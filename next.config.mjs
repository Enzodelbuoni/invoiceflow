/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Logo do negócio (etapa 39): até 2 MB + a sobra do multipart/form-data.
      // O padrão é 1 MB. O arquivo é regravado no servidor bem menor (WebP ≤ 512 px).
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;

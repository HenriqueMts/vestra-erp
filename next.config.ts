import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem output: "export" para Server Actions e API funcionarem.
  // Para Tauri: use desktop:dev (abre localhost:3000) ou aponte o app para a URL do deploy.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kxzcdbptmuchwzxnijiv.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

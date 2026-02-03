"use client";

import { useState, useRef } from "react";
import { Loader2, ImagePlus, X, Star } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { uploadProductImage } from "@/actions/upload";

interface ImageUploadProps {
  value: string[]; // Recebe array de URLs
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function ImageUpload({
  value = [],
  onChange,
  disabled,
}: Readonly<ImageUploadProps>) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    setIsUploading(true);

    try {
      // Upload em paralelo
      const uploadPromises = files.map(async (file) => {
        if (file.size > 5 * 1024 * 1024)
          throw new Error(`Arquivo ${file.name} muito grande (max 5MB)`);

        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadProductImage(formData);

        if (result.error) throw new Error(result.error);
        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((u): u is string => !!u);

      // Adiciona as novas imagens ao final da lista existente
      onChange([...value, ...validUrls]);
      toast.success(`${validUrls.length} imagem(ns) adicionada(s)!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro no upload", {
        description: "Falha ao enviar algumas imagens.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  const handleSetCover = (urlToCover: string) => {
    // Move a imagem selecionada para o índice 0 (Capa)
    const others = value.filter((u) => u !== urlToCover);
    onChange([urlToCover, ...others]);
    toast.info("Nova capa definida!");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {value.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 group bg-slate-100"
          >
            <Image
              src={url}
              alt="Imagem do produto"
              fill
              className="object-cover"
            />

            {/* Botões de Ação (Aparecem no Hover) */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSetCover(url)}
                className={`p-1.5 rounded-full ${index === 0 ? "bg-yellow-400 text-white cursor-default" : "bg-white text-slate-600 hover:bg-yellow-100"}`}
                title={index === 0 ? "Foto de Capa" : "Definir como Capa"}
              >
                <Star size={16} fill={index === 0 ? "currentColor" : "none"} />
              </button>

              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="p-1.5 rounded-full bg-white text-red-600 hover:bg-red-50"
                title="Remover"
              >
                <X size={16} />
              </button>
            </div>

            {index === 0 && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                CAPA
              </div>
            )}
          </div>
        ))}

        {/* Botão de Adicionar */}
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
                    aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2
                    transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100
                    ${isUploading ? "opacity-50 pointer-events-none" : ""}
                `}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">
                Adicionar
              </span>
            </>
          )}
        </div>
      </div>

      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
    </div>
  );
}

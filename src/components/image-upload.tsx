"use client";

import { useState, useRef } from "react";
import { Loader2, ImagePlus, X, Star } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

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
      const tooLarge = files.filter((f) => f.size > 20 * 1024 * 1024);
      if (tooLarge.length > 0) {
        toast.error("Arquivo muito grande", {
          description: `${tooLarge.map((f) => f.name).join(", ")} excede o limite de 20MB.`,
        });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Obter organizationId uma vez
      const orgRes = await fetch("/api/upload/get-org-id");
      const orgData = await orgRes.json();
      if (!orgRes.ok || !orgData.organizationId) {
        toast.error("Erro", { description: "Não foi possível obter informações da organização." });
        setIsUploading(false);
        return;
      }

      const supabase = createClient();

      const uploadPromises = files.map(async (file, index) => {
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${orgData.organizationId}/${Date.now()}-${index}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from("products")
          .upload(fileName, file, { upsert: true });

        if (error) {
          console.error("Erro upload:", error);
          return null;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("products").getPublicUrl(fileName);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((u): u is string => !!u);

      if (validUrls.length > 0) {
        onChange([...value, ...validUrls]);
        toast.success(`${validUrls.length} imagem(ns) adicionada(s)!`);
      }
      if (validUrls.length < files.length) {
        toast.error("Algumas imagens falharam no envio.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro no upload", {
        description: "Falha ao enviar imagens.",
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
            className="relative aspect-square rounded-lg overflow-hidden border border-border group bg-muted"
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
                className={`p-1.5 rounded-full ${index === 0 ? "bg-yellow-400 text-white cursor-default" : "bg-card text-muted-foreground hover:bg-muted"}`}
                title={index === 0 ? "Foto de Capa" : "Definir como Capa"}
              >
                <Star size={16} fill={index === 0 ? "currentColor" : "none"} />
              </button>

              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="p-1.5 rounded-full bg-card text-destructive hover:bg-destructive/10"
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
                    aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2
                    transition-colors cursor-pointer bg-muted/50 hover:bg-muted
                    ${isUploading ? "opacity-50 pointer-events-none" : ""}
                `}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Adicionar
              </span>
            </>
          )}
        </div>
      </div>

      <input
        type="file"
        multiple
        accept="image/*,.img"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
    </div>
  );
}

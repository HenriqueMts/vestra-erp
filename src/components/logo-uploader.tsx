"use client";

import { useState, useRef } from "react";
import { uploadLogo } from "@/actions/upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LogoUploaderProps {
  initialUrl?: string | null;
  orgName: string;
}

export function LogoUploader({
  initialUrl,
  orgName,
}: Readonly<LogoUploaderProps>) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(initialUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Validação básica
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Erro", { description: "O logo deve ter no máximo 2MB." });
      return;
    }

    setIsUploading(true);

    // Preview local imediato
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadLogo(formData);

      if (result.error) {
        toast.error("Erro ao atualizar logo", { description: result.error });
        setPreview(initialUrl); // Reverte se der erro
      } else {
        toast.success("Logo atualizado com sucesso!");
        router.refresh(); // Atualiza a página para refletir no header
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado ao enviar logo.");
      setPreview(initialUrl);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
      <div className="relative group">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-slate-100 shadow-md">
          <AvatarImage src={preview || ""} className="object-cover" />
          <AvatarFallback className="text-xl sm:text-2xl font-bold bg-slate-50 text-slate-400">
            {orgName?.substring(0, 2).toUpperCase() || "OR"}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <h3 className="font-semibold text-sm sm:text-base text-slate-900">
          Logo da Empresa
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-sm">
          Recomendado: JPG ou PNG, pelo menos 400x400px. Máximo 2MB.
        </p>

        <div className="flex justify-center sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs sm:text-sm"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            {isUploading ? "Enviando..." : "Alterar Imagem"}
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

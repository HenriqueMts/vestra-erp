"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
    setIsUploading(true);

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      // Obter organizationId
      const orgRes = await fetch("/api/upload/get-org-id");
      const orgData = await orgRes.json();
      if (!orgRes.ok || !orgData.organizationId) {
        toast.error("Erro", { description: "Não foi possível obter informações da organização." });
        setPreview(initialUrl);
        setIsUploading(false);
        return;
      }

      const supabase = createClient();
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${orgData.organizationId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Erro upload:", uploadError);
        toast.error("Erro ao atualizar logo", { description: "Falha ao enviar imagem." });
        setPreview(initialUrl);
        setIsUploading(false);
        return;
      }

      // Atualizar no banco via API route
      const updateRes = await fetch("/api/upload/logo/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });

      const updateResult = await updateRes.json();

      if (!updateRes.ok || updateResult.error) {
        toast.error("Erro", { description: updateResult.error || "Falha ao salvar URL no banco." });
        setPreview(initialUrl);
      } else {
        toast.success("Logo atualizado com sucesso!");
        router.refresh();
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
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-border shadow-md">
          <AvatarImage src={preview || ""} className="object-cover" />
          <AvatarFallback className="text-xl sm:text-2xl font-bold bg-muted text-muted-foreground">
            {orgName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <h3 className="font-semibold text-sm sm:text-base text-foreground">
          Logo da Empresa
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Recomendado: JPG ou PNG, pelo menos 400x400px. Máximo 20MB.
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
          accept="image/*,.img"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

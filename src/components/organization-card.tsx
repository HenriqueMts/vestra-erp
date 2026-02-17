"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogoUploader } from "@/components/logo-uploader";
import { OrganizationProfileForm } from "@/components/organization-profile-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OrganizationCardProps {
  orgName: string;
  orgDocument: string;
  orgLogoUrl: string | null;
  isOwner: boolean;
}

export function OrganizationCard({
  orgName,
  orgDocument,
  orgLogoUrl,
  isOwner,
}: Readonly<OrganizationCardProps>) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-lg">
            <AvatarImage src={orgLogoUrl ?? undefined} alt={orgName} className="object-cover" />
            <AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-lg">
              {orgName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{orgName || "Sua Empresa"}</p>
            <p className="text-sm text-muted-foreground">Razão social e CNPJ editáveis pelo dono</p>
          </div>
        </div>
        {isOwner ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2 shrink-0"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Apenas o dono pode editar nome, CNPJ e logo.</p>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar dados da empresa</DialogTitle>
            <DialogDescription>
              Altere o logo, razão social e CNPJ. O CNPJ é usado na NFC-e e em documentos fiscais.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {isOwner && (
              <div className="border-b border-border pb-6">
                <LogoUploader
                  initialUrl={orgLogoUrl}
                  orgName={orgName || "Sua Empresa"}
                />
              </div>
            )}
            <OrganizationProfileForm
              initialName={orgName}
              initialDocument={orgDocument}
              isOwner={isOwner}
              onSuccess={() => setEditOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

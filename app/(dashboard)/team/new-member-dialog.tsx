"use client";

import { useState } from "react";
import { createMember } from "@/actions/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Loader2, Mail } from "lucide-react";

export function NewMemberDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    const result = await createMember(formData);
    setIsPending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Convite enviado!", {
        description:
          "O funcionário receberá um e-mail para configurar a senha.",
      });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white gap-2">
          <UserPlus size={16} /> Convidar Membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para Equipe</DialogTitle>
          <DialogDescription>
            Enviaremos um link de acesso para o e-mail informado.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Funcionário</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Ex: Maria Oliveira"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail Profissional</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="maria@jilem.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Cargo / Permissão</Label>
            <Select name="role" defaultValue="seller">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="seller">Vendedor (Acesso Padrão)</SelectItem>
                <SelectItem value="manager">
                  Gerente (Pode convidar outros)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full mt-4 bg-slate-900"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" /> Enviando Convite...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Enviar Convite
              </span>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

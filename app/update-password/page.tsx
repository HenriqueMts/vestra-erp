"use client";

import { useState } from "react";
import { updatePassword } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, LockKeyhole } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UpdatePasswordPage() {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    const result = await updatePassword(formData);
    if (result?.error) {
      toast.error(result.error);
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:py-0">
      <Card className="w-full max-w-md border-slate-200 shadow-2xl">
        <CardHeader className="space-y-2 pb-3 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <LockKeyhole className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl text-slate-900">
            Defina sua Senha
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Como este é seu primeiro acesso via convite, você precisa criar uma
            senha segura para continuar.
          </CardDescription>
        </CardHeader>

        <form action={handleSubmit}>
          <CardContent className="space-y-4 pt-4 px-4 sm:px-6">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs sm:text-sm font-medium"
              >
                Nova Senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="******"
                minLength={6}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-xs sm:text-sm font-medium"
              >
                Confirmar Senha
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="******"
                minLength={4}
                className="text-sm sm:text-base"
              />
            </div>
          </CardContent>

          <div className="p-4 sm:p-6 pt-0">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 bg-slate-900 hover:bg-black text-white py-4 sm:py-5 text-sm sm:text-base font-medium"
            >
              {isPending ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Salvar e Entrar"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { login, checkNeedsPasswordChange } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Hexagon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

function parseHashParams(hash: string): Record<string, string> {
  if (!hash.startsWith("#")) return {};
  const params: Record<string, string> = {};
  const query = hash.slice(1);
  for (const part of query.split("&")) {
    const [key, value] = part.split("=").map(decodeURIComponent);
    if (key && value) params[key] = value;
  }
  return params;
}

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false);
  const [handlingAuth, setHandlingAuth] = useState(true);
  const router = useRouter();

  // Magic link / invite: Supabase envia tokens no hash (invite não suporta PKCE).
  // O callback em /auth/callback só recebe ?code=; o hash nunca chega no servidor.
  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    const hash = globalThis.window.location.hash;
    const params = parseHashParams(hash);
    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    const type = params.type;

    if (!accessToken || !refreshToken) {
      setHandlingAuth(false);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async () => {
        const url = new URL(globalThis.window.location.href);
        url.hash = "";
        url.searchParams.delete("error");
        globalThis.window.history.replaceState({}, "", url.pathname + url.search);
        const isInviteFromHash = type === "invite";
        const { needsPasswordChange } = await checkNeedsPasswordChange();
        if (isInviteFromHash || needsPasswordChange) {
          router.replace("/update-password");
        } else {
          router.replace("/pos");
        }
      })
      .catch(() => {
        setHandlingAuth(false);
        toast.error("Falha ao confirmar acesso", {
          description: "O link pode ter expirado. Tente novamente.",
        });
      });
  }, [router]);

  const handleLogin = async (formData: FormData) => {
    setIsPending(true);

    try {
      const result = await login(formData);

      if (result?.error) {
        toast.error("Falha ao entrar", {
          description: result.error,
          duration: 4000,
        });
        setIsPending(false);
      } else if (result?.success) {
        toast.success("Login realizado!", {
          description: "Acessando o sistema...",
        });
        router.push("/pos");
        setTimeout(() => setIsPending(false), 8000);
      } else {
        toast.error("Erro desconhecido", {
          description: "O servidor não enviou uma confirmação válida.",
        });
        setIsPending(false);
      }
    } catch (error) {
      toast.error("Erro de Conexão", {
        description: "Verifique o console para mais detalhes.",
      });
      setIsPending(false);
    }
  };

  if (handlingAuth) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-8 sm:py-0">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Confirmando acesso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-8 sm:py-0">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center justify-center gap-3 bg-gradient-to-br from-primary to-primary/80 p-4 rounded-2xl shadow-lg">
            <Hexagon className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Vestra ERP
          </h1>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Acesso Restrito
          </p>
        </div>

        <Card className="border-border shadow-2xl">
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-xl sm:text-2xl text-center text-foreground">
              Acessar Painel
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-sm sm:text-base">
              Digite suas credenciais de acesso.
            </CardDescription>
          </CardHeader>

          <form action={handleLogin}>
            <CardContent className="space-y-4 pt-4 px-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  className="bg-muted/60 text-sm sm:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="bg-muted/60 text-sm sm:text-base"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2 px-4 sm:px-6 pb-4 sm:pb-6">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-5 sm:py-6 text-sm sm:text-base font-medium"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

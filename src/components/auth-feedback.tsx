"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function AuthFeedback() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  useEffect(() => {
    if (error) {
      toast.error("Erro na Autenticação", {
        description: decodeURIComponent(error),
      });
    }

    if (message) {
      toast.success("Sucesso!", {
        description: decodeURIComponent(message),
      });
    }
  }, [error, message]);

  return null;
}

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LockKeyholeOpen } from "lucide-react";

interface CloseCashButtonProps {
  storeId?: string | null;
}

export function CloseCashButton({ storeId }: Readonly<CloseCashButtonProps>) {
  const router = useRouter();

  const handleClick = () => {
    router.push("/dashboard/cash-closure");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handleClick}
    >
      <LockKeyholeOpen size={16} />
      Fechar caixa de hoje
    </Button>
  );
}


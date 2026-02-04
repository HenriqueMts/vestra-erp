"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Store, Plus, Trash2, MapPin } from "lucide-react"; // Removemos Phone dos imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { createStore, deleteStore } from "@/actions/stores";

const formSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  address: z.string().optional(),
});

interface StoreItem {
  id: string;
  name: string;
  address: string | null;
  // phone removido
}

interface StoresSettingsProps {
  initialStores: StoreItem[];
}

export function StoresSettings({
  initialStores,
}: Readonly<StoresSettingsProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const result = await createStore(values);
    setLoading(false);

    if (result.success) {
      toast.success(result.message);
      setIsOpen(false);
      form.reset();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteStore(id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
          Filiais ({initialStores.length})
        </h3>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus size={16} /> Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Loja</DialogTitle>
              <DialogDescription>
                Cadastre uma nova filial para gerenciar estoque e funcionários
                separadamente.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Loja</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Filial Shopping" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Localização..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 text-white"
                  >
                    {loading ? "Criando..." : "Criar Loja"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {initialStores.map((store, index) => (
          <div
            key={store.id}
            className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Store size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {store.name}
                    </h4>
                    {index === 0 && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        MATRIZ
                      </span>
                    )}
                  </div>
                </div>

                {index !== 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Loja?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá a loja e <b>todo o estoque</b> vinculado
                          a ela.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(store.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              <div className="space-y-1 mt-3">
                {store.address ? (
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <MapPin size={14} /> {store.address}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Sem endereço cadastrado
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

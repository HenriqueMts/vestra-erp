"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";

interface CategoriesClientProps {
  initialCategories: { id: string; name: string }[];
}

export function CategoriesClient({
  initialCategories,
}: CategoriesClientProps) {
  const [categoriesList, setCategoriesList] = useState(initialCategories);
  const [categoryName, setCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = async () => {
    const trimmed = categoryName.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    const result = await createCategory({ name: trimmed });
    if (result.success) {
      toast.success(result.message);
      setCategoryName("");
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error("Nome não pode ser vazio.");
      return;
    }
    const result = await updateCategory(editingId, { name: trimmed });
    if (result.success) {
      toast.success(result.message);
      setEditingId(null);
      setEditingName("");
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast.success(result.message);
      setCategoriesList((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag size={18} /> Nova Categoria
          </CardTitle>
          <CardDescription>
            Adicione categorias como Camisa, Calça, Macacão, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              placeholder="Ex: Camisa"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button
            onClick={handleAdd}
            className="w-full bg-slate-900 text-white"
          >
            <Plus size={16} className="mr-2" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Categorias Cadastradas</CardTitle>
          <CardDescription>
            Clique no lápis para editar. Os itens aparecem em ordem alfabética.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesList.length === 0 ? (
            <p className="text-slate-500 text-sm">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 p-2 px-4 border rounded-lg bg-slate-50 min-w-[100px] justify-between group"
                >
                  <span className="font-medium text-slate-900">{cat.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(cat.id, cat.name)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                      aria-label="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Ex: Camisa"
                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} className="bg-slate-900">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

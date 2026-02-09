"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Trash2, Plus, Palette, Ruler } from "lucide-react";
import { toast } from "sonner";
import {
  createColor,
  deleteColor,
  createSize,
  deleteSize,
} from "@/actions/attributes";

interface AttributesClientProps {
  initialColors: { id: string; name: string; hex: string }[];
  initialSizes: { id: string; name: string }[];
}

export function AttributesClient({
  initialColors,
  initialSizes,
}: AttributesClientProps) {
  // --- STATE CORES ---
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [colorsList, setColorsList] = useState(initialColors);

  // --- STATE TAMANHOS ---
  const [sizeName, setSizeName] = useState("");
  const [sizeOrder, setSizeOrder] = useState(0);
  const [sizesList, setSizesList] = useState(initialSizes);

  // --- HANDLERS CORES ---
  const handleAddColor = async () => {
    const result = await createColor({ name: colorName, hex: colorHex });
    if (result.success) {
      toast.success(result.message);
      setColorName("");
      // Otimista ou Recarregar (aqui vamos confiar no revalidatePath mas atualizar local para feedback rápido)
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteColor = async (id: string) => {
    const result = await deleteColor(id);
    if (result.success) {
      toast.success(result.message);
      setColorsList((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error(result.error);
    }
  };

  // --- HANDLERS TAMANHOS ---
  const handleAddSize = async () => {
    const result = await createSize({
      name: sizeName,
      order: Number(sizeOrder),
    });
    if (result.success) {
      toast.success(result.message);
      setSizeName("");
      window.location.reload();
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteSize = async (id: string) => {
    const result = await deleteSize(id);
    if (result.success) {
      toast.success(result.message);
      setSizesList((prev) => prev.filter((s) => s.id !== id));
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Tabs defaultValue="colors" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="colors" className="gap-2">
          <Palette size={16} /> Cores
        </TabsTrigger>
        <TabsTrigger value="sizes" className="gap-2">
          <Ruler size={16} /> Tamanhos
        </TabsTrigger>
      </TabsList>

      {/* --- ABA CORES --- */}
      <TabsContent value="colors" className="space-y-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Nova Cor</CardTitle>
              <CardDescription>Adicione uma cor à paleta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Azul Marinho"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Código (Hex)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-12 h-10 p-1 cursor-pointer"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                  />
                  <Input
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="uppercase"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddColor}
                className="w-full bg-slate-900 text-white"
              >
                <Plus size={16} className="mr-2" /> Adicionar
              </Button>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Cores Cadastradas</CardTitle>
            </CardHeader>
            <CardContent>
              {colorsList.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Nenhuma cor cadastrada.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {colorsList.map(
                    (color: { id: string; name: string; hex: string }) => (
                      <div
                        key={color.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full border shadow-sm"
                            style={{ backgroundColor: color.hex || "#fff" }}
                          />
                          <span className="font-medium text-sm">
                            {color.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteColor(color.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* --- ABA TAMANHOS --- */}
      <TabsContent value="sizes" className="space-y-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Novo Tamanho</CardTitle>
              <CardDescription>
                Defina tamanhos (P, M, G, 38, 40...).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sigla / Nome</Label>
                <Input
                  placeholder="Ex: GG"
                  value={sizeName}
                  onChange={(e) => setSizeName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={sizeOrder}
                  onChange={(e) => setSizeOrder(Number(e.target.value))}
                />
                <p className="text-[10px] text-slate-500">
                  Menor número aparece primeiro.
                </p>
              </div>
              <Button
                onClick={handleAddSize}
                className="w-full bg-slate-900 text-white"
              >
                <Plus size={16} className="mr-2" /> Adicionar
              </Button>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Tamanhos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {sizesList.length === 0 ? (
                <p className="text-slate-500 text-sm">
                  Nenhum tamanho cadastrado.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {sizesList.map((size: { id: string; name: string }) => (
                    <div
                      key={size.id}
                      className="flex items-center gap-2 p-2 px-4 border rounded-lg bg-white shadow-sm min-w-[80px] justify-between"
                    >
                      <span className="font-bold text-slate-900">
                        {size.name}
                      </span>
                      <button
                        onClick={() => handleDeleteSize(size.id)}
                        className="text-slate-300 hover:text-red-500 ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

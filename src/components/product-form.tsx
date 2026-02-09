"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Plus, Trash2, Store } from "lucide-react";
import { saveProduct } from "@/actions/products";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";
import { Card, CardContent } from "@/components/ui/card";
import {
  saveProductSchema,
  type SaveProductInput,
  type ProductOptions,
  type ProductInitialData,
} from "@/types/product";

interface ProductFormProps {
  options: ProductOptions;
  initialData?: ProductInitialData;
  organizationId: string;
  onSuccess?: () => void;
  setOpen?: (open: boolean) => void;
}

export function ProductForm({
  options,
  initialData,
  organizationId,
  onSuccess,
  setOpen,
}: Readonly<ProductFormProps>) {
  const [loading, setLoading] = useState(false);

  const uniqueImages = new Set<string>();
  if (initialData) {
    if (initialData.imageUrl) uniqueImages.add(initialData.imageUrl);
    if (initialData.images && Array.isArray(initialData.images)) {
      const sorted = [...initialData.images].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      sorted.forEach((img) => uniqueImages.add(img.url));
    }
  }
  const existingImages = Array.from(uniqueImages);

  const initialStoreInventory = options.stores.map((store) => ({
    storeId: store.id,
    quantity: 0,
  }));

  let mappedSimpleInventory = initialStoreInventory;
  if (initialData?.inventory && !initialData.variants?.length) {
    mappedSimpleInventory = options.stores.map((store) => {
      const found = initialData.inventory?.find((i) => i.storeId === store.id);
      return { storeId: store.id, quantity: found ? found.quantity : 0 };
    });
  }

  const form = useForm<SaveProductInput>({
    resolver: zodResolver(saveProductSchema) as Resolver<SaveProductInput>,
    defaultValues: {
      id: initialData?.id,
      name: initialData?.name || "",
      price: initialData?.basePrice ? initialData.basePrice / 100 : 0,
      costPrice:
        initialData?.costPrice != null ? initialData.costPrice / 100 : undefined,
      description: initialData?.description || "",
      categoryId: initialData?.categoryId || "",
      status: initialData?.status || "active",
      images: existingImages,
      hasVariants: (initialData?.variants?.length || 0) > 0,
      sku: initialData?.sku || "",
      simpleInventory: mappedSimpleInventory,
      variants:
        initialData?.variants?.map((v) => ({
          id: v.id,
          sku: v.sku ?? "",
          colorId: v.colorId || undefined,
          sizeId: v.sizeId || undefined,
          inventory: options.stores.map((store) => {
            const found = v.inventory.find((i) => i.storeId === store.id);
            return { storeId: store.id, quantity: found ? found.quantity : 0 };
          }),
        })) || [],
    },
  });

  const { watch, control } = form;
  const hasVariants = watch("hasVariants");
  const price = watch("price");
  const costPrice = watch("costPrice");
  const saleNum = Number(price);
  const costNum =
    costPrice === undefined || costPrice === null
      ? null
      : (() => {
          const n = Number(costPrice);
          return Number.isFinite(n) ? n : null;
        })();
  const hasCost = costNum !== null && !Number.isNaN(costNum);
  const lucro =
    hasCost && Number.isFinite(saleNum)
      ? saleNum - costNum
      : null;
  const margemPercent =
    hasCost && Number.isFinite(saleNum) && saleNum > 0 && lucro !== null
      ? (lucro / saleNum) * 100
      : null;

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control,
    name: "variants",
  });

  const addVariant = () => {
    appendVariant({
      sku: "",
      colorId: undefined,
      sizeId: undefined,
      inventory: options.stores.map((s) => ({ storeId: s.id, quantity: 0 })),
    });
  };

  async function onSubmit(data: SaveProductInput) {
    setLoading(true);
    try {
      const result = await saveProduct(data, organizationId);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Produto salvo com sucesso!");

        if (onSuccess) onSuccess();
        if (setOpen) setOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 sm:space-y-8"
      >
        <div className="grid gap-4 sm:gap-6 p-4 sm:p-6 border rounded-lg sm:rounded-xl bg-slate-50/50">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
              Dados Básicos
            </h3>

            <FormField
              control={control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Galeria
                  </FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Camiseta Básica"
                        className="text-sm sm:text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Categoria
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-sm sm:text-base">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <FormField
                control={control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Preço de venda (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="text-sm sm:text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Preço de custo (R$)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Opcional"
                        className="text-sm sm:text-base"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === "" ? undefined : v);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">
                      Status
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-sm sm:text-base">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {margemPercent !== null && lucro !== null && (
              <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-slate-100 border border-slate-200 text-sm">
                <span className="text-slate-600">
                  <strong className="text-slate-800">Lucro por unidade:</strong>{" "}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(lucro)}
                </span>
                <span className="text-slate-600">
                  <strong className="text-slate-800">Margem:</strong>{" "}
                  {margemPercent.toFixed(1)}%
                </span>
              </div>
            )}

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    Descrição
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalhes do produto..."
                      className="resize-none text-sm sm:text-base min-h-[80px] sm:min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 p-4 sm:p-6 border rounded-lg sm:rounded-xl bg-white shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-900 text-base sm:text-lg">
                Estoque e Variações
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Defina se o produto é único ou tem grade (cor/tamanho).
              </p>
            </div>
            <FormField
              control={control}
              name="hasVariants"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer text-sm sm:text-base">
                    Tem variações?
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2">
            <FormField
              control={control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">
                    SKU (código da peça)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: CAM-BAS-001"
                      className="text-sm sm:text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!hasVariants && (

              <div className="space-y-3">
                <FormLabel className="text-sm sm:text-base">
                  Quantidade por Loja
                </FormLabel>
                {options.stores.length === 0 ? (
                  <div className="text-xs sm:text-sm text-amber-600 bg-amber-50 p-3 rounded">
                    Nenhuma loja cadastrada. O estoque ficará zerado.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {options.stores.map((store, index) => (
                      <div
                        key={store.id}
                        className="p-3 border rounded-lg bg-slate-50"
                      >
                        <div className="flex items-center gap-2 mb-2 text-xs sm:text-sm font-medium text-slate-700">
                          <Store className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="line-clamp-1">{store.name}</span>
                        </div>
                        <input
                          type="hidden"
                          {...form.register(`simpleInventory.${index}.storeId`)}
                          value={store.id}
                        />
                        <FormField
                          control={control}
                          name={`simpleInventory.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className="bg-white text-sm sm:text-base"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {hasVariants && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-2">
              {variantFields.map((field, index) => (
                <Card
                  key={field.id}
                  className="relative overflow-hidden bg-slate-50 border-slate-200"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 h-8 w-8 sm:h-9 sm:w-9 z-10"
                    onClick={() => removeVariant(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                  <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {/* ⚠️ CORREÇÃO: Input Hidden para o ID da Variante */}
                    {field.id && (
                      <input
                        type="hidden"
                        {...form.register(`variants.${index}.id`)}
                        value={field.id}
                      />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pr-8 sm:pr-10">
                      <FormField
                        control={control}
                        name={`variants.${index}.colorId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Cor
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white text-sm">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {options.colors.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-2">
                                      {c.hex && (
                                        <div
                                          className="w-3 h-3 rounded-full border flex-shrink-0"
                                          style={{ backgroundColor: c.hex }}
                                        />
                                      )}
                                      <span className="truncate">{c.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={control}
                        name={`variants.${index}.sizeId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs sm:text-sm">
                              Tamanho
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-white text-sm">
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {options.sizes.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                        Estoque por Loja
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                        {options.stores.map((store, sIndex) => (
                          <div key={store.id}>
                            <label className="text-[10px] text-slate-500 truncate block mb-1">
                              {store.name}
                            </label>
                            <input
                              type="hidden"
                              {...form.register(
                                `variants.${index}.inventory.${sIndex}.storeId`,
                              )}
                              value={store.id}
                            />
                            <FormField
                              control={control}
                              name={`variants.${index}.inventory.${sIndex}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="h-8 text-xs bg-white"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addVariant}
                className="w-full border-dashed text-sm sm:text-base h-10 sm:h-11"
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar Variante
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              if (setOpen) setOpen(false);
              else window.history.back();
            }}
            className="w-full sm:w-auto text-sm sm:text-base"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white w-full sm:w-auto sm:min-w-[140px] text-sm sm:text-base"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Produto
          </Button>
        </div>
      </form>
    </Form>
  );
}

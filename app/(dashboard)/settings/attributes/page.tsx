import { getAttributes } from "@/actions/attributes";
import { AttributesClient } from "@/components/attributes-client";

export default async function AttributesPage() {
  // Busca os dados no servidor e passa para o componente cliente
  const { colors, sizes } = await getAttributes();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Atributos de Produto
        </h1>
        <p className="text-slate-500">
          Gerencie as opções de cores e tamanhos disponíveis para o cadastro de
          produtos.
        </p>
      </div>

      <AttributesClient
        initialColors={colors.map((color) => ({
          id: color.id,
          name: color.name,
          hex: color.hex || "#000000",
        }))}
        initialSizes={sizes.map((size) => ({
          id: size.id,
          name: size.name,
        }))}
      />
    </div>
  );
}

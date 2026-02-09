"use client";

import Barcode from "react-barcode";

interface BarcodeLabelProps {
  sku: string;
  name: string;
  price: number;
  variantName?: string; // Ex: "Azul / M"
}

export function BarcodeLabel({
  sku,
  name,
  price,
  variantName,
}: BarcodeLabelProps) {
  return (
    <div className="flex flex-col items-center justify-center border p-2 w-[40mm] h-[25mm] bg-white text-black overflow-hidden break-inside-avoid">
      {/* Nome do Produto (Truncado) */}
      <span className="text-[8px] font-bold uppercase w-full text-center truncate px-1 leading-tight">
        {name}
      </span>

      {/* Detalhe da Variante (se houver) */}
      {variantName && (
        <span className="text-[7px] font-medium text-slate-600 mb-0.5">
          {variantName}
        </span>
      )}

      {/* O Código de Barras em si */}
      <div className="scale-75 origin-center">
        <Barcode
          value={sku}
          width={1.5}
          height={30}
          fontSize={10}
          margin={0}
          displayValue={true} // Mostra o texto embaixo das barras
        />
      </div>

      {/* Preço */}
      <span className="text-[10px] font-extrabold mt-1">
        {new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(price)}
      </span>
    </div>
  );
}

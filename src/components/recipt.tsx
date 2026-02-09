"use client";

import { forwardRef } from "react";
import Barcode from "react-barcode";

interface ReceiptProps {
  organization: { name: string; document?: string | null };
  store: { name: string };
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  total: number;
  date: Date;
  orderId: string;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  (props, ref) => {
    return (
      <div
        ref={ref}
        className="receipt-content w-[80mm] max-w-[80mm] bg-white p-3 text-[10px] font-mono leading-tight text-black print:p-2 print:min-w-0 print:box-border"
      >
        {/* Cabeçalho */}
        <div className="text-center mb-2 border-b border-black pb-2 border-dashed">
          <h2 className="font-bold text-sm uppercase">
            {props.organization.name}
          </h2>
          {props.organization.document && (
            <p className="text-[9px]">CNPJ/CPF: {props.organization.document}</p>
          )}
          <p>{props.store.name}</p>
          <p className="text-[9px]">{props.date.toLocaleString("pt-BR")}</p>
          <p className="mt-1 font-bold">VENDA #{props.orderId.slice(0, 8)}</p>
        </div>

        {/* Itens */}
        <div className="mb-2 border-b border-black pb-2 border-dashed">
          <div className="flex font-bold mb-1">
            <span className="w-8">QTD</span>
            <span className="flex-1">ITEM</span>
            <span className="w-12 text-right">VL</span>
          </div>
          {props.items.map((item, i) => (
            <div key={i} className="flex mb-1">
              <span className="w-8">{item.quantity}x</span>
              <span className="flex-1 truncate">{item.name}</span>
              <span className="w-12 text-right">{item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className="flex justify-between text-sm font-bold mb-4">
          <span>TOTAL A PAGAR</span>
          <span>R$ {props.total.toFixed(2)}</span>
        </div>

        {/* Rodapé */}
        <div className="text-center text-[9px] space-y-1 print:break-inside-avoid">
          <p>*** COMPROVANTE NÃO FISCAL ***</p>
          <p>Obrigado pela preferência!</p>
          <p>Sistema Vestra</p>
          <div className="flex justify-center mt-2 overflow-hidden [&>svg]:max-w-full [&>svg]:min-w-0">
            <Barcode
              value={props.orderId}
              width={1}
              height={22}
              fontSize={9}
              margin={0}
              displayValue={true}
            />
          </div>
        </div>
      </div>
    );
  },
);

Receipt.displayName = "Receipt";

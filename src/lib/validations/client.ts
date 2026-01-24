import { z } from "zod";
import { isValidCNPJ, isValidCPF } from "./docuemnt-validator";

export const clientSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  type: z.enum(["PF", "PJ"]),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().min(10, "Telefone inválido").optional().or(z.literal("")),

  document: z.string().superRefine((val, ctx) => {
    const cleanVal = val.replace(/\D/g, "");

    if (cleanVal.length === 11) {
      if (!isValidCPF(cleanVal)) {
        ctx.addIssue({
          code: "custom",
          message: "CPF inválido",
        });
      }
      return;
    }

    if (cleanVal.length === 14) {
      if (!isValidCNPJ(cleanVal)) {
        ctx.addIssue({
          code: "custom",
          message: "CNPJ inválido",
        });
      }
      return;
    }

    ctx.addIssue({
      code: "custom",
      message: "Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos",
    });
  }),
});

export type ClientInput = z.infer<typeof clientSchema>;

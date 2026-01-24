export function isValidCPF(cpf: string): boolean {
  if (typeof cpf !== "string") return false;
  cpf = cpf.replace(/[^\d]+/g, "");

  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

  const values = cpf.split("").map((el) => +el);
  const rest = (count: number) =>
    ((values
      .slice(0, count - 12)
      .reduce((s, el, i) => s + el * (count - i), 0) *
      10) %
      11) %
    10;

  return rest(10) === values[9] && rest(11) === values[10];
}

export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;
  cnpj = cnpj.replace(/[^\d]+/g, "");

  if (cnpj.length !== 14) return false;
  if (!!cnpj.match(/(\d)\1{13}/)) return false;

  const validate = (t: number) => {
    let d = 0;
    let m = 2;
    for (let i = t; i >= 0; i--) {
      d += parseInt(cnpj[i]) * m;
      m = m === 9 ? 2 : m + 1;
    }
    const result = d % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const digit0 = validate(11);
  const digit1 = validate(12);

  return digit0 === parseInt(cnpj[12]) && digit1 === parseInt(cnpj[13]);
}

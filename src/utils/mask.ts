export const normalizePhoneNumber = (value: string | undefined) => {
  if (!value) return "";

  const onlyNums = value.replace(/\D/g, "");

  if (onlyNums.length > 11)
    return onlyNums.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");

  return onlyNums
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})\d+?$/, "$1");
};

export const normalizeCpf = (value: string | undefined) => {
  if (!value) return "";

  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

export const normalizeCnpj = (value: string | undefined) => {
  if (!value) return "";

  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

// Utilidades para normalizar telefone brasileiro.
// Convenção do app: telefone é salvo no banco como DDD + número, só dígitos,
// sem o código do país (ex: "51999999999"), igual ao que o cadastro já envia.

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// Aceita telefone com ou sem "55" na frente e devolve sempre DDD+número (10-11 dígitos).
export function normalizePhoneBR(input: string): string {
  let digits = onlyDigits(input);
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

// Formato que a Graph API do WhatsApp espera: código do país + DDD + número, só dígitos.
export function toWhatsappE164(phoneDigitsBR: string): string {
  return `55${normalizePhoneBR(phoneDigitsBR)}`;
}

export function isLikelyPhone(value: string): boolean {
  if (value.includes('@')) return false;
  const digits = onlyDigits(value);
  return digits.length >= 10 && digits.length <= 13;
}

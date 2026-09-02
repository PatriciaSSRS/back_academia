// API mocada de portfólio: nunca envia mensagem de WhatsApp de verdade.
// Qualquer "envio" é só um log no console com o conteúdo que seria mandado —
// não existe integração com nenhum gateway de WhatsApp nem chamada de rede.

export function isWhatsappConfigured(): boolean {
  // Sempre "configurado" pro fluxo de "esqueci minha senha" responder
  // sucesso normalmente, sem depender de nenhuma credencial real.
  return true;
}

export async function sendPasswordResetWhatsapp(telefoneDigitsBR: string, resetLink: string): Promise<void> {
  console.log('💬 [DEMO] WhatsApp que seria enviado:');
  console.log(`   Para: ${telefoneDigitsBR}`);
  console.log(`   Mensagem: Você solicitou a redefinição da sua senha. Acesse: ${resetLink}`);
}

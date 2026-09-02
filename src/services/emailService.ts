// API mocada de portfólio: nunca envia email de verdade. Qualquer "envio" é
// só um log no console com o conteúdo que seria mandado — não existe SDK de
// provedor de email nem chamada de rede aqui.

export function isEmailConfigured(): boolean {
  // Sempre "configurado" pro fluxo de "esqueci minha senha" responder
  // sucesso normalmente, sem depender de nenhuma credencial real.
  return true;
}

export async function sendPasswordResetEmail(to: string, nome: string, resetLink: string): Promise<void> {
  console.log('📧 [DEMO] Email que seria enviado:');
  console.log(`   Para: ${to}`);
  console.log(`   Assunto: Redefinição de senha`);
  console.log(`   Olá, ${nome}! Link de redefinição: ${resetLink}`);
}

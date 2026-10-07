// Força da senha de 0 a 4 pro medidor do cadastro/redefinição. Não substitui a regra do
// backend (mínimo de 6 caracteres) — só orienta a pessoa a escolher algo melhor.
const COMUNS = ['123456', '12345678', 'senha', 'password', 'qwerty', 'abc123', '111111', '000000', 'geldtrack', 'admin']
const NIVEIS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']

export function forcaSenha(senha = '', { nome = '', email = '' } = {}) {
  if (!senha) return { nivel: 0, rotulo: '', dicas: [] }

  const baixa = senha.toLowerCase()
  const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(senha)).length
  const dicas = []
  let pontos = 0

  if (senha.length >= 8) pontos++
  else dicas.push('Use pelo menos 8 caracteres')
  if (senha.length >= 12) pontos++
  if (tipos >= 2) pontos++
  if (tipos >= 3) pontos++
  if (tipos < 3) dicas.push('Misture letras maiúsculas, números e símbolos')

  // Penalidades: senha óbvia, repetição ou que contém o próprio nome/e-mail.
  const pessoais = [nome.split(' ')[0], email.split('@')[0]].map(p => (p || '').toLowerCase()).filter(p => p.length >= 3)
  const obvia = COMUNS.some(c => baixa.includes(c)) || /^(.)\1+$/.test(senha) || /(0123|1234|2345|3456|4567|5678|6789|abcd)/.test(baixa)
  if (obvia) { pontos = Math.min(pontos, 1); dicas.unshift('Evite sequências e senhas comuns') }
  if (pessoais.some(p => baixa.includes(p))) { pontos = Math.min(pontos, 1); dicas.unshift('Não use seu nome ou e-mail') }
  if (senha.length < 6) pontos = 0

  return { nivel: pontos, rotulo: NIVEIS[pontos], dicas: dicas.slice(0, 2) }
}

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'GeldTrack — Redefinição de senha',
    html: `
      <p>Você solicitou a redefinição da sua senha no GeldTrack.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
      <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este e-mail.</p>
    `,
  });
}

async function sendOrcamentoEstouradoEmail(to, { categoria, valorLimite, gasto, mes }) {
  const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const [ano, mesNum] = mes.split('-').map(Number);
  const mesLabel = new Date(ano, mesNum - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `GeldTrack — Orçamento de ${categoria} estourado`,
    html: `
      <p>Seu orçamento de <strong>${categoria}</strong> em ${mesLabel} foi ultrapassado.</p>
      <p>Limite: ${fmtBRL(valorLimite)}<br>Gasto até agora: ${fmtBRL(gasto)}</p>
      <p>Você pode revisar seus orçamentos a qualquer momento no GeldTrack.</p>
    `,
  });
}

// Nome e categorias vêm do usuário — escapados pra não virarem HTML no e-mail.
function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Resumo semanal/mensal (ver utils/enviarResumos.js). Valores já vêm em R$.
async function sendResumoEmail(to, { nome, tipo, periodo, resumo, anterior }) {
  const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const fmtData = (d) => d.split('-').reverse().join('/');
  const [ano, mesNum] = periodo.inicio.split('-').map(Number);
  const periodoLabel = tipo === 'semanal'
    ? `semana de ${fmtData(periodo.inicio)} a ${fmtData(periodo.fim)}`
    : new Date(ano, mesNum - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let comparacao = '';
  if (anterior && anterior.despesas > 0) {
    const variacao = Math.round(((resumo.despesas - anterior.despesas) / anterior.despesas) * 100);
    comparacao = variacao === 0
      ? `<p>Suas despesas ficaram iguais às ${tipo === 'semanal' ? 'da semana anterior' : 'do mês anterior'}.</p>`
      : `<p>Suas despesas ${variacao > 0 ? 'subiram' : 'caíram'} ${Math.abs(variacao)}% em relação ${tipo === 'semanal' ? 'à semana anterior' : 'ao mês anterior'}.</p>`;
  }
  const categorias = resumo.topCategorias.length === 0 ? '' : `
      <p><strong>Onde mais gastou:</strong></p>
      <ol>${resumo.topCategorias.map(c => `<li>${escaparHtml(c.categoria)}: ${fmtBRL(c.total)}</li>`).join('')}</ol>`;
  const link = process.env.FRONTEND_URL ? `<p><a href="${process.env.FRONTEND_URL}/relatorios">Ver relatórios completos no GeldTrack</a></p>` : '';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `GeldTrack — Seu resumo ${tipo === 'semanal' ? 'da semana' : 'do mês'}`,
    html: `
      <p>Olá, ${escaparHtml(nome)}! Aqui está o resumo da ${tipo === 'semanal' ? '' : 'sua carteira em '}${periodoLabel}:</p>
      <p>Receitas: ${fmtBRL(resumo.receitas)}<br>Despesas: ${fmtBRL(resumo.despesas)}<br><strong>Saldo do período: ${fmtBRL(resumo.saldo)}</strong></p>
      ${comparacao}
      ${categorias}
      ${link}
      <p style="color:#888;font-size:12px">Valores em outras moedas convertidos para R$ pela cotação salva. Você pode desligar este e-mail no seu perfil, no GeldTrack.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail, sendOrcamentoEstouradoEmail, sendResumoEmail };

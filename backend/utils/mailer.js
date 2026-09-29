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

module.exports = { sendPasswordResetEmail, sendOrcamentoEstouradoEmail };

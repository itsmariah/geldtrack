import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { fmt, fmtDate } from './format'

const MARGIN = 40

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function formatMonthLabel(month) {
  const [ano, mes] = month.split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}

// Captura um elemento do DOM como imagem, preservando o fundo real dele (em vez de
// forçar branco) — assim o gráfico permanece legível seja qual for o tema ativo.
// JPEG em vez de PNG: o conteúdo rasterizado pelo html2canvas (gradientes, anti-aliasing
// dos gráficos) tem ruído por pixel que o PNG comprime muito mal — um PNG chegava a
// pesar dezenas de MB pra um gráfico pequeno; JPEG com qualidade alta resolve isso.
async function captureElement(el) {
  if (!el) return null
  const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: getComputedBg(el) })
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height }
}

// JPEG não tem canal alfa — precisa de um fundo opaco explícito. Usa a cor de fundo já
// computada do próprio elemento, então o resultado bate com o tema atual da tela.
function getComputedBg(el) {
  const bg = getComputedStyle(el).backgroundColor
  return !bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' ? '#ffffff' : bg
}

// Monta e baixa o PDF do relatório mensal: resumo, gráficos (capturados como imagem a
// partir do que já está renderizado na tela) e a tabela de transações do período.
export async function generateReportPdf({ month, summary, transactions, chartRefs }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  let y = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('GeldTrack', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Relatório mensal — ${formatMonthLabel(month)}`, MARGIN, y + 18)
  doc.setTextColor(0)
  y += 44

  const colWidth = contentWidth / 3
  const cards = [
    { label: 'RECEITAS', value: fmt(summary.receitas), color: [22, 163, 74] },
    { label: 'DESPESAS', value: fmt(summary.despesas), color: [220, 38, 38] },
    { label: 'SALDO', value: fmt(summary.saldo), color: summary.saldo >= 0 ? [22, 163, 74] : [220, 38, 38] },
  ]
  cards.forEach((c, i) => {
    const x = MARGIN + i * colWidth
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(c.label, x, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...c.color)
    doc.text(c.value, x, y + 18)
  })
  doc.setTextColor(0)
  y += 48

  const evolutionImg = await captureElement(chartRefs.evolution?.current)
  if (evolutionImg) {
    const h = (evolutionImg.height / evolutionImg.width) * contentWidth
    doc.addImage(evolutionImg.dataUrl, 'PNG', MARGIN, y, contentWidth, h)
    y += h + 20
  }

  const [despesasImg, receitasImg] = await Promise.all([
    captureElement(chartRefs.despesas?.current),
    captureElement(chartRefs.receitas?.current),
  ])
  if (despesasImg || receitasImg) {
    const halfWidth = (contentWidth - 20) / 2
    let maxH = 0
    if (despesasImg) {
      const h = (despesasImg.height / despesasImg.width) * halfWidth
      doc.addImage(despesasImg.dataUrl, 'PNG', MARGIN, y, halfWidth, h)
      maxH = Math.max(maxH, h)
    }
    if (receitasImg) {
      const h = (receitasImg.height / receitasImg.width) * halfWidth
      doc.addImage(receitasImg.dataUrl, 'PNG', MARGIN + halfWidth + 20, y, halfWidth, h)
      maxH = Math.max(maxH, h)
    }
    y += maxH + 25
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
    body: transactions.map(t => [
      fmtDate(t.data),
      t.tipo === 'receita' ? 'Receita' : 'Despesa',
      t.categoria,
      t.descricao || '-',
      `${t.tipo === 'receita' ? '+' : '-'} ${fmt(t.valor)}`,
    ]),
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 4: { halign: 'right' } },
  })

  doc.save(`geldtrack-relatorio-${month}.pdf`)
}

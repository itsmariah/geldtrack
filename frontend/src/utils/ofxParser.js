import { guessCategory } from './categoriaInteligente'

function parseOFXDate(raw) {
  if (!raw) return null
  const str = raw.trim().split('[')[0] // remove timezone like [-3:BRT]
  const year  = str.slice(0, 4)
  const month = str.slice(4, 6)
  const day   = str.slice(6, 8)
  if (!year || !month || !day || year.length < 4) return null
  return `${year}-${month}-${day}`
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([^<\\r\\n]+)`, 'i'))
  return m ? m[1].trim() : null
}

export async function readOFXFile(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  // Detect encoding: XML OFX usually starts with <?xml or <OFX>
  const sniff = new TextDecoder('ascii', { fatal: false }).decode(bytes.slice(0, 20))
  if (sniff.trimStart().startsWith('<?xml') || sniff.trimStart().startsWith('<OFX>')) {
    return new TextDecoder('utf-8').decode(bytes)
  }
  // Brazilian SGML OFX files commonly use windows-1252
  return new TextDecoder('windows-1252').decode(bytes)
}

export function parseOFX(content) {
  // Both SGML and XML OFX use </STMTTRN> closing tags for the aggregate element
  const blocks = [...content.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)].map(m => m[1])

  if (blocks.length === 0) {
    throw new Error('Nenhuma transação encontrada no arquivo. Verifique se é um arquivo OFX válido.')
  }

  const transactions = []
  let idx = 0

  for (const block of blocks) {
    const trnamt   = extractTag(block, 'TRNAMT')
    const dtposted = extractTag(block, 'DTPOSTED')
    const fitid    = extractTag(block, 'FITID')
    const memo     = extractTag(block, 'MEMO') || extractTag(block, 'NAME') || ''

    if (!trnamt || !dtposted) continue

    const amount = parseFloat((trnamt).replace(',', '.'))
    const date   = parseOFXDate(dtposted)

    if (!date || isNaN(amount) || amount === 0) continue

    const tipo = amount > 0 ? 'receita' : 'despesa'

    transactions.push({
      _key: fitid || `ofx-${idx++}`,
      tipo,
      valor: Math.abs(amount),
      data: date,
      descricao: memo,
      categoria: guessCategory(memo, tipo),
      selected: true,
    })
  }

  if (transactions.length === 0) {
    throw new Error('Nenhuma transação válida encontrada. Os valores podem estar zerados ou o formato é incompatível.')
  }

  return transactions
}

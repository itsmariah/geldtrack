// Ponto e vírgula como delimitador e vírgula decimal — é o que o Excel em pt-BR espera
// por padrão; com vírgula como delimitador o valor decimal ficaria ambíguo.
const DELIMITER = ';';
const BOM = '﻿'; // força o Excel no Windows a ler o arquivo como UTF-8 (senão acentos quebram)

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (str.includes(DELIMITER) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatValorBR(valor) {
  return Number(valor).toFixed(2).replace('.', ',');
}

// Câmbio com vírgula decimal e sem zeros à direita (5,181 em vez de 5,181000).
function formatTaxaBR(taxa) {
  return String(Number(taxa)).replace('.', ',');
}

// Gera o CSV completo (com BOM UTF-8, para o Excel no Windows não corromper acentos).
// A coluna Moeda existe porque, com contas em moedas diferentes, um Valor sozinho fica
// ambíguo — sem ela não dá pra saber se "100,00" é R$ ou US$. As quatro últimas só são
// preenchidas em transações convertidas de outra moeda (ex: parte de uma despesa de grupo
// em US$ lançada numa conta em R$) — "Data da cotação" diz "câmbio informado" quando o
// usuário digitou a taxa em vez de usar a cotação salva.
function buildTransactionsCsv(transactions) {
  const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Moeda', 'Valor original', 'Moeda original', 'Câmbio', 'Data da cotação'];
  const rows = transactions.map(t => {
    const convertida = Boolean(t.moedaOriginal);
    return [
      t.data,
      t.tipo === 'receita' ? 'Receita' : 'Despesa',
      t.categoria,
      t.descricao || '',
      formatValorBR(t.valor),
      t.conta?.moeda || 'BRL',
      convertida ? formatValorBR(t.valorOriginal) : '',
      convertida ? t.moedaOriginal : '',
      convertida ? formatTaxaBR(t.taxaConversao) : '',
      convertida ? (t.dataCotacao || 'câmbio informado') : '',
    ];
  });
  const lines = [header, ...rows].map(cols => cols.map(escapeCsvField).join(DELIMITER));
  return BOM + lines.join('\r\n') + '\r\n';
}

module.exports = { buildTransactionsCsv, escapeCsvField, formatValorBR };

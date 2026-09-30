-- AlterTable
ALTER TABLE "DespesaGrupo" ADD COLUMN     "moeda" TEXT NOT NULL DEFAULT 'BRL';

-- AlterTable
ALTER TABLE "PagamentoGrupo" ADD COLUMN     "moeda" TEXT NOT NULL DEFAULT 'BRL';

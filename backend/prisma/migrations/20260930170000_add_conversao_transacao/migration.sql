-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN     "dataCotacao" TEXT,
ADD COLUMN     "moedaOriginal" TEXT,
ADD COLUMN     "taxaConversao" DECIMAL(12,6),
ADD COLUMN     "valorOriginal" DECIMAL(12,2);

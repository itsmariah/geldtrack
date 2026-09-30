-- AlterTable
ALTER TABLE "Conta" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "GrupoMembro" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Meta" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Orcamento" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Recorrencia" ADD COLUMN     "ordem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN     "pagamentoGrupoId" INTEGER;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "resumoMensal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resumoSemanal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ultimoResumoMensal" TEXT,
ADD COLUMN     "ultimoResumoSemanal" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_pagamentoGrupoId_usuarioId_key" ON "Transacao"("pagamentoGrupoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_pagamentoGrupoId_fkey" FOREIGN KEY ("pagamentoGrupoId") REFERENCES "PagamentoGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;


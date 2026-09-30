-- AlterTable
ALTER TABLE "Transacao" ADD COLUMN     "despesaGrupoId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Transacao_despesaGrupoId_usuarioId_key" ON "Transacao"("despesaGrupoId", "usuarioId");

-- AddForeignKey
ALTER TABLE "Transacao" ADD CONSTRAINT "Transacao_despesaGrupoId_fkey" FOREIGN KEY ("despesaGrupoId") REFERENCES "DespesaGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

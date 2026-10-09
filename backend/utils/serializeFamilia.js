function serializeFamilia(familia) {
  return {
    id: familia.id,
    nome: familia.nome,
    foto: familia.foto ?? null,
    codigo: familia.codigo,
    membros: familia.membros.map(m => ({ id: m.id, nome: m.nome, email: m.email, foto: m.foto ?? null, papel: m.papelFamilia })),
  };
}

module.exports = { serializeFamilia };

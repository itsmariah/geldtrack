import { useState } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import Navbar from '../components/Navbar'
import CategoriaModal from '../components/CategoriaModal'
import CategoriaChip from '../components/CategoriaChip'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { Plus } from 'lucide-react'

export default function Categorias() {
  const { categorias, loading, refetch } = useCategorias()
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [novoTipo, setNovoTipo] = useState('despesa')
  const [deleteCategoria, setDeleteCategoria] = useState(null)

  const handleEdit = (categoria) => {
    setEditing(categoria)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSaved = () => {
    setToast(editing ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.')
    handleModalClose()
    refetch()
  }

  const confirmDelete = async () => {
    const categoria = deleteCategoria
    setDeleteCategoria(null)
    try {
      await api.delete(`/categorias/${categoria.id}`)
      setToast('Categoria excluída.')
      refetch()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir a categoria. Tente novamente.')
    }
  }

  const receitas = categorias.filter(c => c.tipo === 'receita')
  const despesas = categorias.filter(c => c.tipo === 'despesa')

  const abrirNovaCategoria = (tipo) => {
    setNovoTipo(tipo)
    setShowModal(true)
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-header">
          <h2>Categorias</h2>
          <button className="btn btn-primary" onClick={() => abrirNovaCategoria('despesa')}>
            + Nova categoria
          </button>
        </div>

        {error && (
          <Alert type="error" className="alert-with-action">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={refetch}>Tentar novamente</button>
          </Alert>
        )}

        {loading ? (
          <SkeletonList rows={4} />
        ) : (
          <>
            <div className="transactions-section" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3>↓ Despesas</h3>
                <button className="btn btn-outline btn-sm" onClick={() => abrirNovaCategoria('despesa')}><Plus size={16} /> Adicionar</button>
              </div>
              {despesas.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma categoria de despesa ainda.</p>
              ) : (
                <div className="categoria-grid">
                  {despesas.map(c => (
                    <CategoriaChip key={c.id} categoria={c} onEdit={handleEdit} onDelete={setDeleteCategoria} />
                  ))}
                </div>
              )}
            </div>

            <div className="transactions-section">
              <div className="section-header">
                <h3>↑ Receitas</h3>
                <button className="btn btn-outline btn-sm" onClick={() => abrirNovaCategoria('receita')}><Plus size={16} /> Adicionar</button>
              </div>
              {receitas.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma categoria de receita ainda.</p>
              ) : (
                <div className="categoria-grid">
                  {receitas.map(c => (
                    <CategoriaChip key={c.id} categoria={c} onEdit={handleEdit} onDelete={setDeleteCategoria} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {showModal && (
        <CategoriaModal
          categoria={editing}
          tipoPadrao={novoTipo}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {deleteCategoria && (
        <ConfirmDialog
          title="Excluir categoria"
          message={`Tem certeza que deseja excluir "${deleteCategoria.nome}"? Transações que já usam esse nome continuam existindo, só deixam de ter ícone e cor personalizados.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteCategoria(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

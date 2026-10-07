import { useState, useEffect } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { Download, X } from 'lucide-react'

export default function AnexoViewer({ transactionId, onClose }) {
  const [anexo, setAnexo] = useState(null)
  const [anexoNome, setAnexoNome] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.get(`/transactions/${transactionId}/anexo`)
      .then(({ data }) => {
        if (!active) return
        setAnexo(data.anexo)
        setAnexoNome(data.anexoNome || 'comprovante')
      })
      .catch(() => { if (active) setError('Não foi possível carregar o anexo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [transactionId])

  const isPdf = anexo?.startsWith('data:application/pdf')

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-header">
        <h3>Comprovante</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : anexo && (
        <>
          <div className="anexo-preview">
            {isPdf ? (
              <iframe src={anexo} title={anexoNome} className="anexo-preview-pdf" />
            ) : (
              <img src={anexo} alt={anexoNome} className="anexo-preview-img" />
            )}
          </div>
          <div className="modal-footer">
            <a className="btn btn-outline" href={anexo} download={anexoNome}><Download size={16} /> Baixar</a>
            <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
          </div>
        </>
      )}
    </Modal>
  )
}

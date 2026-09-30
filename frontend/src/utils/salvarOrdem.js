import api from '../services/api'

// Depois de um arraste: mostra a nova ordem na hora e salva no backend (PUT <url> com a
// lista inteira de ids). Se falhar, avisa e recarrega a lista do servidor, desfazendo a
// mudança da tela — mesmo padrão da reordenação de transações no Dashboard.
export async function salvarOrdem(url, novaLista, { setLista, recarregar, setError }) {
  setLista(novaLista)
  try {
    await api.put(url, { ids: novaLista.map(item => item.id) })
  } catch (err) {
    console.error(err)
    setError(err.response?.data?.error || 'Não foi possível salvar a nova ordem. Tente novamente.')
    recarregar()
  }
}

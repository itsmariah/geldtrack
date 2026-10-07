// Tela de espera enquanto o chunk de uma página (ou a sessão) carrega. O atraso no CSS
// evita um "piscar" do loader quando o carregamento é praticamente instantâneo.
export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="page-loader-coin" aria-hidden="true">💰</span>
      <span className="sr-only">Carregando...</span>
    </div>
  )
}

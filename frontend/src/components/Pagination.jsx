import { pageItems } from '../utils/pageItems'

export default function Pagination({ page, totalPages, total, itemLabel = 'item(ns)', onChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Paginação">
      <div className="pagination-pages">
        <button
          type="button"
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Página anterior"
        >
          ‹
        </button>
        {pageItems(page, totalPages).map((p, i) => (
          p === '…' ? (
            <span key={`gap-${i}`} className="pagination-gap" aria-hidden="true">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination-btn${p === page ? ' pagination-btn--active' : ''}`}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
            >
              {p}
            </button>
          )
        ))}
        <button
          type="button"
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Próxima página"
        >
          ›
        </button>
      </div>
      {total !== undefined && <span className="pagination-info">{total} {itemLabel}</span>}
    </nav>
  )
}

// Ilustração dos estados vazios: ícone grande sobre um halo em gradiente, flutuando de
// leve, com "faíscas" ao redor. Só CSS (ver .empty-illustration) — sem imagens.
export default function EmptyIllustration({ icon: Icon }) {
  return (
    <div className="empty-illustration" aria-hidden="true">
      <span className="empty-illustration-halo" />
      <span className="empty-illustration-spark empty-illustration-spark--1" />
      <span className="empty-illustration-spark empty-illustration-spark--2" />
      <span className="empty-illustration-spark empty-illustration-spark--3" />
      <span className="empty-illustration-badge">
        <Icon size={34} strokeWidth={1.75} />
      </span>
    </div>
  )
}

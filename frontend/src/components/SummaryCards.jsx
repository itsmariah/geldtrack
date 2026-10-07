import { fmt } from '../utils/format'
import AnimatedMoney from './AnimatedMoney'
import Sparkline from './Sparkline'

// serie (opcional): { receitas, despesas, saldo } dos últimos 6 meses — ver utils/serieMensal.
export default function SummaryCards({ balance, serie }) {
  // Com contas em mais de uma moeda, o total é uma conversão aproximada — o "≈" e o
  // detalhamento por moeda deixam isso explícito em vez de esconder atrás de um número só.
  const multiMoeda = balance.porMoeda?.length > 1
  const aprox = multiMoeda ? '≈ ' : ''

  return (
    <div className="summary-cards">
      <div className="card card-balance">
        <div className="card-label">Saldo Atual</div>
        <div className={`card-value ${balance.saldo >= 0 ? 'positive' : 'negative'}`}>
          {aprox}<AnimatedMoney value={balance.saldo} />
        </div>
        <Sparkline data={serie?.saldo} color="var(--primary-light)" label="Resultado mensal dos últimos 6 meses" />
      </div>
      <div className="card card-income">
        <div className="card-label">Total Receitas</div>
        <div className="card-value positive">{aprox}<AnimatedMoney value={balance.receitas} /></div>
        <Sparkline data={serie?.receitas} color="var(--green)" label="Receitas dos últimos 6 meses" />
      </div>
      <div className="card card-expense">
        <div className="card-label">Total Despesas</div>
        <div className="card-value negative">{aprox}<AnimatedMoney value={balance.despesas} /></div>
        <Sparkline data={serie?.despesas} color="var(--red)" label="Despesas dos últimos 6 meses" />
      </div>
      {multiMoeda && (
        <div className="card card-por-moeda">
          <div className="card-label">Detalhamento por moeda</div>
          {balance.porMoeda.map(pm => (
            <div key={pm.moeda} className="por-moeda-linha">
              <strong>{pm.moeda}</strong>
              <span className="positive"><span className="money">{fmt(pm.receitas, pm.moeda)}</span></span>
              <span className="negative"><span className="money">{fmt(pm.despesas, pm.moeda)}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

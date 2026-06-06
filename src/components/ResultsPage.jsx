import React from 'react'

function RaceCard({ race }) {
  const { label, candidates, blankVotes, nullVotes, validVotes, totalVotes } = race

  const maxVotes = candidates[0]?.votes ?? 0
  const isTied = maxVotes > 0 && candidates.filter((c) => c.votes === maxVotes).length > 1

  return (
    <div className="results-race-card">
      <div className="results-race-header">
        <h2 className="results-race-title">{label}</h2>
        <span className="results-race-total">{totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}</span>
      </div>

      <div className="results-candidate-list">
        {candidates.length === 0 ? (
          <p className="results-no-candidates">Nenhum voto registrado ainda.</p>
        ) : (
          candidates.map((cand, idx) => {
            const pct = totalVotes > 0 ? (cand.votes / totalVotes) * 100 : 0
            const isLeader = !isTied && idx === 0 && cand.votes > 0
            const isTiedLeader = isTied && cand.votes === maxVotes

            let rowClass = 'results-candidate-row'
            if (isLeader) rowClass += ' leader'
            if (isTiedLeader) rowClass += ' tied'

            return (
              <div key={cand.num} className={rowClass}>
                <div className={`results-candidate-rank${isTiedLeader ? ' tied' : ''}`}>
                  {isTiedLeader ? '=' : idx + 1}
                </div>
                <div className="results-candidate-info">
                  <div className="results-candidate-name">
                    <strong>{cand.num}</strong>
                    <span>{cand.name}</span>
                    <span className="results-candidate-party">{cand.party}</span>
                  </div>
                  <div className="results-bar-track">
                    <div
                      className={`results-bar-fill${isLeader ? ' leader' : ''}${isTiedLeader ? ' tied' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="results-candidate-votes">
                  <strong>{cand.votes}</strong>
                  <span>{pct.toFixed(1)}%</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="results-race-footer">
        <span>Válidos: <strong>{validVotes}</strong></span>
        <span>Brancos: <strong>{blankVotes}</strong></span>
        <span>Nulos: <strong>{nullVotes}</strong></span>
        {isTied && <span className="results-tie-badge">Empate na liderança</span>}
      </div>
    </div>
  )
}

function ResultsPage({ raceCards, loading, error, lastUpdated, hasData }) {
  return (
    <section className="results-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Apuração</h1>
          <p className="page-sub">Atualização automática a cada 15 segundos.</p>
        </div>
        {lastUpdated && (
          <span className="results-last-updated">
            Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')}
            {loading && <span className="results-refreshing"> · atualizando...</span>}
          </span>
        )}
        {!lastUpdated && loading && (
          <span className="results-refreshing">Carregando...</span>
        )}
      </div>

      {error && <div className="status-message error">{error}</div>}

      {!hasData && !loading && (
        <div className="empty-state">
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--fg-default)' }}>
            Nenhuma apuração disponível.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Cadastre uma eleição com candidatos para visualizar os resultados aqui.
          </p>
        </div>
      )}

      {hasData && (
        <div className="results-race-grid">
          {raceCards.map((race) => (
            <RaceCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </section>
  )
}

export default ResultsPage

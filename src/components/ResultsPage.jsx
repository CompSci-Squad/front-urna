import React from 'react'

function ResultsPage({
  races,
  resultsRaceIdx,
  setResultsRaceIdx,
  resultRace,
  sortedResults,
  backendLoading,
  backendError,
  totalResultVotes,
  resultValidVotes,
  resultVotes,
  hasData
}) {
  return (
    <section className="results-page">
      <div className="page-head">
        <h1 className="page-title">Apuração</h1>
        <p className="page-sub">Resultados em tempo real — atualizado automaticamente.</p>
      </div>
      {backendLoading && <div className="status-message">Carregando resultados do backend...</div>}
      {backendError && <div className="status-message error">{backendError}</div>}
      {!hasData && !backendLoading && (
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--fg-default)' }}>
            Nenhuma apuração disponível.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Cadastre uma eleição com candidatos para visualizar os resultados aqui.
          </p>
        </div>
      )}
      {hasData && (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <span className="kpi-label">Cargo</span>
              <strong>{resultRace.label}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Total de votos</span>
              <strong>{totalResultVotes.toLocaleString('pt-BR')}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Votos válidos</span>
              <strong>{resultValidVotes.toLocaleString('pt-BR')}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Brancos</span>
              <strong>{(resultVotes.BRANCO || 0).toLocaleString('pt-BR')}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Nulos</span>
              <strong>{(resultVotes.NULO || 0).toLocaleString('pt-BR')}</strong>
            </article>
          </div>

          <div className="results-grid">
            <div className="stats-card">
              <div className="stats-header">
                <h2>Distribuição de votos</h2>
                <div className="race-switch">
                  {races.map((race, index) => (
                    <button
                      key={race.id}
                      className={resultsRaceIdx === index ? 'tab active' : 'tab'}
                      onClick={() => setResultsRaceIdx(index)}>
                      {race.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bar-list">
                {sortedResults.map((item) => {
                  const percent = totalResultVotes ? (item.votes / totalResultVotes) * 100 : 0
                  return (
                    <div key={item.num} className="bar-row">
                      <div className="bar-meta">
                        <span>{item.num}</span>
                        <strong>{item.name}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="bar-value">{item.votes}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="stats-card">
              <h2>Resumo</h2>
              <div className="donut-legend">
                <div className="legend-row">
                  <span>Brancos</span>
                  <strong>{(resultVotes.BRANCO || 0).toLocaleString('pt-BR')}</strong>
                </div>
                <div className="legend-row">
                  <span>Nulos</span>
                  <strong>{(resultVotes.NULO || 0).toLocaleString('pt-BR')}</strong>
                </div>
                <div className="legend-row">
                  <span>Válidos</span>
                  <strong>{resultValidVotes.toLocaleString('pt-BR')}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default ResultsPage

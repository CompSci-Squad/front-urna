import React from 'react'

function VotePage({
  races,
  raceIdx,
  currentRace,
  filteredCandidates,
  searchTerm,
  setSearchTerm,
  openConfirmModal,
  castSpecialVote
}) {
  return (
    <section className="vote-page">
      <div className="vote-sticky">
        <div className="page-head">
          <div>
            <div className="race-step">
              {races.map((race, index) => (
                <span
                  key={race.id}
                  className={`step-chip ${index === raceIdx ? 'now' : index < raceIdx ? 'done' : 'next'}`}>
                  {index < raceIdx ? '✓' : index + 1}
                  <span>{race.label}</span>
                </span>
              ))}
            </div>
            <h1 className="page-title">
              SEU VOTO PARA <em>{currentRace.label}</em>
            </h1>
            <p className="page-sub">Toque em um candidato ou digite o número correspondente. Confirme com Enter.</p>
          </div>
          <div className="quick-actions">
            <button type="button" className="urna-key k-branco" onClick={() => castSpecialVote('BRANCO')}>
              BRANCO
            </button>
            <button type="button" className="urna-key k-corrige" onClick={() => castSpecialVote('NULO')}>
              NULO
            </button>
          </div>
        </div>
        <div className="search-row">
          <button type="button" className="search-icon" aria-label="Pesquisar candidato">
            🔍
          </button>
          <input
            className="search-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value.replace(/\D/g, ''))}
            placeholder="Pesquisar número do candidato"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="candidate-list">
        {filteredCandidates.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum candidato encontrado</strong>
            <p>Verifique o número digitado ou vote em BRANCO / NULO.</p>
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <button
              key={candidate.num}
              className="candidate"
              onClick={() => openConfirmModal(candidate)}>
              <div className="cand-photo">{candidate.photo ? <img src={candidate.photo} alt={candidate.name} /> : '👤'}</div>
              <div className="cand-body">
                <div className="cand-name">{candidate.name}</div>
                <div className="cand-meta">
                  <span className="party">{candidate.party}</span>
                  <span className="role">{currentRace.label}</span>
                </div>
              </div>
              <div className="cand-number">{candidate.num}</div>
            </button>
          ))
        )}
      </div>
    </section>
  )
}

export default VotePage

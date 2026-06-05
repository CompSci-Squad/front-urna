import React from 'react'

const GROUP_ICONS = {
  'Eleição': '🗳️',
  'Corridas': '🏛️',
  'Votantes': '👥',
  'Auditoria': '🔍',
  'Recibo': '📄'
}

function AdminPanel({
  races,
  displayCandidates,
  adminFormVisible,
  setAdminFormVisible,
  candidateForm,
  setCandidateForm,
  handleAddCandidate,
  handleDeleteCandidate,
  actionGroups
}) {
  return (
    <section className="admin-page">
      <div className="page-head">
        <h1 className="page-title">Painel administrativo</h1>
        <p className="page-sub">Gerenciamento de candidatos e urnas.</p>
      </div>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          {(actionGroups || []).map((group) => (
            <div key={group.label} className="sidebar-group">
              <div className="sidebar-group-title">
                <span className="sidebar-group-icon">{GROUP_ICONS[group.label] ?? '⚙️'}</span>
                {group.label}
              </div>
              {group.actions.map((action) => (
                <button
                  key={action.label}
                  className="sidebar-action-btn"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div className="admin-main">
      <div className="admin-grid">
        <div className="stats-card admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Candidatos cadastrados</h2>
              <p className="admin-subtitle">Veja todos os candidatos por cargo e gerencie rapidamente.</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setAdminFormVisible(true)}
              disabled={!races || races.length === 0}
              title={!races || races.length === 0 ? 'Crie uma corrida antes de adicionar candidatos' : undefined}
            >
              + Adicionar candidato
            </button>
          </div>

          {(() => {
            const hasCandidates = (displayCandidates && displayCandidates.length > 0) ||
              (races && Array.isArray(races) && races.some((r) => r.candidates?.length > 0))

            if (!hasCandidates) {
              return (
                <div className="empty-state">
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🗳️</div>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--fg-default)' }}>
                    Nenhum candidato cadastrado ainda.
                  </p>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Use a sidebar para criar uma eleição e adicionar corridas primeiro.
                  </p>
                </div>
              )
            }

            return (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Nome</th>
                      <th>Partido</th>
                      <th>Cargo</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCandidates && displayCandidates.length > 0
                      ? displayCandidates.map((cand) => (
                          <tr key={`${cand.raceId}-${cand.number ?? cand.num}`}>
                            <td>{cand.number ?? cand.num}</td>
                            <td>{cand.name}</td>
                            <td>{cand.party}</td>
                            <td>{cand.raceName}</td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDeleteCandidate(cand.raceId, cand.number ?? cand.num)}>
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))
                      : races.flatMap((race) =>
                          race.candidates && Array.isArray(race.candidates)
                            ? race.candidates.map((cand) => (
                                <tr key={`${race.id}-${cand.num}`}>
                                  <td>{cand.num}</td>
                                  <td>{cand.name}</td>
                                  <td>{cand.party}</td>
                                  <td>{race.label}</td>
                                  <td>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      onClick={() => handleDeleteCandidate(race.id, cand.num)}>
                                      Remover
                                    </button>
                                  </td>
                                </tr>
                              ))
                            : []
                        )}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      </div>

        {adminFormVisible && (
          <div className="modal-backdrop" onClick={() => setAdminFormVisible(false)}>
            <form className="modal admin-form-new" onClick={(event) => event.stopPropagation()} onSubmit={handleAddCandidate}>
              <div className="form-header">
                <h2>Adicionar Candidato</h2>
                <p className="form-subtitle">Preencha os dados abaixo para cadastrar um novo candidato</p>
              </div>

              <div className="form-grid">
                <div className="form-group form-group-full">
                  <label htmlFor="cargo" className="form-label">
                    <span className="label-icon">📋</span>
                    Cargo
                  </label>
                  <select
                    id="cargo"
                    value={candidateForm.race}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, race: event.target.value }))}
                    className="form-select"
                    required>
                    <option value="">-- Selecione um cargo --</option>
                    {races && Array.isArray(races) && races.length > 0 && races.map((race) => (
                      <option key={race.id} value={race.id}>
                        {race.label || race.name || String(race.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="numero" className="form-label">
                    <span className="label-icon">🔢</span>
                    Número
                  </label>
                  <input
                    id="numero"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 1001"
                    value={candidateForm.num}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, num: event.target.value.replace(/\D/g, '') }))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="partido" className="form-label">
                    <span className="label-icon">🏛️</span>
                    Partido
                  </label>
                  <input
                    id="partido"
                    type="text"
                    placeholder="Ex: PD"
                    value={candidateForm.party}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, party: event.target.value }))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="nome" className="form-label">
                    <span className="label-icon">👤</span>
                    Nome Completo
                  </label>
                  <input
                    id="nome"
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={candidateForm.name}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group form-group-full">
                  <label htmlFor="foto" className="form-label">
                    <span className="label-icon">📸</span>
                    URL da Foto (opcional)
                  </label>
                  <input
                    id="foto"
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={candidateForm.photo}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, photo: event.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAdminFormVisible(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-lg">
                  Salvar Candidato
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </div>
    </section>
  )
}

export default AdminPanel

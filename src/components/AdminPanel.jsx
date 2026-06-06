import React from 'react'
import { Vote, LayoutList, Users, Search, FileText, Settings, UserCircle } from 'lucide-react'

const GROUP_ICONS = {
  'Eleição': <Vote size={16} />,
  'Corridas': <LayoutList size={16} />,
  'Votantes': <Users size={16} />,
  'Auditoria': <Search size={16} />,
  'Recibo': <FileText size={16} />
}

const STATE_LABELS = {
  OPEN: 'Aberta',
  PENDING: 'Pendente',
  FINISHED: 'Encerrada'
}

const STATE_CLASSES = {
  OPEN: 'state-open',
  PENDING: 'state-pending',
  FINISHED: 'state-finished'
}

const NUMERIC_STATE_MAP = { 0: 'PENDING', 1: 'OPEN', 2: 'FINISHED' }

function getElectionState(electionDetails) {
  if (!electionDetails) return null
  const raw = electionDetails.state ?? electionDetails.status ?? electionDetails.currentState ?? electionDetails.electionState ?? null
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
    return NUMERIC_STATE_MAP[Number(raw)] ?? null
  }
  return String(raw).toUpperCase()
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
  actionGroups,
  electionDetails,
  electionAddress,
  backendRaces,
  backendCandidates
}) {
  const electionState = getElectionState(electionDetails)
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
                <span className="sidebar-group-icon">{GROUP_ICONS[group.label] ?? <Settings size={16} />}</span>
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

          <div className="admin-overview">
            {!electionAddress ? (
              <div className="election-card election-card--empty">
                <Vote size={32} color="var(--fg-muted)" />
                <p style={{ margin: '8px 0 0', color: 'var(--fg-muted)', fontSize: 14 }}>
                  Nenhuma eleição selecionada. Crie uma eleição pela sidebar.
                </p>
              </div>
            ) : (
              <>
                <div className="election-card">
                  <div className="election-card-header">
                    <div>
                      <div className="election-card-name">
                        {electionDetails?.name ?? 'Eleição'}
                      </div>
                      <div className="election-card-addr">
                        {electionAddress?.slice(0, 10)}...{electionAddress?.slice(-8)}
                      </div>
                    </div>
                    <span className={`election-state-badge ${STATE_CLASSES[electionState] ?? 'state-pending'}`}>
                      {STATE_LABELS[electionState] ?? electionState ?? 'Pendente'}
                    </span>
                  </div>
                </div>

                {backendRaces && backendRaces.length > 0 && (
                  <div className="race-cards">
                    {backendRaces.map((race) => {
                      const count = (backendCandidates || []).filter((c) => c.raceId === race.id).length
                      return (
                        <div key={race.id} className="race-card">
                          <span className="race-card-icon"><LayoutList size={16} /></span>
                          <div className="race-card-name">{race.label || race.name}</div>
                          <div className="race-card-count">
                            {count} {count === 1 ? 'candidato' : 'candidatos'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {backendRaces && backendRaces.length === 0 && (
                  <div className="race-cards-empty">
                    Nenhuma corrida cadastrada ainda. Use a sidebar para criar corridas.
                  </div>
                )}
              </>
            )}
          </div>

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
                  <div style={{ marginBottom: 12, color: 'var(--fg-muted)' }}><Vote size={40} /></div>
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
            <form className="candidate-form-modal" onClick={(event) => event.stopPropagation()} onSubmit={handleAddCandidate}>
              <div className="modal-head">
                <h2 className="modal-title">Adicionar candidato</h2>
              </div>

              <div className="candidate-form-body">
                <div className="candidate-form-section">
                  <label className="candidate-field-label" htmlFor="nome">Nome completo</label>
                  <input
                    id="nome"
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={candidateForm.name}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="candidate-field-input"
                    required
                  />
                </div>

                <div className="candidate-form-section">
                  <label className="candidate-field-label" htmlFor="cargo">Cargo</label>
                  <select
                    id="cargo"
                    value={candidateForm.race}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, race: event.target.value }))}
                    className="candidate-field-input"
                    required>
                    <option value="">Selecione um cargo</option>
                    {races && Array.isArray(races) && races.length > 0 && races.map((race) => (
                      <option key={race.id} value={race.id}>
                        {race.label || race.name || String(race.id)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="candidate-form-row">
                  <div className="candidate-form-section">
                    <label className="candidate-field-label" htmlFor="numero">Número</label>
                    <input
                      id="numero"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 42"
                      value={candidateForm.num}
                      onChange={(event) => setCandidateForm((prev) => ({ ...prev, num: event.target.value.replace(/\D/g, '') }))}
                      className="candidate-field-input"
                      required
                    />
                  </div>

                  <div className="candidate-form-section">
                    <label className="candidate-field-label" htmlFor="partido">Partido / Sigla</label>
                    <input
                      id="partido"
                      type="text"
                      placeholder="Ex: PD"
                      value={candidateForm.party}
                      onChange={(event) => setCandidateForm((prev) => ({ ...prev, party: event.target.value }))}
                      className="candidate-field-input"
                      required
                    />
                  </div>
                </div>

                <div className="candidate-form-section">
                  <label className="candidate-field-label" htmlFor="foto">
                    Foto
                    <span className="candidate-field-optional">opcional</span>
                  </label>
                  <input
                    id="foto"
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={candidateForm.photo}
                    onChange={(event) => setCandidateForm((prev) => ({ ...prev, photo: event.target.value }))}
                    className="candidate-field-input"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAdminFormVisible(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar candidato</button>
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

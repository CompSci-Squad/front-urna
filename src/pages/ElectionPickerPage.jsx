import { useEffect, useState } from 'react'
import { Vote, ChevronRight, Users, LayoutList, CheckCircle2, FileText, ShieldCheck, ScrollText, Download, Receipt } from 'lucide-react'
import { listElections, getElection, getVoterProof, getZeresima, getRdv, getBuPdf, getVoteReceiptPdf } from '../services/apiService'
import { computeCommitment, normalizeCpf } from '../utils/zk'

const STATE_LABELS = { OPEN: 'Aberta', PENDING: 'Pendente', FINISHED: 'Encerrada' }
const STATE_CLASSES = { OPEN: 'state-open', PENDING: 'state-pending', FINISHED: 'state-finished' }
const NUMERIC_STATE_MAP = { 0: 'PENDING', 1: 'OPEN', 2: 'FINISHED' }

function getElectionState(details) {
  if (!details) return null
  const raw = details.state ?? details.status ?? details.currentState ?? details.electionState ?? null
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
    return NUMERIC_STATE_MAP[Number(raw)] ?? null
  }
  return String(raw).toUpperCase()
}

function ElectionPickerPage({ userCpf, onSelectElection }) {
  const [loading, setLoading] = useState(true)
  const [elections, setElections] = useState([])
  const [error, setError] = useState(null)
  const [zeresimaModalOpen, setZeresimaModalOpen] = useState(false)
  const [zeresimaData, setZeresimaData] = useState(null)
  const [zeresimaLoading, setZeresimaLoading] = useState(false)
  const [zeresimaError, setZeresimaError] = useState(null)
  const [zeresimaElectionName, setZeresimaElectionName] = useState('')
  const [zeresimaCandidates, setZeresimaCandidates] = useState([])
  const [rdvModalOpen, setRdvModalOpen] = useState(false)
  const [rdvData, setRdvData] = useState(null)
  const [rdvLoading, setRdvLoading] = useState(false)
  const [rdvError, setRdvError] = useState(null)
  const [rdvElectionName, setRdvElectionName] = useState('')
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [receiptElection, setReceiptElection] = useState(null)
  const [receiptNullifier, setReceiptNullifier] = useState('')
  const [receiptLoading, setReceiptLoading] = useState(false)
  const [receiptError, setReceiptError] = useState(null)

  function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    async function loadEligibleElections() {
      setLoading(true)
      setError(null)
      try {
        const allElections = await listElections()
        const normalizedCpf = normalizeCpf(userCpf)
        const commitment = await computeCommitment(normalizedCpf)

        const results = await Promise.allSettled(
          allElections.map(async (election) => {
            try {
              const proof = await getVoterProof(election.address, commitment)
              if (!proof?.included) return null
              const details = await getElection(election.address)
              const hasVoted = sessionStorage.getItem(`voted_${userCpf}_${election.address}`) === '1'
              return { election, details, hasVoted }
            } catch {
              return null
            }
          })
        )

        const eligible = results
          .filter((r) => r.status === 'fulfilled' && r.value !== null)
          .map((r) => r.value)

        setElections(eligible)
      } catch (err) {
        setError('Não foi possível carregar as eleições. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }

    loadEligibleElections()
  }, [userCpf])

  if (loading) {
    return (
      <section className="election-picker-page">
        <div className="page-head">
          <h1 className="page-title">Suas eleições</h1>
          <p className="page-sub">Verificando eleições disponíveis para você...</p>
        </div>
        <div className="election-picker-loading">
          <div className="spinner" />
          <p>Verificando cadastro...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="election-picker-page">
        <div className="page-head">
          <h1 className="page-title">Suas eleições</h1>
        </div>
        <div className="status-message error">{error}</div>
      </section>
    )
  }

  if (elections.length === 0) {
    return (
      <section className="election-picker-page">
        <div className="page-head">
          <h1 className="page-title">Suas eleições</h1>
        </div>
        <div className="empty-state">
          <div style={{ marginBottom: 12, color: 'var(--fg-muted)' }}><Vote size={40} /></div>
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--fg-default)' }}>
            Nenhuma eleição disponível.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Você ainda não está cadastrado como votante em nenhuma eleição.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="election-picker-page">
      <div className="page-head">
        <h1 className="page-title">Suas eleições</h1>
        <p className="page-sub">Selecione a eleição em que deseja votar.</p>
      </div>

      <div className="election-picker-grid">
        {elections.map(({ election, details, hasVoted }) => {
          const state = getElectionState(details)
          const raceCount = details?.races?.length ?? 0
          const isOpen = state === 'OPEN'

          return (
            <div key={election.address} className={`election-picker-card${isOpen ? ' open' : ''}${hasVoted ? ' voted' : ''}`}>
              <div className="election-picker-card-header">
                <h2 className="election-picker-card-name">{election.name}</h2>
                <div className="election-picker-badges">
                  {hasVoted && (
                    <span className="election-voted-badge">
                      <CheckCircle2 size={13} />
                      Já votou
                    </span>
                  )}
                  <span className={`election-state-badge ${STATE_CLASSES[state] ?? 'state-pending'}`}>
                    {STATE_LABELS[state] ?? state ?? 'Pendente'}
                  </span>
                </div>
              </div>

              {election.description && (
                <p className="election-picker-card-desc">{election.description}</p>
              )}

              <div className="election-picker-card-meta">
                <span className="election-picker-meta-item">
                  <LayoutList size={14} />
                  {raceCount} {raceCount === 1 ? 'corrida' : 'corridas'}
                </span>
                <span className="election-picker-meta-item">
                  <Users size={14} />
                  Você está cadastrado
                </span>
              </div>

              <div className="election-picker-card-footer">
                {state === 'PENDING' ? (
                  <div className="election-picker-pending-actions">
                    <button
                      className="btn btn-ghost election-picker-btn"
                      onClick={async () => {
                        setZeresimaElectionName(election.name)
                        setZeresimaModalOpen(true)
                        setZeresimaLoading(true)
                        setZeresimaError(null)
                        setZeresimaCandidates([])
                        try {
                          const [zeresimaRes, details] = await Promise.all([
                            getZeresima(election.address),
                            getElection(election.address)
                          ])
                          setZeresimaData(zeresimaRes)
                          const races = details?.races || []
                          const candidates = []
                          races.forEach((race) => {
                            const raceCandidates = race.candidates || []
                            raceCandidates.forEach((cand) => {
                              candidates.push({
                                ...cand,
                                raceName: race.name || race.label || 'Corrida',
                                raceId: race.id
                              })
                            })
                          })
                          setZeresimaCandidates(candidates)
                        } catch (err) {
                          setZeresimaError('Não foi possível carregar a zerézima.')
                        } finally {
                          setZeresimaLoading(false)
                        }
                      }}
                    >
                      <FileText size={16} />
                      Zerézima
                    </button>
                    <button className="btn btn-ghost election-picker-btn" disabled>
                      Aguardando abertura
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="election-picker-actions">
                      <button
                        className="btn btn-ghost election-picker-btn-sm"
                        onClick={async () => {
                          try {
                            const blob = await getBuPdf(election.address)
                            downloadBlob(blob, `bu-${election.address.slice(0, 8)}.pdf`)
                          } catch (err) {
                            alert('Não foi possível baixar o Boletim de Urna.')
                          }
                        }}
                      >
                        <Download size={14} />
                        BU
                      </button>
                      <button
                        className="btn btn-ghost election-picker-btn-sm"
                        onClick={() => {
                          setReceiptElection(election)
                          setReceiptModalOpen(true)
                          setReceiptNullifier('')
                          setReceiptError(null)
                        }}
                      >
                        <Receipt size={14} />
                        Recibo
                      </button>
                    </div>

                    {isOpen && !hasVoted ? (
                      <button
                        className="btn btn-primary election-picker-btn"
                        onClick={() => onSelectElection(election.address)}
                      >
                        Votar
                        <ChevronRight size={16} />
                      </button>
                    ) : state === 'FINISHED' ? (
                      <div className="election-picker-pending-actions">
                        <button
                          className="btn btn-ghost election-picker-btn"
                          onClick={async () => {
                            setRdvElectionName(election.name)
                            setRdvModalOpen(true)
                            setRdvLoading(true)
                            setRdvError(null)
                            try {
                              const data = await getRdv(election.address)
                              setRdvData(data)
                            } catch (err) {
                              setRdvError('Não foi possível carregar o Registro de Voto Digital.')
                            } finally {
                              setRdvLoading(false)
                            }
                          }}
                        >
                          <ScrollText size={16} />
                          RDV
                        </button>
                        <button className="btn btn-ghost election-picker-btn" disabled>
                          {hasVoted ? 'Voto registrado' : 'Encerrada'}
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost election-picker-btn" disabled>
                        {hasVoted
                          ? 'Voto registrado'
                          : 'Aguardando abertura'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {zeresimaModalOpen && (
        <div className="modal-backdrop" onClick={() => setZeresimaModalOpen(false)}>
          <div className="candidate-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-head">
              <h2 className="modal-title">Zerézima - {zeresimaElectionName}</h2>
            </div>
            <div className="candidate-form-body">
              {zeresimaLoading ? (
                <div className="election-picker-loading" style={{ padding: '32px 0' }}>
                  <div className="spinner" />
                  <p>Carregando zerézima...</p>
                </div>
              ) : zeresimaError ? (
                <div className="status-message error" style={{ margin: 0 }}>{zeresimaError}</div>
              ) : zeresimaData ? (
                <div className="zeresima-content">
                  <div className="zeresima-verified-header">
                    <div className="zeresima-verified-icon">
                      <ShieldCheck size={48} strokeWidth={1.5} />
                    </div>
                    <div className="zeresima-verified-title">Eleição Zerada</div>
                    <div className="zeresima-verified-subtitle">
                      {zeresimaCandidates.length} {zeresimaCandidates.length === 1 ? 'candidato cadastrado' : 'candidatos cadastrados'}
                    </div>
                  </div>

                  {(() => {
                    const races = {}
                    zeresimaCandidates.forEach((cand) => {
                      const raceName = cand.raceName || 'Corrida'
                      if (!races[raceName]) races[raceName] = []
                      races[raceName].push(cand)
                    })
                    const raceNames = Object.keys(races)
                    if (raceNames.length === 0) return null
                    return (
                      <div className="zeresima-candidates-section">
                        {raceNames.map((raceName) => (
                          <div key={raceName} className="zeresima-race-block">
                            <div className="zeresima-race-header">
                              <span className="zeresima-race-title">{raceName}</span>
                              <span className="zeresima-race-votes">— 0 votos</span>
                            </div>
                            <div className="zeresima-candidates-list">
                              {races[raceName].map((cand, idx) => (
                                <div key={idx} className="zeresima-candidate-row">
                                  <div className="zeresima-candidate-info">
                                    <span className="zeresima-candidate-number">{String(cand.number || cand.num || 0).padStart(2, '0')}</span>
                                    <span className="zeresima-candidate-name">{cand.name}</span>
                                    <span className="zeresima-candidate-party">({cand.party || 'Sem partido'})</span>
                                  </div>
                                  <span className="zeresima-candidate-votes">0 votos</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  <div className="zeresima-total-row">
                    <span>Total geral</span>
                    <span>0 votos registrados</span>
                  </div>

                  <div className="zeresima-footer-note">
                    <p>Esta zerézima comprova que <strong>nenhum voto foi registrado</strong> nesta eleição. Todos os {zeresimaCandidates.length} candidatos estão listados acima com contagem zerada.</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setZeresimaModalOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {rdvModalOpen && (
        <div className="modal-backdrop" onClick={() => setRdvModalOpen(false)}>
          <div className="candidate-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-head">
              <h2 className="modal-title">Registro de Voto Digital - {rdvElectionName}</h2>
            </div>
            <div className="candidate-form-body">
              {rdvLoading ? (
                <div className="election-picker-loading" style={{ padding: '32px 0' }}>
                  <div className="spinner" />
                  <p>Carregando RDV...</p>
                </div>
              ) : rdvError ? (
                <div className="status-message error" style={{ margin: 0 }}>{rdvError}</div>
              ) : rdvData ? (
                <div className="rdv-content">
                  <div className="rdv-header">
                    <div className="rdv-icon">
                      <ScrollText size={40} strokeWidth={1.5} />
                    </div>
                    <div className="rdv-title">Registro de Voto Digital</div>
                    <div className="rdv-subtitle">Documento de auditoria da eleição</div>
                  </div>

                  <div className="rdv-info">
                    {rdvData.hash && (
                      <div className="rdv-row">
                        <span className="rdv-label">Hash do RDV</span>
                        <code className="rdv-hash">{rdvData.hash.slice(0, 16)}...{rdvData.hash.slice(-8)}</code>
                      </div>
                    )}
                    <div className="rdv-row">
                      <span className="rdv-label">Total de registros</span>
                      <span className="rdv-value">{rdvData.votes?.length || 0} votos</span>
                    </div>
                    {rdvData.timestamp && (
                      <div className="rdv-row">
                        <span className="rdv-label">Gerado em</span>
                        <span className="rdv-value">{new Date(rdvData.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>

                  {rdvData.votes && rdvData.votes.length > 0 && (
                    <div className="rdv-votes-section">
                      <div className="rdv-section-title">Votos registrados</div>
                      <div className="rdv-votes-list">
                        {rdvData.votes.map((vote, idx) => (
                          <div key={idx} className="rdv-vote-item">
                            <div className="rdv-vote-header">
                              <span className="rdv-vote-race">{vote.raceName || vote.race || 'Corrida'}</span>
                            </div>
                            <div className="rdv-vote-details">
                              <span className="rdv-vote-candidate">
                                {vote.candidateNumber && (
                                  <span className="rdv-vote-number">{String(vote.candidateNumber).padStart(2, '0')}</span>
                                )}
                                <span>{vote.candidateName || vote.candidate || 'Candidato'}</span>
                              </span>
                              {vote.nullifier && (
                                <span className="rdv-vote-nullifier">
                                  Nullifier: {vote.nullifier.slice(0, 12)}...{vote.nullifier.slice(-6)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rdv-footer-note">
                    <p>Este Registro de Voto Digital comprova a <strong>integridade e autenticidade</strong> de todos os votos registrados nesta eleição. Cada voto é verificável através de seu nullifier criptográfico.</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setRdvModalOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {receiptModalOpen && (
        <div className="modal-backdrop" onClick={() => setReceiptModalOpen(false)}>
          <div className="candidate-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h2 className="modal-title">Baixar Recibo de Voto</h2>
            </div>
            <div className="candidate-form-body">
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-muted)' }}>
                Informe o nullifier do seu voto para baixar o recibo em PDF.
              </p>
              <div className="form-field">
                <label className="form-label">Nullifier</label>
                <input
                  type="text"
                  className="form-input"
                  value={receiptNullifier}
                  onChange={(e) => setReceiptNullifier(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              {receiptError && (
                <div className="status-message error" style={{ margin: '12px 0 0' }}>{receiptError}</div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setReceiptModalOpen(false)}>Cancelar</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!receiptNullifier.trim() || receiptLoading}
                onClick={async () => {
                  if (!receiptNullifier.trim()) return
                  setReceiptLoading(true)
                  setReceiptError(null)
                  try {
                    const blob = await getVoteReceiptPdf(receiptElection.address, receiptNullifier.trim())
                    downloadBlob(blob, `receipt-${receiptNullifier.trim().slice(0, 8)}.pdf`)
                    setReceiptModalOpen(false)
                  } catch (err) {
                    setReceiptError('Não foi possível baixar o recibo. Verifique o nullifier.')
                  } finally {
                    setReceiptLoading(false)
                  }
                }}
              >
                {receiptLoading ? 'Baixando...' : 'Baixar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ElectionPickerPage

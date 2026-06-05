import { useMemo, useState } from 'react'
import { SPECIAL_VOTES } from '../utils/constants'
import ConfirmModal from '../components/ConfirmModal'
import VoteView from '../components/VotePage'
import { castVote, getVoterProof } from '../services/apiService'
import { computeCommitment, computeNullifier, buildVoteCircuitInput, generateVoteProof, normalizeCpf } from '../utils/zk'

function VotePage({ races, setRaces, electionAddress, electionDetails, formattedVoter, onFinish }) {
  const [raceIdx, setRaceIdx] = useState(0)
  const [ballot, setBallot] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingVote, setPendingVote] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [cpf, setCpf] = useState('')
  const [cpfError, setCpfError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const currentRace = races[raceIdx]
  const currentRaceId = currentRace?.id ?? raceIdx

  const filteredCandidates = useMemo(() => {
    if (!currentRace?.candidates) return []
    const digits = searchTerm.replace(/\D/g, '')
    if (!digits) return currentRace.candidates
    return currentRace.candidates.filter((cand) => cand.num.startsWith(digits))
  }, [searchTerm, currentRace])

  const openConfirmModal = (vote) => {
    if (!cpf.trim()) {
      setCpfError('Informe seu CPF antes de votar.')
      return
    }
    setCpfError('')
    setPendingVote(vote)
    setShowModal(true)
  }

  const closeConfirmModal = () => {
    setPendingVote(null)
    setShowModal(false)
  }

  const castSpecialVote = (type) => {
    const vote = {
      num: '—',
      name: type === SPECIAL_VOTES.BRANCO ? 'Voto em Branco' : 'Voto Nulo',
      party: '—',
      special: type,
      color: type === SPECIAL_VOTES.BRANCO ? '#78787A' : '#DC2626'
    }
    openConfirmModal(vote)
  }

  const getCandidateId = (vote) => {
    if (vote.special === SPECIAL_VOTES.BRANCO) return 0
    if (vote.special === SPECIAL_VOTES.NULO) return 999
    return vote.id ?? Number(vote.num)
  }

  const electionId = electionDetails?.currentElectionId ?? 0

  const completeVote = async () => {
    if (!pendingVote) return
    setShowModal(false)
    setStatusMessage('')
    setCpfError('')
    setLoading(true)

    if (electionAddress) {
      try {
        const normalizedCpf = normalizeCpf(cpf)
        const commitment = await computeCommitment(normalizedCpf)
        const proofData = await getVoterProof(electionAddress, commitment)

        if (!proofData?.included) {
          throw new Error('CPF não cadastrado ou não incluído na lista de votantes.')
        }

        const nullifierHash = await computeNullifier(normalizedCpf, electionId, currentRaceId, 0)

        const circuitInput = buildVoteCircuitInput({
          cpf: normalizedCpf,
          merkleRoot: proofData.root ?? proofData.merkleRoot ?? '',
          pathElements: proofData.pathElements ?? [],
          pathIndices: proofData.pathIndices ?? [],
          nullifierHash,
          candidateId: getCandidateId(pendingVote),
          electionId,
          raceId: currentRaceId,
          pickIndex: 0
        })

        const { proofArray, pubSignalsArray } = await generateVoteProof(circuitInput)
        console.log('Proof generated:', { proofArray, pubSignalsArray })

        setStatusMessage('Prova gerada com sucesso. Enviando voto ao backend...')
        await castVote(electionAddress, {
          raceId: Number(currentRaceId),
          pubSignals: pubSignalsArray,
          proof: proofArray
        })

        setStatusMessage('Voto enviado com sucesso.')
        const voteWithNullifier = { ...pendingVote, nullifier: nullifierHash }

        const finalBallot = [...ballot, { race: currentRace, vote: voteWithNullifier }]
        setBallot(finalBallot)

        setRaces((prev) =>
          prev.map((race, idx) => {
            if (idx !== raceIdx) return race
            const key = voteWithNullifier.special ?? voteWithNullifier.num
            return {
              ...race,
              votes: {
                ...race.votes,
                [key]: (race.votes[key] ?? 0) + 1
              }
            }
          })
        )

        setVerdict('ok')
        setTimeout(() => {
          setVerdict(null)
          if (raceIdx < races.length - 1) {
            setRaceIdx((prev) => prev + 1)
            setSearchTerm('')
          } else {
            onFinish({
              votes: finalBallot,
              time: new Date().toLocaleTimeString('pt-BR'),
              voter: formattedVoter,
              protocol: `VOTO-${String(getCandidateId(voteWithNullifier)).padStart(3, '0')}-${raceIdx}`,
              nullifiers: finalBallot.map((entry) => entry.vote.nullifier).filter(Boolean)
            })
          }
          setPendingVote(null)
          setLoading(false)
        }, 1200)
        return
      } catch (error) {
        console.error('Vote submission failed:', error)
        setCpfError(error.message || 'Falha ao registrar o voto.')
        setVerdict('bad')
        setTimeout(() => setVerdict(null), 1600)
        setLoading(false)
        return
      }
    }

    const finalBallot = [...ballot, { race: currentRace, vote: pendingVote }]
    setBallot(finalBallot)

    setRaces((prev) =>
      prev.map((race, idx) => {
        if (idx !== raceIdx) return race
        const key = pendingVote.special ?? pendingVote.num
        return {
          ...race,
          votes: {
            ...race.votes,
            [key]: (race.votes[key] ?? 0) + 1
          }
        }
      })
    )

    setVerdict('ok')
    setTimeout(() => {
      setVerdict(null)
      if (raceIdx < races.length - 1) {
        setRaceIdx((prev) => prev + 1)
        setSearchTerm('')
      } else {
        onFinish({
          votes: finalBallot,
          time: new Date().toLocaleTimeString('pt-BR'),
          voter: formattedVoter,
          protocol: `VOTO-${String(getCandidateId(pendingVote)).padStart(3, '0')}-${raceIdx}`
        })
      }
      setPendingVote(null)
      setLoading(false)
    }, 1200)
  }

  const cancelVote = () => {
    setShowModal(false)
    setVerdict('cancel')
    setTimeout(() => setVerdict(null), 1200)
  }

  if (!races || races.length === 0) {
    return (
      <section className="vote-page">
        <div className="page-head">
          <h1 className="page-title">Votação</h1>
        </div>
        <div className="empty-state">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗳️</div>
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--fg-default)' }}>
            Nenhuma eleição disponível no momento.
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Aguarde o administrador configurar uma eleição.
          </p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="vote-cpf-box">
        <label>
          CPF do eleitor
          <input
            type="text"
            inputMode="numeric"
            placeholder="00000000000"
            value={cpf}
            onChange={(event) => {
              setCpf(event.target.value.replace(/\D/g, ''))
              setCpfError('')
            }}
            autoComplete="off"
          />
        </label>
        {cpfError && <div className="status-message error">{cpfError}</div>}
        {statusMessage && <div className="status-message">{statusMessage}</div>}
        {loading && <div className="status-message">Gerando prova e enviando voto...</div>}
      </section>
      <VoteView
        races={races}
        raceIdx={raceIdx}
        currentRace={currentRace}
        filteredCandidates={filteredCandidates}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        openConfirmModal={openConfirmModal}
        castSpecialVote={castSpecialVote}
      />

      <ConfirmModal
        open={showModal}
        vote={pendingVote}
        currentRace={currentRace}
        onClose={closeConfirmModal}
        onConfirm={completeVote}
      />

      {verdict && (
        <div className="verdict-backdrop">
          <div className={`verdict-card ${verdict === 'ok' ? 'ok' : 'bad'}`}>
            <div className="verdict-icon">{verdict === 'ok' ? '✓' : '✕'}</div>
            <h2>{verdict === 'ok' ? 'CONFIRMADO' : 'CANCELADO'}</h2>
            <p>{verdict === 'ok' ? 'Voto registrado.' : 'Operação cancelada.'}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default VotePage

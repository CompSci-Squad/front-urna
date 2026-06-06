import { useEffect, useState } from 'react'
import ResultsView from '../components/ResultsPage'
import { getResults } from '../services/apiService'

const REFRESH_INTERVAL = 15000

function buildRaceData(snapshot) {
  const candidates = (snapshot.candidates ?? []).map((c) => ({
    num: String(c.number),
    name: c.name,
    party: c.party,
    votes: Number(c.voteCount ?? 0)
  })).sort((a, b) => b.votes - a.votes)

  const total = candidates.reduce((s, c) => s + c.votes, 0)
    + Number(snapshot.blankVotes || 0)
    + Number(snapshot.nullVotes || 0)

  return {
    id: snapshot.raceId,
    label: snapshot.name ?? snapshot.label ?? `Corrida ${snapshot.raceId}`,
    candidates,
    blankVotes: Number(snapshot.blankVotes || 0),
    nullVotes: Number(snapshot.nullVotes || 0),
    validVotes: candidates.reduce((s, c) => s + c.votes, 0),
    totalVotes: total
  }
}

function ResultsPage({ races, electionAddress }) {
  const [raceCards, setRaceCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  async function loadResults() {
    if (!electionAddress) return
    setLoading(true)
    setError('')
    try {
      const results = await getResults(electionAddress)
      const snapshots = (results?.snapshots ?? []).filter(
        (s) => !!(s.name || s.label)
      )
      setRaceCards(snapshots.map(buildRaceData))
      setLastUpdated(new Date())
    } catch (err) {
      console.warn('Failed to load results:', err)
      setError(err.message || 'Falha ao carregar apuração.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!electionAddress) {
      setRaceCards([])
      setError('')
      setLastUpdated(null)
      return
    }
    loadResults()
    const interval = setInterval(loadResults, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [electionAddress])

  return (
    <ResultsView
      raceCards={raceCards}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      hasData={raceCards.length > 0}
    />
  )
}

export default ResultsPage

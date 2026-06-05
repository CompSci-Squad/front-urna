import { useEffect, useMemo, useState } from 'react'
import ResultsView from '../components/ResultsPage'
import { getResults } from '../services/apiService'

function ResultsPage({ races, electionAddress }) {
  const [resultsRaceIdx, setResultsRaceIdx] = useState(0)
  const [backendResults, setBackendResults] = useState(null)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState('')

  useEffect(() => {
    if (!electionAddress) {
      setBackendResults(null)
      setBackendError('')
      return
    }

    async function loadResults() {
      setBackendLoading(true)
      setBackendError('')
      try {
        const results = await getResults(electionAddress)
        setBackendResults(results)
      } catch (error) {
        console.warn('Failed to load results:', error)
        setBackendResults(null)
        setBackendError(error.message || 'Falha ao carregar apuração.')
      } finally {
        setBackendLoading(false)
      }
    }

    loadResults()
  }, [electionAddress])

  const backendRaceData = backendResults?.snapshots?.find(
    (snapshot) => Number(snapshot.raceId) === resultsRaceIdx
  )

  const resultRace = backendRaceData
    ? {
        ...races[resultsRaceIdx],
        label: backendRaceData.name,
        candidates: backendRaceData.candidates.map((candidate) => ({
          num: String(candidate.number),
          name: candidate.name,
          party: candidate.party
        })),
        votes: {
          ...Object.fromEntries(
            backendRaceData.candidates.map((candidate) => [
              String(candidate.number),
              Number(candidate.voteCount)
            ])
          ),
          BRANCO: Number(backendRaceData.blankVotes || 0),
          NULO: Number(backendRaceData.nullVotes || 0)
        }
      }
    : races[resultsRaceIdx]

  const resultVotes = resultRace?.votes ?? {}
  const totalResultVotes = Object.values(resultVotes || {}).reduce((sum, value) => sum + (value || 0), 0)
  const resultValidVotes = totalResultVotes - (resultVotes.BRANCO || 0) - (resultVotes.NULO || 0)

  const hasData = races.length > 0 && !!resultRace

  const sortedResults = useMemo(() => {
    if (!resultRace?.candidates) return []
    return [...resultRace.candidates]
      .map((cand) => ({ ...cand, votes: resultVotes[cand.num] ?? 0 }))
      .sort((a, b) => b.votes - a.votes)
  }, [resultRace, resultVotes])

  return (
    <ResultsView
      races={races}
      resultsRaceIdx={resultsRaceIdx}
      setResultsRaceIdx={setResultsRaceIdx}
      resultRace={resultRace}
      sortedResults={sortedResults}
      backendLoading={backendLoading}
      backendError={backendError}
      totalResultVotes={totalResultVotes}
      resultValidVotes={resultValidVotes}
      resultVotes={resultVotes}
      hasData={hasData}
    />
  )
}

export default ResultsPage

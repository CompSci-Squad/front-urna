import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { ROLES, TEST_CREDENTIALS } from './utils/constants'
import LoginScreen from './components/LoginScreen'
import { listElections, getElection, setAdminKey, clearAdminKey, getVoterProof } from './services/apiService'
import { computeCommitment } from './utils/zk'

const VotePage = lazy(() => import('./pages/VotePage'))
const ResultsPage = lazy(() => import('./pages/ResultsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const FinishPage = lazy(() => import('./pages/FinishPage'))
const ElectionPickerPage = lazy(() => import('./pages/ElectionPickerPage'))

function App() {
  const [view, setView] = useState('login')
  const [user, setUser] = useState(null)
  const [loginCpf, setLoginCpf] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [races, setRaces] = useState([])
  const [voterCounter, setVoterCounter] = useState(341)
  const [receipt, setReceipt] = useState(null)
  const [time, setTime] = useState(new Date())

  const [electionList, setElectionList] = useState([])
  const [electionAddress, setElectionAddress] = useState(null)
  const [electionDetails, setElectionDetails] = useState(null)

  const effectiveRaces = useMemo(() => {
    if (!electionDetails?.races?.length) {
      return races
    }

    return electionDetails.races.map((race) => ({
      id: race.raceId ?? race.id ?? race.name ?? String(race.raceId ?? ''),
      label: race.label ?? race.name ?? String(race.raceId ?? ''),
      candidates: (race.candidates ?? []).map((cand) => ({
        num: String(cand.number ?? cand.num ?? ''),
        id: cand.id ?? cand.candidateId ?? null,
        name: cand.name,
        party: cand.party,
        photo: cand.photo ?? null
      }))
    }))
  }, [electionDetails, races])

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function loadElections() {
      try {
        const elections = await listElections()
        setElectionList(elections)
        if (elections.length > 0) {
          setElectionAddress(elections[0].address)
        }
      } catch (error) {
        console.warn('Failed to load elections:', error)
      }
    }

    loadElections()
  }, [])

  useEffect(() => {
    if (!electionAddress) {
      setElectionDetails(null)
      return
    }

    async function loadElectionDetails() {
      try {
        const details = await getElection(electionAddress)
        setElectionDetails(details)
      } catch (error) {
        console.warn('Failed to load election details:', error)
        setElectionDetails(null)
      }
    }

    loadElectionDetails()
  }, [electionAddress])

  const formattedVoter = `000.${String(voterCounter).padStart(6, '0').slice(0, 3)}.${String(
    voterCounter
  )
    .padStart(6, '0')
    .slice(3)}`

  const isAdmin = user?.role === ROLES.ADMIN
  const isVoter = user?.role === ROLES.VOTER

  const handleLogin = (event, activeTab = 'voter') => {
    event.preventDefault()
    setLoginError('')
    const cpf = loginCpf.replace(/\D/g, '')
    const password = loginPassword.trim()

    if (!cpf) {
      setLoginError('Informe um CPF válido.')
      return
    }

    if (activeTab === 'admin') {
      if (!password) {
        setLoginError('Senha obrigatória para login administrador.')
        return
      }
      if (cpf !== TEST_CREDENTIALS.admin.cpf || password !== TEST_CREDENTIALS.admin.password) {
        setLoginError('CPF ou senha inválidos.')
        return
      }

      try {
        setAdminKey('dev-admin-secret')
      } catch (e) {
        console.error('Failed to set admin key:', e)
      }
      setUser({ role: ROLES.ADMIN, cpf })
      setView('admin')
      return
    }

    setUser({ role: ROLES.VOTER, cpf })
    setView('vote-picker')
  }

  const handleLogout = () => {
    setUser(null)
    setView('login')
    setReceipt(null)
    setLoginCpf('')
    setLoginPassword('')
    clearAdminKey()
    setLoginError('')
  }

  const handleFinish = (newReceipt) => {
    setReceipt(newReceipt)
    setView('finish')
  }

  const restartSession = () => {
    setReceipt(null)
    setElectionAddress(null)
    setElectionDetails(null)
    setView('vote-picker')
    setVoterCounter((prev) => prev + 1)
  }

  const handleVoterSelectElection = (addr) => {
    setElectionAddress(addr)
    setView('vote')
  }

  if (view === 'login') {
    return (
      <LoginScreen
        loginCpf={loginCpf}
        loginPassword={loginPassword}
        loginError={loginError}
        onCpfChange={(event) => setLoginCpf(event.target.value.replace(/\D/g, ''))}
        onPasswordChange={(event) => setLoginPassword(event.target.value)}
        onLogin={handleLogin}
        onTabChange={() => setLoginError('')}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">U</div>
          <div>
            <div>Urna Digital</div>
          </div>
        </div>
        <div className="meta">
          {isAdmin && (
            <div className="election-picker">
              <span>Eleição</span>
              <select value={electionAddress ?? ''} onChange={(event) => setElectionAddress(event.target.value)}>
                {electionList.length === 0 ? (
                  <option value="">Nenhuma eleição cadastrada</option>
                ) : (
                  electionList.map((election) => (
                    <option key={election.address} value={election.address}>
                      {election.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          {isVoter && electionDetails && (
            <div className="topbar-election-name">
              <span>Eleição:</span>
              <strong>{electionDetails.name}</strong>
            </div>
          )}
          {isVoter && <div>Eleitor: <strong>{formattedVoter}</strong></div>}
          <div>Hora: <strong>{time.toLocaleTimeString('pt-BR')}</strong></div>
          <div className={`role-badge ${user.role}`}>{user.role === ROLES.ADMIN ? 'ADMINISTRADOR' : 'ELEITOR'}</div>
          <button className="btn btn-ghost" onClick={handleLogout}>Sair</button>
        </div>
      </header>

      {isAdmin && (
        <div className="tabs">
          <button className={`tab ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
            Painel administrativo
          </button>
          <button className={`tab ${view === 'results' ? 'active' : ''}`} onClick={() => setView('results')}>
            Apuração
          </button>
        </div>
      )}

      <Suspense fallback={<div className="status-message">Carregando...</div>}>
        {view === 'vote-picker' && (
          <ElectionPickerPage
            userCpf={user?.cpf}
            onSelectElection={handleVoterSelectElection}
          />
        )}

        {view === 'vote' && (
          <VotePage
            races={effectiveRaces}
            setRaces={setRaces}
            electionAddress={electionAddress}
            electionDetails={electionDetails}
            formattedVoter={formattedVoter}
            userCpf={user.cpf}
            onFinish={handleFinish}
          />
        )}

        {view === 'results' && <ResultsPage races={effectiveRaces} electionAddress={electionAddress} />}

        {view === 'admin' && (
          <AdminPage
            races={races}
            setRaces={setRaces}
            electionAddress={electionAddress}
            electionDetails={electionDetails}
            setElectionAddress={setElectionAddress}
            setElectionDetails={setElectionDetails}
            setElectionList={setElectionList}
          />
        )}

        {view === 'finish' && <FinishPage receipt={receipt} onRestart={restartSession} electionAddress={electionAddress} />}
      </Suspense>
    </div>
  )
}

export default App

import { useEffect, useRef, useState } from 'react'
import AdminPanel from '../components/AdminPanel'
import AdminModal from '../components/AdminModal'
import {
  createElection,
  patchElection,
  createRace,
  createCandidate as createCandidateApi,
  listElections,
  listRaces,
  listCandidates,
  listVoters,
  registerVoters,
  getBuPdf,
  getBuJson,
  getZeresima,
  getRdv,
  getPendingLog,
  getVoteReceiptPdf,
  getAdminState,
  getAdminVoters,
  relayLegacy,
  getElection
} from '../services/apiService'
import { computeCommitment, buildMerkleTree, isValidCpf } from '../utils/zk'

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

const INITIAL_CANDIDATE_FORM = {
  num: '',
  name: '',
  party: '',
  photo: '',
  race: ''
}

function AdminPage({ races, setRaces, electionAddress, electionDetails, setElectionAddress, setElectionDetails, setElectionList }) {
  const [adminFormVisible, setAdminFormVisible] = useState(false)
  const [candidateForm, setCandidateForm] = useState(INITIAL_CANDIDATE_FORM)
  const [adminModalVisible, setAdminModalVisible] = useState(false)
  const [adminModalTitle, setAdminModalTitle] = useState('')
  const [adminModalContent, setAdminModalContent] = useState(null)
  const [adminModalChildren, setAdminModalChildren] = useState(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionDialogTitle, setActionDialogTitle] = useState('')
  const [actionDialogFields, setActionDialogFields] = useState([])
  const [actionDialogForm, setActionDialogForm] = useState({})
  const [actionDialogSubmitLabel, setActionDialogSubmitLabel] = useState('Salvar')
  const [actionDialogOnSubmit, setActionDialogOnSubmit] = useState(() => async () => {})
  const [backendRaces, setBackendRaces] = useState(null)
  const [backendCandidates, setBackendCandidates] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [votersDialogOpen, setVotersDialogOpen] = useState(false)
  const [votersCpfText, setVotersCpfText] = useState('')
  const [votersCsvInfo, setVotersCsvInfo] = useState(null)
  const [votersSubmitting, setVotersSubmitting] = useState(false)
  const [totalVoters, setTotalVoters] = useState(0)
  const csvInputRef = useRef(null)

  useEffect(() => {
    if (!electionAddress) {
      setBackendRaces(null)
      setBackendCandidates([])
      setTotalVoters(0)
      return
    }

    reloadCandidates()
    loadTotalVoters()
  }, [electionAddress])

  async function loadTotalVoters() {
    if (!electionAddress) return
    try {
      const voters = await listVoters(electionAddress)
      setTotalVoters(voters?.length || 0)
    } catch (err) {
      console.warn('Failed to load voters count:', err)
      setTotalVoters(0)
    }
  }

  async function reloadCandidates() {
    if (!electionAddress) return

    setLoadingCandidates(true)
    try {
      const racesData = await listRaces(electionAddress)
      console.log('🏛️ Races retornadas do backend:', racesData)
      
      // Normaliza races para garantir que sempre temos id, name, label
      const normalizedRaces = (racesData || []).map((race, idx) => ({
        id: race.id ?? race.raceId ?? String(idx),
        name: race.name ?? race.label ?? `Race ${idx}`,
        label: race.label ?? race.name ?? `Race ${idx}`,
        raceId: race.id ?? race.raceId ?? String(idx)
      }))
      
      console.log('✅ Races normalizadas:', normalizedRaces)
      setBackendRaces(normalizedRaces)

      const allCandidates = []
      if (Array.isArray(normalizedRaces)) {
        for (const race of normalizedRaces) {
          try {
            const raceId = race.id // Use normalized id
            console.log(`📡 Carregando candidatos para race: ${raceId}`)
            const candidates = await listCandidates(electionAddress, raceId)
            console.log(`  → Candidatos recebidos:`, candidates)
            if (Array.isArray(candidates)) {
              allCandidates.push(
                ...candidates.map((cand) => ({
                  ...cand,
                  raceId,
                  raceName: race.label
                }))
              )
            }
          } catch (e) {
            console.warn(`Failed to load candidates for race ${race.id}:`, e)
          }
        }
      }
      console.log('📊 Total de candidatos carregados:', allCandidates)
      setBackendCandidates(allCandidates)
    } catch (error) {
      console.warn('Failed to load races:', error)
      setBackendRaces(null)
      setBackendCandidates([])
    } finally {
      setLoadingCandidates(false)
    }
  }

  async function reloadElectionDetails() {
    if (!electionAddress) return
    try {
      const details = await getElection(electionAddress)
      setElectionDetails(details)
    } catch (err) {
      console.warn('Failed to reload election details:', err)
    }
  }

  const showAdminModal = (title, content) => {
    setAdminModalTitle(title)
    setAdminModalContent(content)
    setAdminModalChildren(null)
    setAdminModalVisible(true)
  }

  const showAdminModalJsx = (title, jsx) => {
    setAdminModalTitle(title)
    setAdminModalContent(null)
    setAdminModalChildren(jsx)
    setAdminModalVisible(true)
  }

  const openActionDialog = ({ title, fields, initialValues = {}, submitLabel = 'Salvar', onSubmit }) => {
    setActionDialogTitle(title)
    setActionDialogFields(fields)
    setActionDialogForm(initialValues)
    setActionDialogSubmitLabel(submitLabel)
    setActionDialogOnSubmit(() => onSubmit)
    setActionDialogOpen(true)
  }

  const closeActionDialog = () => {
    setActionDialogOpen(false)
    setActionDialogForm({})
    setActionDialogFields([])
    setActionDialogOnSubmit(() => async () => {})
  }

  const handleActionDialogSubmit = async (event) => {
    event.preventDefault()
    try {
      await actionDialogOnSubmit(actionDialogForm)
      closeActionDialog()
    } catch (error) {
      showAdminModal('Erro', error.message || String(error))
    }
  }

  const renderActionField = (field) => {
    const value = actionDialogForm[field.name] ?? ''
    const commonProps = {
      id: field.name,
      value,
      onChange: (event) =>
        setActionDialogForm((prev) => ({
          ...prev,
          [field.name]: event.target.value
        })),
      placeholder: field.placeholder || '',
      className: 'form-input'
    }

    if (field.type === 'textarea') {
      return <textarea {...commonProps} rows={field.rows || 4} />
    }

    if (field.type === 'select') {
      return (
        <select {...commonProps}>
          <option value="">-- Selecione --</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    return <input {...commonProps} type={field.type || 'text'} />
  }

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleAddCandidate = async (event) => {
    event.preventDefault()
    if (!candidateForm.num || !candidateForm.name || !candidateForm.party || !candidateForm.race) {
      showAdminModal('Validação', 'Preencha todos os campos, incluindo o cargo')
      return
    }

    // Validate number is numeric
    const numValue = Number(candidateForm.num)
    if (isNaN(numValue) || numValue <= 0) {
      showAdminModal('Validação', 'O número do candidato deve ser um número válido')
      return
    }

    if (!electionAddress) {
      showAdminModal('Validação', 'Selecione uma eleição primeiro')
      return
    }

    if (!backendRaces || backendRaces.length === 0) {
      showAdminModal('Validação', 'Nenhuma corrida (race) disponível para esta eleição')
      return
    }

    if (electionAddress && backendRaces) {
      // Backend mode: use actual raceId from candidateForm.race
      try {
        const raceId = candidateForm.race // This is the value from the select
        console.log('🔍 Race ID selecionado:', raceId, 'tipo:', typeof raceId)
        console.log('📋 BackendRaces disponíveis:', backendRaces.map(r => ({ id: r.id, label: r.label })))
        
        const selectedRace = backendRaces.find(r => r.id === raceId || r.id == raceId)
        
        if (!selectedRace) {
          showAdminModal(
            'Validação',
            `Race ID "${raceId}" não encontrada.\n\nRaces disponíveis:\n${backendRaces.map(r => `- ID: ${r.id}, Label: ${r.label}`).join('\n')}`
          )
          return
        }

        console.log('✅ Race encontrada:', selectedRace)
        
        // Validate data before sending
        console.log('📤 Enviando candidato:', {
          electionAddress,
          raceId,
          selectedRace,
          candidate: {
            name: candidateForm.name,
            party: candidateForm.party,
            number: numValue
          }
        })

        await createCandidateApi(electionAddress, raceId, candidateForm)
        showAdminModalJsx('Candidato cadastrado', (
          <div className="admin-success-modal">
            <div className="admin-success-row"><span>Número</span><strong>{candidateForm.num}</strong></div>
            <div className="admin-success-row"><span>Nome</span><strong>{candidateForm.name}</strong></div>
            <div className="admin-success-row"><span>Partido</span><span>{candidateForm.party}</span></div>
          </div>
        ))
        setCandidateForm(INITIAL_CANDIDATE_FORM)
        setAdminFormVisible(false)
        // Reload candidates from backend
        await reloadCandidates()
      } catch (error) {
        console.error('❌ Erro ao criar candidato:', error)
        const errorMessage = error.payload?.error || error.message || 'Erro desconhecido'
        const errorDetails = error.payload ? JSON.stringify(error.payload, null, 2) : ''
        showAdminModal(
          'Erro ao cadastrar candidato',
          `${errorMessage}\n\n${errorDetails}`
        )
      }
    } else {
      // Fallback to local races (when no backend)
      setRaces((prev) =>
        prev.map((race) => {
          if (race.id !== candidateForm.race) return race
          return {
            ...race,
            candidates: [
              ...race.candidates,
              {
                num: candidateForm.num,
                name: candidateForm.name,
                party: candidateForm.party,
                photo: candidateForm.photo || null
              }
            ]
          }
        })
      )

      setCandidateForm(INITIAL_CANDIDATE_FORM)
      setAdminFormVisible(false)
    }
  }

  const handleDeleteCandidate = (raceId, num) => {
    setRaces((prev) =>
      prev.map((race) => {
        if (race.id !== raceId) return race
        return {
          ...race,
          candidates: race.candidates.filter((cand) => cand.num !== num)
        }
      })
    )
  }

  const handleCreateElection = () => {
    openActionDialog({
      title: 'Criar eleição',
      submitLabel: 'Criar',
      fields: [
        { name: 'name', label: 'Nome da eleição', placeholder: 'Ex: Eleição 2026' },
        { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição' }
      ],
      initialValues: { name: '', description: '' },
      onSubmit: async (form) => {
        if (!form.name) {
          throw new Error('Informe o nome da eleição.')
        }
        const res = await createElection({ name: form.name, description: form.description || '' })
        const elections = await listElections()
        setElectionList(elections)
        if (res?.address) {
          setElectionAddress(res.address)
        } else if (elections.length > 0) {
          setElectionAddress(elections[elections.length - 1].address)
        }
        const addr = res?.address ?? ''
        showAdminModalJsx('Eleição criada', (
          <div className="admin-success-modal">
            <div className="admin-success-row"><span>Nome</span><strong>{res?.name ?? form.name}</strong></div>
            {addr && <div className="admin-success-row"><span>Endereço</span><code className="admin-success-code">{addr.slice(0, 10)}...{addr.slice(-8)}</code></div>}
            <div className="admin-success-row"><span>Estado</span><span className="election-state-badge state-pending">Pendente</span></div>
            <p className="admin-success-hint">Próximo passo: crie as corridas e cadastre os candidatos.</p>
          </div>
        ))
      }
    })
  }

  const handlePatchElection = () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    openActionDialog({
      title: 'Atualizar estado da eleição',
      submitLabel: 'Atualizar',
      fields: [
        {
          name: 'state',
          label: 'Novo estado',
          type: 'select',
          options: ['OPEN', 'FINISHED']
        }
      ],
      initialValues: { state: '' },
      onSubmit: async (form) => {
        if (!form.state) {
          throw new Error('Selecione o novo estado da eleição.')
        }
        const res = await patchElection(electionAddress, { state: form.state })
        await reloadElectionDetails()
        const stateLabels = { OPEN: 'Aberta', PENDING: 'Pendente', FINISHED: 'Encerrada' }
        const stateClasses = { OPEN: 'state-open', PENDING: 'state-pending', FINISHED: 'state-finished' }
        showAdminModalJsx('Eleição atualizada', (
          <div className="admin-success-modal">
            <div className="admin-success-row"><span>Novo estado</span><span className={`election-state-badge ${stateClasses[form.state] ?? 'state-pending'}`}>{stateLabels[form.state] ?? form.state}</span></div>
            <p className="admin-success-hint">O estado da eleição foi atualizado com sucesso.</p>
          </div>
        ))
      }
    })
  }

  const handleCreateRace = () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    openActionDialog({
      title: 'Criar corrida',
      submitLabel: 'Criar',
      fields: [
        { name: 'name', label: 'Nome da corrida (race)', placeholder: 'Ex: Presidente' }
      ],
      initialValues: { name: '' },
      onSubmit: async (form) => {
        if (!form.name) {
          throw new Error('Informe o nome da corrida.')
        }
        const res = await createRace(electionAddress, { name: form.name })
        await reloadCandidates()
        showAdminModalJsx('Corrida criada', (
          <div className="admin-success-modal">
            <div className="admin-success-row"><span>Nome</span><strong>{res?.name ?? form.name}</strong></div>
            {res?.id && <div className="admin-success-row"><span>ID</span><code className="admin-success-code">{res.id}</code></div>}
            <p className="admin-success-hint">Próximo passo: cadastre os candidatos para esta corrida.</p>
          </div>
        ))
      }
    })
  }

  const handleGetBuPdf = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const blob = await getBuPdf(electionAddress)
      downloadBlob(blob, `bu-${electionAddress}.pdf`)
    } catch (err) {
      showAdminModal('Erro ao baixar BU', err.message || String(err))
    }
  }

  const handleGetBuJson = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const json = await getBuJson(electionAddress)
      showAdminModal('Boletim (JSON)', JSON.stringify(json, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar BU JSON', err.message || String(err))
    }
  }

  const handleGetZeresima = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const data = await getZeresima(electionAddress)
      showAdminModal('Zerésima', JSON.stringify(data, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar zerésima', err.message || String(err))
    }
  }

  const handleGetRdv = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    if (getElectionState(electionDetails) !== 'FINISHED') {
      return showAdminModal('RDV indisponível', 'O RDV só está disponível após o encerramento da eleição.')
    }
    try {
      const data = await getRdv(electionAddress)
      showAdminModal('Registro Digital de Voto (RDV)', JSON.stringify(data, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar RDV', err.message || String(err))
    }
  }

  const handleGetPendingLog = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const data = await getPendingLog(electionAddress)
      showAdminModal('Pending Log', JSON.stringify(data, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar pending log', err.message || String(err))
    }
  }

  const handleListVoters = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const data = await listVoters(electionAddress)
      showAdminModal('Votantes cadastrados', JSON.stringify(data, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar votantes', err.message || String(err))
    }
  }

  const handleRegisterVoters = () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    setVotersCpfText('')
    setVotersCsvInfo(null)
    setVotersDialogOpen(true)
  }

  const handleCsvImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const cpfs = text
        .split(/[\r\n]+/)
        .map((line) => line.replace(/\D/g, ''))
        .filter((c) => c.length === 11)
      setVotersCpfText(cpfs.join('\n'))
      setVotersCsvInfo({ filename: file.name, count: cpfs.length })
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleVotersSubmit = async () => {
    const cpfs = votersCpfText
      .split(/[\s,;]+/)
      .map((item) => item.replace(/\D/g, ''))
      .filter(Boolean)

    if (cpfs.length === 0) {
      return showAdminModal('Erro', 'Nenhum CPF informado.')
    }
    if (cpfs.length > 16) {
      return showAdminModal('Erro', 'Máximo de 16 CPFs permitidos para o Merkle tree.')
    }

    // Validar CPFs
    const invalidCpfs = cpfs.filter((cpf) => !isValidCpf(cpf))
    if (invalidCpfs.length > 0) {
      const validCpfs = cpfs.filter((cpf) => isValidCpf(cpf))
      if (validCpfs.length === 0) {
        // Nenhum válido: fecha janela e mostra erro
        setVotersDialogOpen(false)
        return showAdminModal(
          'Erro',
          `Nenhum CPF válido encontrado. Os seguintes são inválidos: ${invalidCpfs.join(', ')}`
        )
      }
      // Alguns válidos: fecha janela e mostra modal com opções
      setVotersDialogOpen(false)
      showAdminModalJsx('CPFs inválidos detectados', (
        <div className="admin-success-modal">
          <p style={{ marginBottom: '12px' }}>Os seguintes CPFs são inválidos e serão ignorados:</p>
          <code style={{ display: 'block', marginBottom: '16px', fontSize: '13px' }}>
            {invalidCpfs.join(', ')}
          </code>
          <p style={{ marginBottom: '16px' }}>
            Deseja prosseguir com os <strong>{validCpfs.length}</strong> CPFs válidos?
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                setAdminModalVisible(false)
                setVotersDialogOpen(true)
              }}
            >
              Voltar e corrigir
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setAdminModalVisible(false)
                processValidVoters(validCpfs)
              }}
            >
              Prosseguir
            </button>
          </div>
        </div>
      ))
      return
    }

    await processValidVoters(cpfs)
  }

  const processValidVoters = async (validCpfs) => {
    setVotersSubmitting(true)
    try {
      const commitments = await Promise.all(validCpfs.map(computeCommitment))
      const { root } = await buildMerkleTree(commitments)
      const payload = { hashes: commitments, merkleRoot: root }
      const res = await registerVoters(electionAddress, payload)
      setVotersDialogOpen(false)
      setVotersCpfText('')
      setVotersCsvInfo(null)
      await loadTotalVoters()
      showAdminModalJsx('Votantes registrados', (
        <div className="admin-success-modal">
          <div className="admin-success-row"><span>Eleitores registrados</span><strong>{commitments.length}</strong></div>
          <div className="admin-success-row"><span>Merkle root</span><code className="admin-success-code">{root.slice(0, 10)}...{root.slice(-8)}</code></div>
          <p className="admin-success-hint">Os eleitores foram registrados com sucesso na eleição.</p>
        </div>
      ))
    } catch (err) {
      showAdminModal('Erro ao registrar votantes', err.message || String(err))
    } finally {
      setVotersSubmitting(false)
    }
  }

  const handleGetVoteReceiptPdf = () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    openActionDialog({
      title: 'Baixar recibo',
      submitLabel: 'Baixar',
      fields: [
        {
          name: 'nullifier',
          label: 'Nullifier (pubSignals[1])',
          placeholder: 'Informe o nullifier'
        }
      ],
      initialValues: { nullifier: '' },
      onSubmit: async (form) => {
        if (!form.nullifier) {
          throw new Error('Informe o nullifier.')
        }
        const blob = await getVoteReceiptPdf(electionAddress, form.nullifier)
        downloadBlob(blob, `receipt-${form.nullifier}.pdf`)
      }
    })
  }

  const handleGetAdminState = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const data = await getAdminState(electionAddress)
      showAdminModal('Admin State', JSON.stringify(data, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar admin state', err.message || String(err))
    }
  }

  const handleGetAdminVoters = async () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    try {
      const data = await getAdminVoters(electionAddress)
      showAdminModal('Admin Voters', JSON.stringify(data, null, 2))
    } catch (err) {
      showAdminModal('Erro ao buscar admin voters', err.message || String(err))
    }
  }

  const handleRelayLegacy = () => {
    if (!electionAddress) return showAdminModal('Erro', 'Selecione uma eleição primeiro.')
    openActionDialog({
      title: 'Relay legacy',
      submitLabel: 'Enviar',
      fields: [
        {
          name: 'payload',
          label: 'Payload JSON para relay (pubSignals, proof, raceId)',
          type: 'textarea',
          placeholder: '{"pubSignals": [...], "proof": {...}, "raceId": "..."}'
        }
      ],
      initialValues: { payload: '' },
      onSubmit: async (form) => {
        if (!form.payload) {
          throw new Error('Informe o payload JSON.')
        }
        let payload
        try {
          payload = JSON.parse(form.payload)
        } catch (err) {
          throw new Error('JSON inválido. Verifique o formato do payload.')
        }
        const res = await relayLegacy(electionAddress, payload)
        showAdminModal('Relay OK', JSON.stringify(res, null, 2))
      }
    })
  }

  const actionGroups = [
    {
      label: 'Eleição',
      actions: [
        { label: 'Criar eleição', onClick: handleCreateElection },
        { label: 'Atualizar estado', onClick: handlePatchElection }
      ]
    },
    {
      label: 'Corridas',
      actions: [
        { label: 'Criar corrida', onClick: handleCreateRace }
      ]
    },
    {
      label: 'Votantes',
      actions: [
        { label: 'Registrar votantes', onClick: handleRegisterVoters },
        { label: 'Listar votantes', onClick: handleListVoters }
      ]
    },
    {
      label: 'Auditoria',
      actions: [
        { label: 'BU (PDF)', onClick: handleGetBuPdf },
        { label: 'BU (JSON)', onClick: handleGetBuJson },
        { label: 'Zerésima', onClick: handleGetZeresima },
        { label: 'RDV', onClick: handleGetRdv }
      ]
    },
    {
      label: 'Recibo',
      actions: [
        { label: 'Baixar recibo (PDF)', onClick: handleGetVoteReceiptPdf }
      ]
    }
  ]

  return (
    <>
      <AdminPanel
        races={backendRaces || races}
        displayCandidates={backendCandidates.length > 0 ? backendCandidates : null}
        adminFormVisible={adminFormVisible}
        setAdminFormVisible={setAdminFormVisible}
        candidateForm={candidateForm}
        setCandidateForm={setCandidateForm}
        handleAddCandidate={handleAddCandidate}
        handleDeleteCandidate={handleDeleteCandidate}
        actionGroups={actionGroups}
        electionDetails={electionDetails}
        electionAddress={electionAddress}
        backendRaces={backendRaces}
        backendCandidates={backendCandidates}
        totalVoters={totalVoters}
      />

      <AdminModal
        open={adminModalVisible}
        title={adminModalTitle}
        content={adminModalContent}
        onClose={() => setAdminModalVisible(false)}
      >
        {adminModalChildren}
      </AdminModal>

      {votersDialogOpen && (
        <div className="modal-backdrop" onClick={() => setVotersDialogOpen(false)}>
          <div className="candidate-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Registrar votantes</h2>
            </div>
            <div className="candidate-form-body">
              <div className="voters-csv-toolbar">
                <span className="voters-csv-label">Cole os CPFs abaixo ou importe um arquivo .csv</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => csvInputRef.current?.click()}
                >
                  Importar CSV
                </button>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={handleCsvImport}
                />
              </div>

              {votersCsvInfo && (
                <div className="voters-csv-info">
                  {votersCsvInfo.count} CPF{votersCsvInfo.count !== 1 ? 's' : ''} encontrado{votersCsvInfo.count !== 1 ? 's' : ''} em <strong>{votersCsvInfo.filename}</strong>
                </div>
              )}

              <div className="candidate-form-section">
                <label className="candidate-field-label" htmlFor="cpfs-textarea">
                  CPFs <span className="candidate-field-optional">um por linha</span>
                </label>
                <textarea
                  id="cpfs-textarea"
                  className="candidate-field-input"
                  style={{ height: 160, resize: 'vertical', padding: '10px 12px', lineHeight: 1.6 }}
                  placeholder={'12345678900\n98765432100\n11122233344'}
                  value={votersCpfText}
                  onChange={(e) => { setVotersCpfText(e.target.value); setVotersCsvInfo(null) }}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setVotersDialogOpen(false)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleVotersSubmit} disabled={votersSubmitting}>
                {votersSubmitting ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminModal
        open={actionDialogOpen}
        title={actionDialogTitle}
        onClose={closeActionDialog}
        actions={[
          { label: actionDialogSubmitLabel, variant: 'primary', onClick: handleActionDialogSubmit }
        ]}
      >
        <form onSubmit={handleActionDialogSubmit} style={{ display: 'grid', gap: '16px' }}>
          {actionDialogFields.map((field) => (
            <label key={field.name} style={{ display: 'grid', gap: '8px' }}>
              <span>{field.label}</span>
              {renderActionField(field)}
            </label>
          ))}
        </form>
      </AdminModal>
    </>
  )
}

export default AdminPage

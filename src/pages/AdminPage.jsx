import { useEffect, useState } from 'react'
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
  relayLegacy
} from '../services/apiService'
import { computeCommitment, buildMerkleTree } from '../utils/zk'

const INITIAL_CANDIDATE_FORM = {
  num: '',
  name: '',
  party: '',
  photo: '',
  race: ''
}

function AdminPage({ races, setRaces, electionAddress, setElectionList }) {
  const [adminFormVisible, setAdminFormVisible] = useState(false)
  const [candidateForm, setCandidateForm] = useState(INITIAL_CANDIDATE_FORM)
  const [adminModalVisible, setAdminModalVisible] = useState(false)
  const [adminModalTitle, setAdminModalTitle] = useState('')
  const [adminModalContent, setAdminModalContent] = useState(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionDialogTitle, setActionDialogTitle] = useState('')
  const [actionDialogFields, setActionDialogFields] = useState([])
  const [actionDialogForm, setActionDialogForm] = useState({})
  const [actionDialogSubmitLabel, setActionDialogSubmitLabel] = useState('Salvar')
  const [actionDialogOnSubmit, setActionDialogOnSubmit] = useState(() => async () => {})
  const [backendRaces, setBackendRaces] = useState(null)
  const [backendCandidates, setBackendCandidates] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  useEffect(() => {
    if (!electionAddress) {
      setBackendRaces(null)
      setBackendCandidates([])
      return
    }

    reloadCandidates()
  }, [electionAddress])

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

  const showAdminModal = (title, content) => {
    setAdminModalTitle(title)
    setAdminModalContent(content)
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
        showAdminModal('Sucesso', 'Candidato cadastrado com sucesso')
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
        { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição opcional' }
      ],
      initialValues: { name: '', description: '' },
      onSubmit: async (form) => {
        if (!form.name) {
          throw new Error('Informe o nome da eleição.')
        }
        const res = await createElection({ name: form.name, description: form.description || '' })
        const elections = await listElections()
        setElectionList(elections)
        showAdminModal('Eleição criada', JSON.stringify(res, null, 2))
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
        showAdminModal('Eleição atualizada', JSON.stringify(res, null, 2))
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
        showAdminModal('Corrida criada', JSON.stringify(res, null, 2))
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
    openActionDialog({
      title: 'Registrar votantes',
      submitLabel: 'Registrar',
      fields: [
        {
          name: 'cpfs',
          label: 'CPFs separados por vírgula, nova linha ou espaço',
          type: 'textarea',
          placeholder: '12345678900, 98765432100'
        }
      ],
      initialValues: { cpfs: '' },
      onSubmit: async (form) => {
        const cpfs = form.cpfs
          .split(/[\s,;]+/)
          .map((item) => item.replace(/\D/g, ''))
          .filter(Boolean)

        if (cpfs.length === 0) {
          throw new Error('Nenhum CPF válido informado.')
        }

        if (cpfs.length > 16) {
          throw new Error('Máximo de 16 CPFs permitidos para o Merkle tree.')
        }

        const commitments = await Promise.all(cpfs.map(computeCommitment))
        const { root } = await buildMerkleTree(commitments)
        const payload = { hashes: commitments, merkleRoot: root }
        const res = await registerVoters(electionAddress, payload)
        showAdminModal(
          'Registro de votantes',
          JSON.stringify({ count: commitments.length, merkleRoot: root, response: res }, null, 2)
        )
      }
    })
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
        { label: 'RDV', onClick: handleGetRdv },
        { label: 'Pending log', onClick: handleGetPendingLog }
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
      />

      <AdminModal
        open={adminModalVisible}
        title={adminModalTitle}
        content={adminModalContent}
        onClose={() => setAdminModalVisible(false)}
      />

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

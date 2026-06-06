import { useEffect, useState } from 'react'
import { getVoteReceiptPdf } from '../services/apiService'

function truncateHash(hash, chars = 12) {
  if (!hash || hash.length <= chars * 2 + 3) return hash
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`
}

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

function FinishPage({ receipt, onRestart, electionAddress }) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(null)

  useEffect(() => {
    if (!electionAddress || !receipt?.nullifiers?.length) return

    const downloadReceipt = async () => {
      setDownloading(true)
      setDownloadError(null)
      try {
        const nullifier = receipt.nullifiers[0]
        const blob = await getVoteReceiptPdf(electionAddress, nullifier)
        downloadBlob(blob, `receipt-${nullifier.slice(0, 8)}.pdf`)
      } catch (err) {
        setDownloadError('Não foi possível baixar o comprovante automaticamente.')
        console.error('Erro ao baixar recibo:', err)
      } finally {
        setDownloading(false)
      }
    }

    downloadReceipt()
  }, [electionAddress, receipt])

  if (!receipt) {
    return <div className="status-message">Nenhum recebimento disponível.</div>
  }

  return (
    <section className="finish-page">
      <div className="fim-screen">
        <div className="fim-check">✓</div>
        <div className="fim-msg">Voto registrado com sucesso</div>
        <p className="fim-sub">Obrigado por participar. Retire seu comprovante no botão abaixo.</p>

        <div className="receipt">
          <div className="receipt-title">Comprovante de Votação</div>
          <div className="receipt-divider" />

          <div className="row"><span>Eleitor</span><strong>{receipt.voter}</strong></div>
          <div className="row"><span>Seção</span><strong>0042</strong></div>

          {receipt.votes.map((entry) => (
            <div key={`${entry.race.id}-${entry.vote.num}`} className="row">
              <span>{entry.race.label}</span>
              <strong>
                {entry.vote.special ? entry.vote.special : `${entry.vote.num} — ${entry.vote.name} (${entry.vote.party})`}
              </strong>
            </div>
          ))}

          <div className="row"><span>Hora</span><strong>{receipt.time}</strong></div>

          {receipt.nullifiers?.length > 0 && (
            <>
              <div className="receipt-divider" />
              {receipt.nullifiers.map((n, i) => (
                <div key={i} className="row">
                  <span>Nullifier {receipt.nullifiers.length > 1 ? i + 1 : ''}</span>
                  <strong className="nullifier-text nullifier-screen" title={n}>{truncateHash(n)}</strong>
                  <strong className="nullifier-text nullifier-print">{n}</strong>
                </div>
              ))}
            </>
          )}

          <div className="receipt-divider" />
          <div className="row"><span>Protocolo</span><strong>{receipt.protocol}</strong></div>
        </div>

        {downloading && (
          <div className="download-status downloading">
            <span className="spinner-sm" /> Baixando comprovante...
          </div>
        )}
        {downloadError && (
          <div className="download-status error">{downloadError}</div>
        )}

        <div className="row-buttons">
          <button className="btn btn-primary" onClick={onRestart}>
            Confirmar
          </button>
        </div>
      </div>
    </section>
  )
}

export default FinishPage

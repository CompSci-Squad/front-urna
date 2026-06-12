import { useEffect, useState } from 'react'



function truncateHash(hash, chars = 12) {

  if (!hash || hash.length <= chars * 2 + 3) return hash

  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`

}



function FinishPage({ receipt, onRestart }) {

  const [downloading, setDownloading] = useState(false)

  const [downloadError, setDownloadError] = useState(null)

  const [pdfGenerated, setPdfGenerated] = useState(false)



  useEffect(() => {

    // Só gerar PDF se tiver receipt com nullifiers e ainda não gerou

    if (!receipt?.nullifiers?.length || pdfGenerated) return



    const generatePDF = async () => {

      setDownloading(true)

      setDownloadError(null)

      try {

        // Pequeno delay para garantir que o DOM esteja renderizado

        await new Promise(resolve => setTimeout(resolve, 500))

        

        // Criar HTML do comprovante em uma nova aba para impressão

        const printWindow = window.open('', '_blank')

        if (!printWindow) {

          throw new Error('Não foi possível abrir a janela de impressão')

        }

        

        const voterId = receipt.voter || 'N/A'

        const time = receipt.time || new Date().toLocaleString('pt-BR')

        

        // Gerar HTML dos votos

        const votesHtml = receipt.votes.map((entry, index) => {

          const raceLabel = entry?.race?.label || `Corrida ${index + 1}`

          let voteText = 'Voto não registrado'

          if (entry?.vote) {

            if (entry.vote.special) {

              voteText = entry.vote.special

            } else if (entry.vote.num && entry.vote.name) {

              voteText = `Candidato: ${entry.vote.num} - ${entry.vote.name} (${entry.vote.party || 'Sem partido'})`

            }

          }

          return `

            <div style="margin: 10px 0;">

              <strong>${index + 1}. ${raceLabel}</strong><br>

              <span style="margin-left: 20px;">${voteText}</span>

            </div>

          `

        }).join('')

        

        // Gerar HTML dos nullifiers (completos, sem truncamento)

        const nullifiersHtml = receipt.nullifiers.map((nullifier, index) => {

          const safeNullifier = String(nullifier || '')

          return `<div style="font-family: monospace; font-size: 11px; margin: 4px 0; word-break: break-all;">${index + 1}. ${safeNullifier}</div>`

        }).join('')

        

        const htmlContent = `

<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8">

  <title>Comprovante de Votação</title>

  <style>

    @page { size: A4; margin: 10mm; }

    body { 

      font-family: Arial, sans-serif; 

      max-width: 600px; 

      margin: 20px auto; 

      padding: 20px; 

      background: #f5f5f5; 

    }

    .receipt { 

      background: white; 

      border: 2px solid #333; 

      padding: 30px; 

      border-radius: 8px; 

    }

    .header { 

      text-align: center; 

      border-bottom: 2px solid #333; 

      padding-bottom: 20px; 

      margin-bottom: 20px; 

    }

    .header h1 { margin: 0; font-size: 24px; }

    .header h2 { margin: 5px 0 0; font-size: 14px; color: #666; }

    .section { margin: 20px 0; border-bottom: 1px solid #ddd; padding-bottom: 15px; }

    .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }

    .nullifiers { font-family: monospace; background: #f9f9f9; padding: 15px; border-radius: 4px; }

    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; font-style: italic; }

    .print-btn { 

      display: block; 

      width: 100%; 

      padding: 15px; 

      margin: 20px 0; 

      background: #22c55e; 

      color: white; 

      border: none; 

      border-radius: 8px; 

      font-size: 16px; 

      cursor: pointer; 

    }

    @media print { 

      body { background: white; } 

      .receipt { border: none; }

      .print-btn { display: none; }

    }

  </style>

</head>

<body>

  <button class="print-btn" onclick="window.print()">📄 Clique aqui para Imprimir / Salvar como PDF</button>

  

  <div class="receipt">

    <div class="header">

      <h1>COMPROVANTE DE VOTAÇÃO</h1>

      <h2>URNA DIGITAL</h2>

    </div>

    

    <div class="section">

      <div class="section-title">Dados do Eleitor</div>

      <p><strong>Eleitor:</strong> ${voterId}</p>

      <p><strong>Data/Hora:</strong> ${time}</p>

    </div>

    

    <div class="section">

      <div class="section-title">Votos Registrados</div>

      ${votesHtml}

    </div>

    

    <div class="section">

      <div class="section-title">Nullifiers (Comprovantes Criptográficos)</div>

      <div class="nullifiers">

        ${nullifiersHtml}

      </div>

    </div>

    

    <div class="footer">

      <p>Guarde este comprovante para verificação.</p>

      <p>Este documento comprova a integridade e autenticidade do seu voto.</p>

    </div>

  </div>

</body>

</html>`

        

        printWindow.document.write(htmlContent)

        printWindow.document.close()

        

        // Tentar acionar impressão automaticamente após 1 segundo

        setTimeout(() => {

          printWindow.print()

        }, 1000)

        

        setPdfGenerated(true)

      } catch (err) {

        console.error('Erro ao abrir impressão:', err)

        setDownloadError('Não foi possível abrir a janela de impressão.')

      } finally {

        setDownloading(false)

      }

    }



    generatePDF()

  }, [receipt, pdfGenerated])



  // Renderização segura - sempre mostrar algo

  if (!receipt) {

    return (

      <section className="finish-page">

        <div className="fim-screen">

          <div className="status-message">Nenhum comprovante disponível.</div>

          <button className="btn btn-primary" onClick={onRestart}>

            Voltar

          </button>

        </div>

      </section>

    )

  }



  return (

    <section className="finish-page">

      <div className="fim-screen">

        <div className="fim-check">✓</div>

        <div className="fim-msg">Voto registrado com sucesso</div>

        <p className="fim-sub">Obrigado por participar. Retire seu comprovante no botão abaixo.</p>



        {/* Mensagem informando que o comprovante foi aberto em nova aba */}

        <div className="receipt-notice">

          <span style={{ fontSize: '32px' }}>📄</span>

          <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--fg-muted)' }}>

            Comprovante de votação aberto em nova aba para impressão.

          </p>

        </div>



        {downloading && (

          <div className="download-status downloading">

            <span className="spinner-sm" /> Abrindo comprovante...

          </div>

        )}



        <div className="row-buttons">

          <button 

            className="btn btn-primary" 

            onClick={onRestart}

            disabled={downloading}

            style={downloading ? { opacity: 0.6, cursor: 'not-allowed' } : {}}

          >

            {downloading ? 'Abrindo...' : 'Confirmar'}

          </button>

        </div>

      </div>

    </section>

  )

}



export default FinishPage


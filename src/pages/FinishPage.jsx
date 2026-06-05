function FinishPage({ receipt, onRestart }) {
  if (!receipt) {
    return <div className="status-message">Nenhum recebimento disponível.</div>
  }

  return (
    <section className="finish-page">
      <div className="fim-screen">
        <div className="fim-fim">FIM</div>
        <div className="fim-msg">Voto registrado com sucesso</div>
        <p className="fim-sub">Obrigado por votar. Retire seu comprovante e libere a urna para o próximo eleitor.</p>
        <div className="receipt">
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
            <div className="row"><span>Nullifier</span><strong>{receipt.nullifiers.join(', ')}</strong></div>
          )}
          <div className="row"><span>Protocolo</span><strong>{receipt.protocol}</strong></div>
        </div>
        <div className="row-buttons">
          <button className="btn btn-ghost" onClick={() => window.print()}>
            Imprimir comprovante
          </button>
          <button className="btn btn-primary" onClick={onRestart}>
            Confirmar
          </button>
        </div>
      </div>
    </section>
  )
}

export default FinishPage

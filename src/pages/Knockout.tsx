export function Knockout() {
  return (
    <>
      <h1>Mata-mata</h1>
      <div className="card">
        <p>Chave interativa do mata-mata. No MVP, esta tela pode ser preenchida manualmente apos a fase de grupos.</p>
        <div className="grid">
          <div className="card"><strong>32 avos</strong><p>Vencedor Grupo A x Melhor terceiro</p></div>
          <div className="card"><strong>Oitavas</strong><p>Vencedor confronto 1 x Vencedor confronto 2</p></div>
          <div className="card"><strong>Quartas</strong><p>Vencedores avancam automaticamente</p></div>
          <div className="card"><strong>Final</strong><p>Escolha seu campeao</p></div>
        </div>
      </div>
    </>
  );
}

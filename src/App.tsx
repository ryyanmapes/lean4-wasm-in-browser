import './App.css'

const games = [
  {
    title: 'The Natural Numbers Game',
    eyebrow: 'Vanilla NNG4',
    description:
      'Learn Lean by proving the foundations of arithmetic in the original tactic-based game.',
    href: '/lean4game/index.html#/g/local/NNG4',
    action: 'Play NNG4',
    variant: 'classic',
  },
  {
    title: 'Visual Natural Numbers Game',
    eyebrow: 'Visual Lean',
    description:
      'Build the same formally checked proofs by directly manipulating expressions and proof goals.',
    href: '/lean4game/index.html#/g/local/NNG4/visual',
    action: 'Play Visual Lean',
    variant: 'visual',
  },
  {
    title: 'Visual Capabilities Demo',
    eyebrow: 'Visual Test',
    description:
      'Explore Visual Lean interactions and proof mechanics in a focused demonstration world.',
    href: '/lean4game/index.html#/g/local/VisualTest/visual',
    action: 'Open Visual Test',
    variant: 'visual',
  },
] as const

function App() {
  return (
    <main className="release-shell">
      <section className="hero" aria-labelledby="site-title">
        <p className="kicker">Lean in your browser</p>
        <h1 id="site-title">The Natural Numbers Game</h1>
        <p className="intro">
          Choose how you want to play. Every version runs Lean locally in your
          browser, and every completed proof is checked by Lean.
        </p>
      </section>

      <section className="game-grid" aria-label="Choose a game">
        {games.map((game) => (
          <a className={`game-card ${game.variant}`} href={game.href} key={game.href}>
            <span className="game-eyebrow">{game.eyebrow}</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <span className="game-action">
              {game.action}
              <span aria-hidden="true">→</span>
            </span>
          </a>
        ))}
      </section>

      <p className="local-note">
        No account or hosted proof server is required. Your Lean session stays
        on this device.
      </p>
    </main>
  )
}

export default App

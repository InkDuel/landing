'use client';

export default function Home() {
  return (
    <main className="landing-container">
      <div className="mesh-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <header className="site-header">
        <div className="logo">
          Ink<span className="accent">Duel</span>
        </div>
        
        <nav className="nav-links">
          <a href="#como-funciona">El Loop</a>
          <a href="#feedback">Entrenamiento</a>
          <a href="#rangos">Rangos</a>
        </nav>

        <button className="cta-button primary">
          <span>Unirse a la beta</span>
        </button>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            DEJA DE <br/>
            ESCRIBIR <br/>
            <span className="text-stroke">SOLO.</span>
          </h1>
          <p className="hero-subtitle">
            Escribir deja de ser algo solitario y se convierte en un entrenamiento definitivo. Entrás, competís, mejorás.
          </p>
          <div className="hero-actions">
            <button className="cta-button large">Iniciar Combate</button>
            <div className="store-buttons">
              <a href="#" className="store-btn">
                <div className="s-icon"></div>
                <div className="s-text">
                  <span className="s-small">Próximamente en</span>
                  <span className="s-large">App Store</span>
                </div>
              </a>
              <a href="#" className="store-btn">
                <div className="s-icon">▶</div>
                <div className="s-text">
                  <span className="s-small">Próximamente en</span>
                  <span className="s-large">Google Play</span>
                </div>
              </a>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card c-1">
            <span className="ink-icon">✦</span>
            <h4>Prompt Generado</h4>
            <p>"Una ciudad donde el sol nunca se pone..."</p>
          </div>
          <div className="floating-card c-2">
            <div className="timer-ring">04:59</div>
            <h4>Escribiendo...</h4>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bento-loop">
        <div className="bento-intro">
          <h2>El Loop Adictivo</h2>
          <p>Un sistema diseñado para empujarte al siguiente nivel mediante desafío constante.</p>
        </div>
        <div className="bento-grid">
          <div className="bento-card b-wide gradient-aura">
            <div className="bento-num">01</div>
            <h3>Entrás a un duelo.</h3>
            <p>Emparejamiento instantáneo con un escritor de tu nivel o con nuestra implacable IA.</p>
          </div>
          <div className="bento-card b-tall">
            <div className="bento-num">02</div>
            <h3>Recibís un prompt.</h3>
            <p>La inspiración instantánea provista por nuestra red neuronal. No hay tiempo para el bloqueo del escritor.</p>
            <div className="prompt-visual"></div>
          </div>
          <div className="bento-card">
            <div className="bento-num">03</div>
            <h3>Pocos minutos.</h3>
            <p>Escribí bajo presión real. Destilá tu historia.</p>
          </div>
          <div className="bento-card">
            <div className="bento-num">04</div>
            <h3>El rival responde.</h3>
            <p>Del otro lado, otro competidor hace lo mismo.</p>
          </div>
          <div className="bento-card b-wide dark-accent">
            <div className="glow-orb"></div>
            <h3>El Veredicto IA</h3>
            <p>Cuando termina el tiempo, ambos relatos son evaluados implacablemente por creatividad, gramática y cierre.</p>
          </div>
        </div>
      </section>

      <section id="feedback" className="core-thesis">
        <h2>
           Pero el verdadero objetivo no es ganar. <br/>
           <span className="highlight-thesis">Es mejorar.</span>
        </h2>
        <div className="features-container">
           <div className="f-item">
             <h4>Feedback Accionable</h4>
             <p>Después de cada duelo, recibís devoluciones claras: qué funcionó, qué no, y cómo escribir mejor la próxima vez.</p>
           </div>
           <div className="f-item">
             <h4>Aprendés Escribiendo</h4>
             <p>No hay teoría innecesaria. El sistema te enfrenta constantemente a nuevos desafíos y estilos inesperados.</p>
           </div>
        </div>
      </section>

      <section id="rangos" className="progression-path">
        <div className="progression-text">
          <h2>Y podés verlo.</h2>
          <p>A medida que jugás refinás tu creatividad y tu forma de contar historias. Subís de rango, acumulás puntos y te medís contra otros escritores evolucionando.</p>
        </div>
        
        <div className="ranks-timeline">
           <div className="line-connector"></div>
           
           <div className="rank-node r-aprendiz">
             <div className="r-icon"></div>
             <div className="r-label">Aprendiz</div>
           </div>
           <div className="rank-node r-escriba">
             <div className="r-icon"></div>
             <div className="r-label">Escriba</div>
           </div>
           <div className="rank-node r-narrador">
             <div className="r-icon"></div>
             <div className="r-label">Narrador</div>
           </div>
           <div className="rank-node r-duellista">
             <div className="r-icon"></div>
             <div className="r-label">Duellista</div>
           </div>
           <div className="rank-node r-maestro">
             <div className="r-icon"></div>
             <div className="r-label">Maestro de Tinta</div>
           </div>
           <div className="rank-node r-leyenda">
             <div className="r-icon"></div>
             <div className="r-label">Leyenda</div>
           </div>
        </div>
      </section>

      <section className="hero-footer-cta">
        <h2 className="massive-cta">
          INKDUEL <br/> NO ES <br/> UNA APP <br/> PARA <br/> ESCRIBIR <span className="accent">MÁS.</span>
        </h2>
        <p>Es una app para escribir mejor. Un espacio donde cada duelo te empuja a un nivel más alto.</p>
        <button className="cta-button primary glow">Unirse a la Alpha</button>
      </section>
      
      <footer className="footer-bar">
         <span>© {new Date().getFullYear()} INKDUEL. Acepta el duelo.</span>
      </footer>
    </main>
  );
}

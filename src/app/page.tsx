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
          <a href="#entrenamiento">Entrenamiento</a>
          <a href="#rangos">Rangos</a>
        </nav>

        <button className="cta-button primary">
          <span>Unirse a la beta</span>
        </button>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            ESCRIBE. <br/>
            COMPITE.<br/>
            <span className="text-stroke">MEJORA.</span>
          </h1>
          <p className="hero-subtitle">
            La arena competitiva donde escribir deja de ser algo solitario. Un sistema diseñado para forzarte a crecer bajo presión real, contra rivales de tu nivel.
          </p>
          <div className="hero-actions">
            <button className="cta-button large">Unirse a la beta</button>
            <div className="store-buttons">
              <div className="store-btn">
                <div className="s-icon"></div>
                <div className="s-text">
                  <span className="s-small">Próximamente en</span>
                  <span className="s-large">App Store</span>
                </div>
              </div>
              <div className="store-btn">
                <div className="s-icon">▶</div>
                <div className="s-text">
                  <span className="s-small">Próximamente en</span>
                  <span className="s-large">Google Play</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="floating-card product-card prompt-card">
            <span className="ink-icon">✦</span>
            <h4>Prompt Generado</h4>
            <p className="ui-text">"Escribe la historia de una ciudad que ha olvidado su propio nombre..."</p>
          </div>
          <div className="floating-card product-card timer-card">
            <div className="timer-ring">04:59</div>
            <h4>Escribiendo...</h4>
            <div className="pulse-bar"></div>
          </div>
          <div className="floating-card product-card verdict-card">
            <h4>Victoria</h4>
            <div className="score-row"><span className="score-label">Creatividad</span><div className="s-bar"><div className="fill w-90"></div></div><span className="score-num">90</span></div>
            <div className="score-row"><span className="score-label">Gramática</span><div className="s-bar"><div className="fill w-85"></div></div><span className="score-num">85</span></div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bento-loop">
        <div className="bento-intro">
          <h2>El Loop de Combate</h2>
          <p>Un ciclo rápido y exigente diseñado para la retención y la mejora constante del escritor.</p>
        </div>
        <div className="bento-grid">
          <div className="bento-card b-wide gradient-aura">
            <div className="bento-num">01</div>
            <h3>El Encuentro</h3>
            <p>Emparejamiento instantáneo con un escritor de tu nivel (ELO) o contra nuestro bot implacable.</p>
          </div>
          <div className="bento-card b-tall">
            <div className="bento-num">02</div>
            <h3>El Desafío</h3>
            <p>Un prompt dinámico. Sin tiempo para el bloqueo del escritor. Entregas todo lo que tienes en pocos minutos.</p>
          </div>
          <div className="bento-card">
            <div className="bento-num">03</div>
            <h3>Rivalidad Real</h3>
            <p>Del otro lado, la presión es simétrica. Tu oponente intenta dominar el mismo prompt.</p>
          </div>
          <div className="bento-card">
            <div className="bento-num">04</div>
            <h3>El Veredicto</h3>
            <p>Ambos textos son analizados al instante por nuestro Motor de Jueces. Solo uno gana.</p>
          </div>
          <div className="bento-card b-wide dark-accent">
            <div className="glow-orb"></div>
            <h3>Feedback Instantáneo</h3>
            <p>No esperamos días. En milisegundos recibes un desglose exacto de tus aciertos y errores: estructura, vocabulario, y cierre.</p>
          </div>
        </div>
      </section>

      <section id="entrenamiento" className="core-thesis">
        <h2>
           Tú no compites para ganar. <br/>
           <span className="highlight-thesis">Compites para mejorar.</span>
        </h2>
        <div className="features-container">
           <div className="f-item workout-card">
             <h4>Gimnasio del Escritor</h4>
             <p>InkDuel te arranca tu zona de confort. Descubres nuevos estilos, géneros y formatos empujado por la urgencia de vencer al reloj.</p>
             <div className="ui-simulation">
               <div className="ui-badge">Adaptabilidad +15 XP</div>
               <div className="ui-badge">Vocabulario +10 XP</div>
             </div>
           </div>
           <div className="f-item stats-card">
             <h4>Resultados Visibles</h4>
             <p>El feedback no es abstracto. El sistema evalúa mecánicas puntuales de desarrollo para acelerar tu aprendizaje.</p>
             <div className="ui-simulation vertical">
                <div className="score-row loose"><span className="score-label">Ritmo</span><div className="s-bar"><div className="fill w-80"></div></div></div>
                <div className="score-row loose"><span className="score-label">Tensión</span><div className="s-bar"><div className="fill w-95 amber"></div></div></div>
             </div>
           </div>
        </div>
      </section>

      <section id="rangos" className="progression-path">
        <div className="progression-text">
           <h2>Progreso que se siente.</h2>
           <p>Escalar aquí no depende de jugar mucho tiempo, depende de escribir mejor. La maestría cuesta, y el estatus se gana.</p>
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
           <div className="rank-node r-duellista focused">
             <div className="r-icon"></div>
             <div className="r-label glow-text">Duellista</div>
             <div className="focused-indicator">Tu ELO actual</div>
           </div>
           <div className="rank-node r-maestro dormant">
             <div className="r-icon"></div>
             <div className="r-label">Maestro de Tinta</div>
           </div>
           <div className="rank-node r-leyenda dormant">
             <div className="r-icon"></div>
             <div className="r-label">Leyenda</div>
           </div>
        </div>
      </section>

      <section className="hero-footer-cta">
        <h2 className="massive-cta">
          CADA DUELO <br/> TE HACE MEJOR <br/> <span className="accent">ESCRITOR.</span>
        </h2>
        <p>Entra en la arena. Pon a prueba tus palabras. Sube de rango.</p>
        <button className="cta-button primary glow large-mega">Unirse a la beta</button>
      </section>
      
      <footer className="footer-bar">
         <span>© {new Date().getFullYear()} INKDUEL. Acepta el duelo.</span>
      </footer>
    </main>
  );
}

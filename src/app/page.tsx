'use client';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-between px-4 py-8">
      {/* Hero */}
      <section className="text-center mt-16">
        <h1 className="text-5xl md:text-6xl font-bold mb-4">InkDuel</h1>
        <p className="text-xl md:text-2xl mb-8">Donde los relatos se enfrentan ⚔️</p>
        <button className="bg-white text-black px-6 py-3 rounded-2xl text-lg font-medium hover:bg-gray-200 transition">
          Unite a la beta cerrada
        </button>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-3xl text-center mt-24">
        <h2 className="text-3xl font-semibold mb-4">¿Cómo funciona?</h2>
        <p className="text-lg mb-8">
          Dos escritores. Un tema. Un tiempo límite. El público elige al ganador. InkDuel convierte la escritura en un deporte de creatividad.
        </p>
        <button className="underline hover:text-gray-300">Ver ejemplo de duelo</button>
      </section>

      {/* CTA final */}
      <section className="mt-32 text-center">
        <h3 className="text-2xl font-semibold mb-4">¿Querés ser de los primeros en probarlo?</h3>
        <form className="flex flex-col sm:flex-row gap-4 justify-center">
          <input
            type="email"
            placeholder="Tu email"
            className="px-4 py-2 rounded-md text-black w-64"
          />
          <button
            type="submit"
            className="bg-white text-black px-6 py-2 rounded-md font-medium hover:bg-gray-200"
          >
            ¡Quiero entrar!
          </button>
        </form>
        <p className="text-xs mt-2 text-gray-400">No hacemos spam, prometido.</p>
      </section>

      {/* Footer */}
      <footer className="mt-32 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} InkDuel. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}

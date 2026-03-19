import React from "react";

export default function GamePage({ game, children }) {
  return (
    <div className="game-layout">
      
      {/* Zone 2/3 : le jeu */}
      <section className="game-layout__main">
        {game}
      </section>

      {/* Zone 1/3 : le chat */}
      <aside className="game-layout__chat">
        {children}
      </aside>

    </div>
  );
}
const SYMBOLS = ["∑", "π", "√", "∫", "%", "÷", "×", "∞", "Δ", "θ", "α", "β", "φ", "≠", "≈"];

export default function MathBackground() {
  return (
    <div className="math-bg" aria-hidden="true">
      {SYMBOLS.map((sym, i) => {
        const delay = (i * 2.3) % 15;
        const duration = 10 + (i * 3.7) % 12;
        const left = (i * 6.5 + 3) % 95;
        const size = 1.4 + (i * 0.3) % 2;
        return (
          <span
            key={i}
            className="math-symbol"
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              fontSize: `${size}rem`,
            }}
          >
            {sym}
          </span>
        );
      })}
    </div>
  );
}

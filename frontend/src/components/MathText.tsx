import { useEffect, useRef } from "react";
import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text?: string | null;
  className?: string;
}

/** Render delimited LaTeX without interpreting source text as HTML. */
export function MathText({ text, className = "" }: MathTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const content = text ?? "";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Rebuild on every update, including StrictMode re-runs and question changes.
    container.replaceChildren(document.createTextNode(content));
    renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "$", right: "$", display: false },
      ],
      throwOnError: false,
      trust: false,
    });
  }, [content]);

  return <span ref={containerRef} className={`math-text ${className}`.trim()} />;
}

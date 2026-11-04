import katex from "katex";
import "katex/dist/katex.min.css";

/** Render only delimited math; ordinary text remains escaped by React. */
export function MathText({ text }: { text: string }) {
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$(?!\$)(?:\\.|[^$\n])+?(?<!\\)\$)/g);
  return <span className="math-text">{parts.map((part, index) => {
    const display = part.startsWith("$$") || part.startsWith("\\[");
    const inline = part.startsWith("\\(") || (part.startsWith("$") && part.endsWith("$"));
    if (!display && !inline) return <span key={index}>{part}</span>;
    const source = part.slice(display || part.startsWith("\\(") ? 2 : 1, display || part.startsWith("\\(") ? -2 : -1);
    try {
      const html = katex.renderToString(source, { displayMode: display, throwOnError: true, trust: false, strict: "ignore", maxExpand: 1000 });
      return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <span key={index} title="公式暂无法排版">{part}</span>;
    }
  })}</span>;
}

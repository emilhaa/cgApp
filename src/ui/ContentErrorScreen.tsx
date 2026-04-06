import type { ContentIssue } from "@/src/types/game";

type ContentErrorScreenProps = {
  errors: ContentIssue[];
};

export function ContentErrorScreen({ errors }: ContentErrorScreenProps) {
  return (
    <section className="error-card">
      <p className="eyebrow">Content Validation Failed</p>
      <h1 className="error-title">Obsah hry je poškodený</h1>
      <p className="error-copy">
        Aplikácia sa zastavila skôr, než by sa hráč dostal do nefunkčného stavu. Skontrolujte JSON content
        a opravte blokujúce chyby.
      </p>
      <ul className="error-list">
        {errors.map((error) => (
          <li key={`${error.path}-${error.message}`}>
            <strong>{error.path}</strong>: {error.message}
          </li>
        ))}
      </ul>
      <p className="error-hint">
        Source of truth: <code>src/content/game.sk.json</code>
      </p>
    </section>
  );
}

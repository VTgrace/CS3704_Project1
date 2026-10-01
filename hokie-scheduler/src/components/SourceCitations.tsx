import { ExternalLink } from "lucide-react";
import type { SourceCitation } from "../types";
const labels = {
  "vt-requirements": "VT Degree Requirements",
  "vt-department": "VT Department",
  "vt-catalog": "VT Catalog",
  "vt-timetable": "VT Timetable",
  ratemyprofessors: "Rate My Professors",
  reddit: "Reddit",
};
export function SourceCitations({
  citations,
}: {
  citations: SourceCitation[];
}) {
  if (!citations.length) return null;
  return (
    <details className="source-citations">
      <summary>
        {citations.length} cited {citations.length === 1 ? "source" : "sources"}
      </summary>
      <ol>
        {citations.map((citation) => (
          <li key={citation.id}>
            <a href={citation.url} target="_blank" rel="noopener noreferrer">
              {citation.title}
              <ExternalLink size={12} />
            </a>
            <small>
              {labels[citation.source]} · Retrieved{" "}
              {new Date(citation.retrievedAt).toLocaleDateString()}
            </small>
            <p>{citation.excerpt}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

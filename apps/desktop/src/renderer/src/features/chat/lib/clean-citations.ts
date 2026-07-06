/**
 * Citation cleanup for assistant markdown (per markdown-templates-spec):
 * - `[ID:document.pdf]` internal tags become numbered citations `[1]`, `[2]`
 *   (stable per unique id, in order of first appearance)
 * - dangling `filecite` / `turnXfileY` artifacts are removed
 */
const REF_REGEX = /\[ID:([^\]]+)\](,\s*|\.\s*|\s*)/g;
const FILECITE_REGEX = /\S*(?:filecite|turn\d+file\d+)\S*/gu;

export type CleanedMarkdown = {
  text: string;
  /** Unique citation ids in numbering order; index 0 renders as [1]. */
  citationIds: string[];
};

export function cleanCitations(markdown: string): CleanedMarkdown {
  const citationIds: string[] = [];
  const numberFor = new Map<string, number>();

  const text = markdown
    .replace(REF_REGEX, (_match, id: string, trailing: string) => {
      let number = numberFor.get(id);
      if (number === undefined) {
        number = numberFor.size + 1;
        numberFor.set(id, number);
        citationIds.push(id);
      }
      const separator = trailing.trim() === "." ? ". " : " ";
      return `[${number}]${separator}`;
    })
    .replace(FILECITE_REGEX, "");

  return { text, citationIds };
}

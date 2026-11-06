import type { AffiliationAuthorLink } from "../../../../server/affiliation-links";
export default function AffiliationLinksTable({
  authors,
}: {
  authors: AffiliationAuthorLink[];
}) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered align-middle small">
        <thead>
          <tr>
            <th scope="col">Author ID</th>
            <th scope="col">Author name</th>
            <th scope="col">Article IDs</th>
          </tr>
        </thead>
        <tbody>
          {authors.map((author) => (
            <tr key={author.author_id}>
              <td>{author.author_id}</td>
              <td>{author.name || "Unnamed author"}</td>
              <td>
                {author.article_ids.length
                  ? author.article_ids.join(", ")
                  : "No linked articles"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

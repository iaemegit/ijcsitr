import { Link } from "../../lib/navigation";
import "./home-indexing.css";

const logos = [
  ["academia.png", "Academia"],
  ["google-scholar.png", "Google Scholar"],
  ["crossref.png", "Crossref"],
  ["advanced-sciences-index.png", "Advanced Sciences Index"],
  ["base.gif", "BASE"],
  ["cabells.jpg", "Cabell’s Directories"],
  ["citeseerx.png", "CiteSeerX"],
  ["drji.png", "Directory of Research Journals Indexing"],
  ["index-copernicus.jpg", "Index Copernicus International"],
  ["isedn.jpg", "Independent Search Engine and Directory Network"],
  ["issuu.png", "Issuu"],
  ["mendeley.png", "Mendeley"],
  ["refseek.png", "RefSeek"],
  ["researcherid.png", "ResearcherID"],
  ["researchgate.png", "ResearchGate"],
  ["scirus.png", "Scirus"],
  ["scribd.gif", "Scribd"],
  ["semantic-scholar.png", "Semantic Scholar"],
  ["wikicfp.png", "WikiCFP"],
  ["worldcat.png", "WorldCat"],
  ["zenodo.png", "Zenodo"],
];

export default function HomeIndexing() {
  return (
    <section className="home-indexing" aria-labelledby="home-indexing-title">
      <div className="container">
        <h2 id="home-indexing-title">Indexing</h2>
        <ul className="home-indexing-grid">
          {logos.map(([file, name]) => (
            <li key={file}>
              <img
                src={`/images/indexing/${file}`}
                alt={name}
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
        <div className="text-center">
          <Link to="/submit" className="jt-primary-btn">
            Submit Paper for Publication
          </Link>
        </div>
      </div>
    </section>
  );
}

import { ExternalLink } from "lucide-react";
const authorities = [
  [
    "CIPA",
    "Company registration and intellectual property",
    "https://www.cipa.co.bw/",
    "info@cipa.co.bw",
  ],
  [
    "BURS",
    "Tax registration and clearance",
    "https://www.burs.org.bw/index.php/contact-burs-offices",
    null,
  ],
  [
    "NBFIRA",
    "Non-bank financial services regulation",
    "https://www.nbfira.org.bw/contact-us/",
    "info@nbfira.org.bw",
  ],
];
export default function SupportInformation() {
  return (
    <section className="sc-report-card sc-support-information">
      <h2>Support & official contacts</h2>
      <p>
        For portal faults, open a support conversation and include the time,
        affected page and any request reference shown in the error. Do not send
        passwords or identity documents in chat.
      </p>
      <dl>
        <dt>Live consultant hours</dt>
        <dd>Monday–Friday, 09:00–16:00 CAT, excluding published holidays.</dd>
        <dt>Outside live hours</dt>
        <dd>
          Leave a message. It stays in your account for the next available
          consultant.
        </dd>
        <dt>Fault turnaround</dt>
        <dd>
          Proposed service targets: acknowledge within one working day; assess a
          service outage within four working hours; provide a resolution or
          progress update within two working days. These targets require
          approval by the hosting/support owner and are not a contracted hosting
          guarantee.
        </dd>
      </dl>
      <p>
        CEDA general assistance: <a href="tel:+2673170895">+267 317 0895</a> ·{" "}
        <a href="mailto:feedback@ceda.co.bw">feedback@ceda.co.bw</a>.{" "}
        <a
          href="https://www.ceda.co.bw/index.php/help-center"
          target="_blank"
          rel="noreferrer"
        >
          Official help centre
        </a>
        .
      </p>
      <h3>Relevant authorities</h3>
      <p className="sc-fine">
        Requirements depend on your activity. These contacts do not imply that
        every applicant requires approval from every authority.
      </p>
      <div className="sc-authorities">
        {authorities.map(([name, purpose, url, email]) => (
          <article key={name}>
            <h4>{name}</h4>
            <p>{purpose}</p>
            <a href={url} target="_blank" rel="noreferrer">
              Official contact directory <ExternalLink size={12} />
            </a>
            {email && <a href={"mailto:" + email}>{email}</a>}
          </article>
        ))}
      </div>
      <small>
        Official sources checked 23 November 2026. CIPA contact: WIPO country
        directory; other contacts: each authority’s official site.
      </small>
    </section>
  );
}

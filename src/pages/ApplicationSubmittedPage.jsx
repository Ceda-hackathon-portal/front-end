import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { applicationsApi } from "../services/applicationApi.js";
import { usePortal } from "../context/PortalContext.jsx";
import { displayDateTime } from "../utils/portal.js";

export default function ApplicationSubmittedPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshApplications } = usePortal();
  const [submission, setSubmission] = useState(null);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    let active = true;
    applicationsApi.read(id).then((application) => {
      if (!active) return;
      if (application.stage !== "SUBMITTED" || !application.latestSubmission?.reference || !application.latestSubmission?.submittedAt) {
        navigate("/workspace/applications", { replace: true });
        return;
      }
      setSubmission(application.latestSubmission);
      void refreshApplications();
    }).catch((failure) => {
      if (!active) return;
      if (failure.status === 401 || failure.status === 404) {
        navigate("/workspace/applications", { replace: true });
        return;
      }
      setError(failure.message || "The submission could not be checked. Please try again.");
    });
    return () => { active = false; };
  }, [id, navigate]);

  useEffect(() => {
    if (!submission) return undefined;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, 5 - Math.floor((Date.now() - started) / 1000));
      setSeconds(remaining);
      if (remaining === 0) navigate("/workspace/applications", { replace: true });
    }, 200);
    return () => window.clearInterval(timer);
  }, [submission, navigate]);

  if (error) return (
    <section className="ap-page ap-panel ap-submission-confirmation" role="alert">
      <h1>Submission confirmation unavailable</h1>
      <p>{error}</p>
      <Link className="ap-button ap-button-primary" to="/workspace/applications">My Applications</Link>
    </section>
  );
  if (!submission) return <section className="ap-page ap-panel ap-submission-confirmation" role="status">Checking your submission with CEDA…</section>;

  return (
    <section className="ap-page ap-panel ap-submission-confirmation" aria-labelledby="submission-heading">
      <CheckCircle2 className="ap-submission-confirmation-icon" size={54} strokeWidth={1.5} aria-hidden="true" />
      <h1 id="submission-heading">Application Submitted Successfully</h1>
      <p>Your application has been successfully submitted to CEDA.</p>
      <dl className="ap-submission-confirmation-details">
        <div><dt>Submission reference</dt><dd>{submission.reference}</dd></div>
        {submission.fields?.title && <div><dt>Application</dt><dd>{submission.fields.title}</dd></div>}
        <div><dt>Submitted</dt><dd>{displayDateTime(submission.submittedAt)}</dd></div>
      </dl>
      <p>You can view your application under My Applications.</p>
      <div className="ap-submission-confirmation-actions">
        <Link className="ap-button ap-button-primary" to="/workspace/applications">Back to My Applications <ArrowRight size={16} /></Link>
        <Link className="ap-button ap-button-secondary" to={`/workspace/ideas/${encodeURIComponent(id)}`}>View Submitted Application</Link>
      </div>
      <p className="ap-muted" role="status">Redirecting to My Applications in {seconds} seconds...</p>
    </section>
  );
}

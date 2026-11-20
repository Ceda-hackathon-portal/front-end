import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Search, LayoutDashboard, ClipboardCheck, BookOpen, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { roleHome } from "../../utils/portal";

const quickActions = [
  { label: "Submit an idea", to: "/workspace/new", secure: true },
  { label: "My submissions", to: "/workspace", secure: true },
  { label: "Track your idea", to: "/workspace", secure: true },
];
const services = [
  { title: "Submit an idea", description: "Start a submission.", to: "/workspace/new", icon: FileText, secure: true },
  { title: "My submissions", description: "Drafts and progress.", to: "/workspace", icon: Search, secure: true },
  { title: "Programmes", description: "Explore innovation themes.", to: "/challenges", icon: Users },
  { title: "Reviews", description: "Evaluation workspace.", to: "/login", icon: ClipboardCheck },
  { title: "Reports", description: "Programme overview.", to: "/reports", icon: LayoutDashboard, secure: true },
  { title: "Guidelines", description: "Before you submit.", to: "/how-it-works", icon: BookOpen },
];
const serviceColumns = [services.slice(0, 3), services.slice(3, 6)];
export default function HomePageSections() {
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  function follow(event, target, secure) {
    if (!secure) return;
    event.preventDefault();
    const destination = user && user.role !== "submitter" && target.startsWith("/workspace") ? roleHome(user.role) : target;
    if (requireAuth(destination)) navigate(destination);
  }
  return (
    <>
      <div style={{ background: "#ffffff" }}>
        <section className="home-sections-block">
          <div className="home-sections-shell">
            <div className="home-section-label">QUICK ACTIONS</div>
            {quickActions.map(({ label, to, secure }) => (
              <Link key={label} to={to} className="home-quick-link" onClick={(event) => follow(event, to, secure)}>
                <span className="home-quick-text">{label}</span><ArrowRight className="home-quick-arrow" size={22} />
              </Link>
            ))}
          </div>
        </section>
        <section className="home-stats-section" role="img" aria-label="CEDA innovation: human and digital hands meeting at a glowing brain" />
        <section className="home-sections-block home-services-section">
          <div className="home-sections-shell">
            <div className="home-section-label">SERVICES</div>
            <h2 className="home-section-heading">Your CEDA portal.</h2>
            <div className="home-services-columns">
              {serviceColumns.map((column, index) => (
                <div key={index} className="home-services-column">
                  {column.map(({ title, description, to, icon: Icon, secure }) => (
                    <Link key={title} to={to} className="home-service-row" onClick={(event) => follow(event, to, secure)}>
                      <div className="home-service-icon-box"><Icon size={20} /></div>
                      <div className="home-service-copy"><div className="home-service-title">{title}</div><div className="home-service-description">{description}</div></div>
                      <ArrowRight className="home-service-arrow" size={16} />
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="home-sections-block home-steps-section">
          <div className="home-sections-shell">
            <div className="home-section-label">GET STARTED</div>
            <div className="home-steps-row">
              {[["01", "Sign in"], ["02", "Submit"], ["03", "Track"]].map(([number, title]) => <div key={number} className="home-step-item"><span className="home-step-number">{number}</span><div className="home-step-title">{title}</div></div>)}
            </div>
          </div>
        </section>
      </div>

    </>
  );
}

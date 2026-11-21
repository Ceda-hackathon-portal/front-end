import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Home,
  Layers,
  LogOut,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useStaffWorkflow } from "../../context/StaffWorkflowContext";
import { roles } from "../../data/portal";
import "../../styles/staff.css";
import "../../styles/staff-shell.css";
import "../../styles/staff-workflow.css";

const operational = [
  "eligibility-officer",
  "evaluator",
  "adjudicator",
  "administrator",
];
const navigation = [
  { label: "Overview", to: "/admin", icon: Home, end: true },
  {
    label: "Applications",
    to: "/admin/applications",
    icon: FileText,
    roles: operational,
  },
  {
    label: "Screening",
    to: "/admin/screening",
    icon: ShieldCheck,
    roles: ["eligibility-officer", "administrator"],
  },
  {
    label: "Reviews",
    to: "/admin/reviews",
    icon: ClipboardCheck,
    roles: ["evaluator", "administrator"],
  },
  {
    label: "Decisions",
    to: "/admin/decisions",
    icon: Scale,
    roles: ["adjudicator", "administrator"],
  },
  {
    label: "Programmes",
    to: "/admin/programmes",
    icon: Layers,
    roles: ["administrator"],
  },
  {
    label: "Insights",
    to: "/admin/insights",
    icon: BarChart3,
    roles: ["administrator", "management"],
  },
  {
    label: "System",
    to: "/admin/system",
    icon: SlidersHorizontal,
    roles: ["system-administrator"],
  },
];

function heroFor(path) {
  if (/^\/admin\/applications\//.test(path))
    return {
      title: "Application record",
      image: "staff-documents.jpg",
      section: "Applications",
    };
  if (/^\/admin\/programmes\/[^/]+\/applications/.test(path))
    return {
      title: "Reviewer assignments",
      image: "staff-assignments.jpg",
      section: "Programmes",
    };
  if (/^\/admin\/programmes\//.test(path))
    return {
      title: "Programme settings",
      image: "staff-settings.jpg",
      section: "Programmes",
    };
  return (
    {
      "/admin": {
        title: "Staff workspace",
        image: "Carousel2.jpg",
        position: "center 60%",
        section: "Overview",
      },
      "/admin/applications": {
        title: "Applications",
        image: "staff-applications.jpg",
        section: "Applications",
      },
      "/admin/screening": {
        title: "Screening & eligibility",
        image: "staff-screening.jpg",
        section: "Screening",
      },
      "/admin/reviews": {
        title: "Review queue",
        image: "staff-review.jpg",
        section: "Reviews",
      },
      "/admin/decisions": {
        title: "Decisions",
        image: "staff-decisions.jpg",
        section: "Decisions",
      },
      "/admin/programmes": {
        title: "Programmes",
        image: "staff-programmes.jpg",
        section: "Programmes",
      },
      "/admin/insights": {
        title: "Programme insights",
        image: "staff-insights.jpg",
        section: "Insights",
      },
      "/admin/system": {
        title: "System workspace",
        image: "staff-system.jpg",
        section: "System",
      },
    }[path] || {
      title: "Staff workspace",
      image: "staff-overview.jpg",
      section: "Overview",
    }
  );
}

export default function StaffLayout() {
  const { staffUser, staffLogout } = useAuth();
  const { storageWarning } = useStaffWorkflow();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hero = heroFor(pathname);
  const role = roles.find((item) => item.id === staffUser.role);
  const links = navigation.filter(
    (item) => !item.roles || item.roles.includes(staffUser.role),
  );
  return (
    <div className="st-shell st-workspace">
      <a className="skip-link" href="#staff-main">
        Skip to content
      </a>
      <aside className="st-rail">
        <nav aria-label="Staff navigation">
          {links.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                "st-nav-link" + (isActive ? " is-active" : "")
              }
            >
              <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <span className="st-rail-caption">
          CEDA
          <br />
          Staff
        </span>
      </aside>
      <div className="st-stage">
        <div className="st-hero">
          <img
            className="st-hero-image"
            src={"/images/" + hero.image}
            style={hero.position ? { objectPosition: hero.position } : undefined}
            alt=""
            fetchPriority="high"
          />
          <header className="st-topbar">
            <Link to="/admin" className="st-hero-brand">
              <img
                src="/images/ceda-logo.png"
                alt="CEDA"
                width="83"
                height="51"
              />
              <span>Innovation portal</span>
            </Link>
            <details className="st-account">
              <summary aria-label="Staff account">
                <span className="st-avatar" aria-hidden="true">
                  {staffUser.name
                    .replace("Demo ", "")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="st-account-name">{role?.label}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="st-account-menu">
                <span>{staffUser.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    staffLogout();
                    navigate("/staff?redirect=%2Fadmin");
                  }}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </details>
          </header>
          <div className="st-hero-copy">
            <span>
              {role?.label} <span aria-hidden="true">/</span> {hero.section}
            </span>
            <h1>{hero.title}</h1>
            <p>
              {staffUser.demo
                ? "Local workspace · Changes are saved on this device."
                : "CEDA staff workspace"}
            </p>
          </div>
        </div>
        <main className="st-main" id="staff-main" tabIndex={-1}>
          {storageWarning && (
            <p className="st-alert" role="alert">
              {storageWarning}
            </p>
          )}
          <Outlet />
          <footer className="st-workspace-footer">
            <span>CEDA Innovation Portal</span>
            <span>
              Local workspace. Account security, shared storage and delivery
              require the connected services.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

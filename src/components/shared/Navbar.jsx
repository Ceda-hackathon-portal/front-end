// Owner: Dev 1  |  Component: Navbar
// Inspired by Cubex.com - floating pill nav + chat bubble

import { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Search, X, Menu, LogOut, ChevronDown, User, LayoutDashboard } from "lucide-react";
import ChatBubble from "./PortalAssistant";
import { roleHome } from "../../utils/portal";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar({ showHint = false, onChatClose, hideChat = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [open, setOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user, logout, requireAuth } = useAuth();
  const actionTarget = user && user.role !== "submitter" ? roleHome(user.role) : "/workspace/new";

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      setScrollProgress(Math.min(y / 180, 1));
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setOpen(false);
    setActiveDropdown(null);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setProfileOpen(false);
  };

  const getUserInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };
  const navBackgroundAlpha = 1 - scrollProgress * 0.78;
  const navBorderAlpha = 0.07 - scrollProgress * 0.03;
  const navShadowAlpha = 0.09 - scrollProgress * 0.04;
  const navBackground = `rgba(255,255,255,${navBackgroundAlpha.toFixed(2)})`;
  const navBorder = `1px solid rgba(0,0,0,${Math.max(navBorderAlpha, 0.03).toFixed(2)})`;
  const navShadow = scrolled
    ? `0 8px 32px rgba(0,0,0,${Math.max(navShadowAlpha + 0.02, 0.06).toFixed(2)}), 0 1px 4px rgba(0,0,0,0.05)`
    : `0 4px 24px rgba(0,0,0,${Math.max(navShadowAlpha, 0.05).toFixed(2)}), 0 1px 3px rgba(0,0,0,0.05)`;

  const navLinks = [
    { label: "Home", href: "/" },
    {
      label: "Services", href: "/services",
      children: [
        { label: "Submit an idea", href: "/workspace/new", secure: true },
        { label: "My submissions", href: "/workspace", secure: true },
        { label: "Programmes", href: "/challenges" },
      ],
    },
    { label: "Programmes", href: "/challenges" },
    {
      label: "Resources", href: "/how-it-works",
      children: [
        { label: "Submission guide", href: "/how-it-works" },
        { label: "Help", href: "/help" },
        { label: "Privacy", href: "/privacy" },
      ],
    },
  ];
  const mobileMenuLinks = [
    ["Home", "/"],
    ["Services", "/services"],
    ["Programmes", "/challenges"],
    ["Submission guide", "/how-it-works"],
    ["My workspace", roleHome(user?.role), true],
    ["Help", "/help"],
  ];


  return (
    <>
      <div
        style={{
          position: "fixed",
          top: scrolled ? 12 : 22,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: isMobile ? "clamp(320px, 74%, 720px)" : "calc(100% - 48px)",
          maxWidth: 930,
          transition: "top 0.3s ease, box-shadow 0.3s ease",
        }}
      >
        <nav
          className="ceda-navbar"
          aria-label="Main navigation"
          style={{
            position: "relative",
            background: navBackground,
            backdropFilter: "blur(18px) saturate(180%)",
            WebkitBackdropFilter: "blur(18px) saturate(180%)",
            borderRadius: isMobile ? 24 : 999,
            padding: isMobile ? "6px 12px" : "6px 18px",
            minHeight: isMobile ? 50 : 58,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: navShadow,
            border: navBorder,
            transition: "background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Link
            to="/"
            className="nav-brand"
            aria-label="CEDA home"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <img
              src="/images/ceda-logo.png"
              alt="CEDA"
              width="160"
              height="98"
              style={{ height: isMobile ? 30 : 36, width: "auto", display: "block", objectFit: "contain" }}
            />
          </Link>

          <div
            style={{
              display: isMobile ? "none" : "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ul
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {navLinks.map((link) => (
                <li
                  key={link.label}
                  style={{ position: "relative" }}
                >
                  {(() => {
                    const isExternal = link.href.startsWith("http");
                    const commonProps = {
                      onClick: (event) => {
                        if (link.children) {
                          event.preventDefault();
                          setActiveDropdown((prev) =>
                            prev === link.label ? null : link.label
                          );
                        } else if (link.secure && !requireAuth(link.href)) {
                          event.preventDefault();
                        }
                      },
                      onMouseEnter: (event) => {
                        event.currentTarget.style.background = "rgba(0,0,0,0.05)";
                        event.currentTarget.style.color = "#0B1F3A";
                      },
                      onMouseLeave: (event) => {
                        if (activeDropdown !== link.label) {
                          event.currentTarget.style.background = "transparent";
                          event.currentTarget.style.color = "#1a2e44";
                        }
                      },
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#1a2e44",
                        textDecoration: "none",
                        transition: "background 0.18s, color 0.18s",
                        background:
                          activeDropdown === link.label
                            ? "rgba(0,0,0,0.05)"
                            : "transparent",
                        fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: "nowrap",
                      }
                    };

                    const childrenIcon = link.children && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        style={{
                          transition: "transform 0.2s",
                          transform:
                            activeDropdown === link.label
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          opacity: 0.45,
                        }}
                      >
                        <path
                          d="M2 3.5L5 6.5L8 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    );

                    return isExternal ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" {...commonProps}>
                        {link.label}
                        {childrenIcon}
                      </a>
                    ) : (
                      <Link to={link.href} {...commonProps}>
                        {link.label}
                        {childrenIcon}
                      </Link>
                    );
                  })()}

                  {link.children && activeDropdown === link.label && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#ffffff",
                        borderRadius: 14,
                        padding: "6px",
                        boxShadow:
                          "0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                        border: "1px solid rgba(0,0,0,0.07)",
                        minWidth: 210,
                        zIndex: 100,
                        animation: "dropIn 0.18s ease",
                      }}
                    >
                      {link.children.map((child) => {
                        const isChildExternal = child.href.startsWith("http");
                        const childStyle = {
                          display: "block",
                          padding: "8px 12px",
                          borderRadius: 9,
                          fontSize: 12,
                          color: "#1a2e44",
                          textDecoration: "none",
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 400,
                          transition: "background 0.15s",
                          whiteSpace: "nowrap",
                        };
                        const handleMouseEnter = (event) => {
                          event.currentTarget.style.background = "rgba(0,0,0,0.04)";
                        };
                        const handleMouseLeave = (event) => {
                          event.currentTarget.style.background = "transparent";
                        };
                        const handleClick = (event) => {
                          setActiveDropdown(null);
                          if (child.secure && !requireAuth(child.href)) {
                            event.preventDefault();
                          }
                        };

                        return isChildExternal ? (
                          <a
                            key={child.label}
                            href={child.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={childStyle}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => setActiveDropdown(null)}
                          >
                            {child.label}
                          </a>
                        ) : (
                          <Link
                            key={child.label}
                            to={child.href}
                            style={childStyle}
                            onClick={handleClick}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 5 : 6,
            }}
          >
            <Link
              to="/search"
              aria-label="Open search"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#eef2f7",
                color: "#1A3A6B",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Search size={14} />
            </Link>

            <button
              type="button"
              onClick={() => {
                if (requireAuth(actionTarget)) {
                  navigate(actionTarget);
                }
              }}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                color: "#ffffff",
                background: "#050505",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "background 0.2s, transform 0.15s",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = "#111827";
                event.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "#050505";
                event.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {user && user.role !== "submitter" ? "Workspace" : "Submit idea"}
            </button>

            {isLoggedIn && user ? (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: isMobile ? "3px" : "3px 7px 3px 3px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#1A3A6B",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {getUserInitials(user.name)}
                  </div>
                  {!isMobile && (
                    <ChevronDown size={14} color="#1A3A6B" style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  )}
                </button>

                {profileOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 12px)",
                      right: 0,
                      width: 260,
                      background: "#ffffff",
                      borderRadius: 20,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      padding: 16,
                      zIndex: 100,
                      animation: "dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div style={{ padding: "0 8px 16px", borderBottom: "1px solid #f1f5f9", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>Welcome back,</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user.name}</div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>{user.email || user.phone || 'CEDA portal'}</div>
                    </div>
                    
                    <div style={{ display: "grid", gap: 4 }}>
                      <Link
                        to={roleHome(user?.role)}
                        onClick={() => setProfileOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 12,
                          color: "#1e293b",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <LayoutDashboard size={18} color="#1A3A6B" />
                        My Dashboard
                      </Link>
                      
                      <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 12,
                          color: "#dc2626",
                          background: "transparent",
                          border: "none",
                          fontSize: 14,
                          fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          textAlign: "left",
                          width: "100%",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <LogOut size={18} color="#dc2626" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  title="Guest Mode"
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#f1f5f9",
                      color: "#000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={14} />
                  </div>
                </button>

                {profileOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 12px)",
                      right: 0,
                      width: 260,
                      background: "#ffffff",
                      borderRadius: 20,
                      boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      padding: 16,
                      zIndex: 100,
                      animation: "dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div style={{ padding: "0 8px 16px", borderBottom: "1px solid #f1f5f9", marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>Guest Mode</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Welcome to CEDA</div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, fontFamily: "'Inter', sans-serif" }}>Sign in to continue</div>
                    </div>
                    
                    <div style={{ display: "grid", gap: 4 }}>
                      <Link
                        to="/login"
                        onClick={() => setProfileOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 12,
                          color: "#ffffff",
                          background: "#1A3A6B",
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 500,
                          fontFamily: "'Inter', sans-serif",
                          transition: "background 0.15s",
                          textAlign: "center",
                        }}
                      >
                        Sign in
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? "Close menu" : "Open menu"}
              style={{
                display: isMobile ? "flex" : "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
                width: 30,
                height: 30,
                borderRadius: "50%",
                color: "#0b1f3a",
              }}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {open && isMobile && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "white",
                borderRadius: "0 0 20px 20px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                padding: "8px 16px 16px",
                marginTop: 8,
                zIndex: 100,
                animation: "mobileNavDropIn 0.22s ease",
              }}
            >
              {mobileMenuLinks.map(([label, href, secure]) => {
                const isExternal = href.startsWith("http");
                const commonProps = {
                  onClick: (e) => {
                    setOpen(false);
                    if (secure && !requireAuth(href)) {
                      e.preventDefault();
                    }
                  },
                  style: {
                    display: "block",
                    padding: "12px 16px",
                    color: "#111",
                    textDecoration: "none",
                    fontSize: 15,
                    fontWeight: 500,
                    borderBottom: "1px solid #f1f5f9",
                    borderRadius: 8,
                    fontFamily: "'DM Sans', sans-serif",
                  }
                };

                return isExternal ? (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" {...commonProps}>
                    {label}
                  </a>
                ) : (
                  <Link key={href} to={href} {...commonProps}>
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {!hideChat && <ChatBubble showHint={showHint} onClose={onChatClose} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        @keyframes mobileNavDropIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

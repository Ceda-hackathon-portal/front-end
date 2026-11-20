import { roles } from "../data/portal.js";
export function roleHome(role) {
  return roles.find((item) => item.id === role)?.home || "/workspace";
}
export function safeReturnPath(target, role) {
  const home = roleHome(role);
  if (role === "submitter") {
    if (
      typeof target !== "string" ||
      !target.startsWith("/") ||
      target.startsWith("//") ||
      target.includes("\\") ||
      target.includes("#")
    )
      return home;
    const [path, query = ""] = target.split("?");
    const params = new URLSearchParams(query);
    const rules =
      path === "/workspace/new"
        ? {
            theme: (value) =>
              ["digital", "sustainable", "inclusive"].includes(value),
            draft: (value) => /^[a-zA-Z0-9_-]+$/.test(value),
            new: (value) => value === "1",
          }
        : path === "/workspace/applications"
          ? {
              q: (value) => value.length <= 200,
              status: (value) =>
                [
                  "all",
                  "Draft",
                  "Submitted",
                  "Under review",
                  "Feedback",
                  "Approved",
                  "Award",
                ].includes(value),
            }
          : /^\/workspace\/ideas\/[a-zA-Z0-9-]+$/.test(path)
            ? { submitted: (value) => value === "1" }
            : [
                  "/workspace",
                  "/workspace/profile",
                  "/workspace/messages",
                ].includes(path)
              ? {}
              : null;
    if (!rules || target.split("?").length > 2) return home;
    for (const [key, value] of params)
      if (
        !Object.hasOwn(rules, key) ||
        !rules[key](value) ||
        params.getAll(key).length !== 1
      )
        return home;
    return target;
  }
  const staffRoles = [
    "eligibility-officer",
    "evaluator",
    "adjudicator",
    "administrator",
    "management",
    "system-administrator",
  ];
  if (staffRoles.includes(role) && typeof target === "string") {
    const [path, query = ""] = target.split("?");
    const operational = [
      "eligibility-officer",
      "evaluator",
      "adjudicator",
      "administrator",
    ].includes(role);
    const permitted =
      path === "/admin" ||
      (operational &&
        (path === "/admin/applications" ||
          /^\/admin\/applications\/[a-zA-Z0-9_-]+$/.test(path))) ||
      (["eligibility-officer", "administrator"].includes(role) &&
        path === "/admin/screening") ||
      (["evaluator", "administrator"].includes(role) &&
        path === "/admin/reviews") ||
      (["adjudicator", "administrator"].includes(role) &&
        path === "/admin/decisions") ||
      (["administrator", "management"].includes(role) &&
        path === "/admin/insights") ||
      (role === "system-administrator" && path === "/admin/system") ||
      (role === "administrator" &&
        /^\/admin\/programmes(?:\/[a-zA-Z0-9_-]+(?:\/applications)?)?$/.test(
          path,
        ));
    const params = new URLSearchParams(query);
    const validQuery = [...params].every(
      ([key, value]) =>
        params.getAll(key).length === 1 &&
        (key === "view"
          ? /^[a-z_]{1,30}$/.test(value)
          : key === "q" && value.length <= 200),
    );
    if (
      permitted &&
      validQuery &&
      target.split("?").length < 3 &&
      !target.includes("#") &&
      !target.includes("\\")
    )
      return target;
  }
  if (
    target === home ||
    (["evaluator", "adjudicator", "administrator", "management"].includes(
      role,
    ) &&
      target === "/reports")
  )
    return target;
  return home;
}
export function displayDate(value) {
  return new Intl.DateTimeFormat("en-BW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Gaborone",
  }).format(new Date(value));
}
export function displayDateTime(value) {
  return (
    new Intl.DateTimeFormat("en-BW", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Gaborone",
    }).format(new Date(value)) + " CAT"
  );
}

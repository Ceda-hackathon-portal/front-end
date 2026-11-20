import { validateIdea } from "./applicant.js";

export const programme = {
  id: "p_ich_2026",
  name: "CEDA Innovation Challenge",
  closesAt: null,
  rulesSource:
    "Supplied CEDA hackathon guidelines; final evidence is checked by CEDA.",
  requiredDocuments: ["technical-proposal"],
  requiresBudget: false,
};
export const sections = [
  { id: "profile", title: "About you" },
  { id: "business", title: "Your business" },
  { id: "idea", title: "Your idea" },
  { id: "budget", title: "Budget" },
  { id: "documents", title: "Documents" },
  { id: "review", title: "Review & submit" },
];
export const documentCategories = [
  {
    id: "technical-proposal",
    name: "Technical proposal",
    guidance:
      "Describe the solution, how it will work and how you will deliver it.",
  },
  {
    id: "company-registration",
    name: "Company registration",
    guidance: "A current company registration extract.",
  },
  {
    id: "identity",
    name: "Identity evidence",
    guidance: "Only provide identity evidence requested by the programme.",
  },
  {
    id: "shareholding",
    name: "Shareholders and directors",
    guidance: "Evidence supporting the ownership information in your profile.",
  },
  {
    id: "tax-clearance",
    name: "Tax clearance",
    guidance: "Include the expiry date shown on the document.",
  },
  {
    id: "supporting",
    name: "Supporting document",
    guidance: "Additional evidence relevant to your application.",
  },
];
export const emptyProfile = {
  fullName: "",
  email: "",
  phone: "",
  companyName: "",
  registrationNumber: "",
  registered: "",
  citizen: "",
  shareholders: [],
  preferences: { email: false, sms: false, dataLight: false },
};
export function blankDraft(id, theme = "", now = new Date().toISOString()) {
  return {
    id,
    programmeId: programme.id,
    title: "",
    theme,
    team: "",
    problem: "",
    solution: "",
    impact: "",
    budgetItems: [],
    fundingRequested: "",
    budgetNotApplicable: false,
    documentIds: [],
    createdAt: now,
    updatedAt: now,
    revisionOf: null,
    responseMessage: "",
    revisionKind: null,
  };
}
export function dateInBotswana(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Gaborone",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  const value = (key) => parts.find((part) => part.type === key).value;
  return value("year") + "-" + value("month") + "-" + value("day");
}
export function ageOn(dateOfBirth, date = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth || "")) return null;
  const birth = new Date(dateOfBirth + "T00:00:00Z");
  const today = new Date(dateInBotswana(date) + "T00:00:00Z");
  if (
    !Number.isFinite(birth.getTime()) ||
    !Number.isFinite(today.getTime()) ||
    birth.toISOString().slice(0, 10) !== dateOfBirth ||
    birth > today
  )
    return null;
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age;
}
export function ownershipSummary(shareholders = [], date = new Date()) {
  let total = 0;
  let youthCitizen = 0;
  let complete = shareholders.length > 0;
  for (const person of shareholders) {
    const percent = Number(person.percent);
    const age = ageOn(person.dateOfBirth, date);
    if (
      !person.name?.trim() ||
      person.percent === "" ||
      !Number.isFinite(percent) ||
      percent <= 0 ||
      percent > 100 ||
      age === null ||
      !["yes", "no"].includes(person.citizen)
    )
      complete = false;
    if (Number.isFinite(percent)) total += percent;
    if (
      age !== null &&
      age >= 18 &&
      age <= 35 &&
      person.citizen === "yes" &&
      Number.isFinite(percent)
    )
      youthCitizen += percent;
  }
  return {
    total: Math.round(total * 100) / 100,
    youthCitizen: Math.round(youthCitizen * 100) / 100,
    complete,
  };
}
export function eligibilityResults(answers) {
  const percent = Number(answers.youthOwnership);
  return [
    {
      label: "Botswana citizenship",
      state:
        answers.citizen === "yes"
          ? "met"
          : answers.citizen === "no"
            ? "not_met"
            : "needs_evidence",
      reason:
        answers.citizen === "yes"
          ? "Citizenship evidence will be checked by CEDA."
          : answers.citizen === "no"
            ? "The supplied hackathon guidelines require citizen-owned companies."
            : "Confirm citizenship or ask CEDA for help.",
    },
    {
      label: "Registered company",
      state:
        answers.registered === "yes"
          ? "met"
          : answers.registered === "no"
            ? "not_met"
            : "needs_evidence",
      reason:
        answers.registered === "yes"
          ? "The company registration extract will need verification."
          : answers.registered === "no"
            ? "The supplied guidelines call for a registered company."
            : "CEDA needs company registration evidence.",
    },
    {
      label: "Youth citizen ownership above 50%",
      state:
        answers.youthOwnership === "" ||
        answers.youthOwnership == null ||
        !Number.isFinite(percent) ||
        percent < 0 ||
        percent > 100
          ? "needs_evidence"
          : percent > 50
            ? "met"
            : "not_met",
      reason:
        "Citizens aged 18–35 must hold more than 50%. The application calculates this from shareholder records.",
    },
  ];
}
export function validateProfile(
  profile,
  section = "profile",
  date = new Date(),
) {
  const errors = {};
  if (section === "profile") {
    if (!profile.fullName?.trim()) errors.fullName = "Enter your full name.";
    else if (profile.fullName.trim().length > 100)
      errors.fullName = "Use 100 characters or fewer.";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || "") ||
      profile.email.length > 254
    )
      errors.email = "Enter a valid email address.";
    const phone = (profile.phone || "")
      .replace(/[\s()-]/g, "")
      .replace(/^\+267/, "");
    if (!/^\d{8}$/.test(phone))
      errors.phone = "Enter 8 digits, for example 71 234 567.";
    if (!["yes", "no", "unknown"].includes(profile.citizen))
      errors.citizen = "Choose your citizenship answer.";
  }
  if (section === "business") {
    if (!profile.companyName?.trim())
      errors.companyName = "Enter your company name.";
    else if (profile.companyName.length > 150)
      errors.companyName = "Use 150 characters or fewer.";
    if (!["yes", "no", "unknown"].includes(profile.registered))
      errors.registered = "Choose the company registration answer.";
    if (profile.registered === "yes" && !profile.registrationNumber?.trim())
      errors.registrationNumber = "Enter the company registration number.";
    const ownership = ownershipSummary(profile.shareholders, date);
    if (!ownership.complete)
      errors.shareholders =
        "Add each shareholder’s name, date of birth, citizenship and ownership percentage.";
    else if (Math.abs(ownership.total - 100) > 0.01)
      errors.shareholders = "Shareholder percentages must add up to 100%.";
  }
  return errors;
}
export function budgetTotal(items = []) {
  return (
    Math.round(
      items.reduce(
        (sum, item) =>
          sum +
          (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0),
        0,
      ) * 100,
    ) / 100
  );
}
export function validateBudget(draft) {
  if (draft.budgetNotApplicable && !programme.requiresBudget) return {};
  const errors = {};
  if (!draft.budgetItems?.length)
    errors.budgetItems =
      "Add a budget item or choose “No funding figures for this application”.";
  else if (
    draft.budgetItems.some(
      (item) =>
        !item.description?.trim() ||
        item.description.length > 200 ||
        item.amount === "" ||
        !Number.isFinite(Number(item.amount)) ||
        Number(item.amount) <= 0 ||
        !/^\d+(\.\d{1,2})?$/.test(String(item.amount)),
    )
  )
    errors.budgetItems =
      "Give every budget item a description and a positive amount with up to 2 decimal places.";
  if (
    draft.fundingRequested !== "" &&
    (!/^\d+(\.\d{1,2})?$/.test(String(draft.fundingRequested)) ||
      Number(draft.fundingRequested) < 0 ||
      Number(draft.fundingRequested) > budgetTotal(draft.budgetItems))
  )
    errors.fundingRequested =
      "Requested funding must be between zero and the total budget.";
  return errors;
}
export function isExpired(document, date = new Date()) {
  return Boolean(
    document.expiresAt && document.expiresAt < dateInBotswana(date),
  );
}
export function validateDocuments(draft, documents, date = new Date()) {
  const selected = (draft.documentIds || []).map((id) =>
    documents.find((document) => document.id === id),
  );
  if (selected.some((document) => !document))
    return {
      documents: "A saved file is missing. Remove it and attach it again.",
    };
  if (selected.some((document) => isExpired(document, date)))
    return { documents: "Replace the expired documents before submitting." };
  const missing = programme.requiredDocuments.filter(
    (category) => !selected.some((document) => document.category === category),
  );
  if (missing.length)
    return { documents: "Attach your technical proposal before submitting." };
  return {};
}
export function sectionErrors(
  id,
  draft,
  profile,
  documents,
  date = new Date(),
) {
  if (id === "profile" || id === "business")
    return validateProfile(profile, id, date);
  if (id === "idea") return validateIdea(draft);
  if (id === "budget") return validateBudget(draft);
  if (id === "documents") return validateDocuments(draft, documents, date);
  return {};
}
export function workflowProgress(draft, profile, documents) {
  const completed = sections
    .slice(0, -1)
    .filter(
      (section) =>
        !Object.keys(sectionErrors(section.id, draft, profile, documents))
          .length,
    ).length;
  return { completed, total: 5, percent: completed * 20 };
}
export function firstUnfinishedSection(draft, profile, documents) {
  const index = sections
    .slice(0, -1)
    .findIndex(
      (section) =>
        Object.keys(sectionErrors(section.id, draft, profile, documents))
          .length,
    );
  return index < 0 ? sections.length - 1 : index;
}
export function canUpdate(idea, now = new Date()) {
  if (idea.revisionRequest?.status === "open")
    return (
      !idea.revisionRequest.dueAt ||
      new Date(idea.revisionRequest.dueAt) >= new Date(now)
    );
  return (
    idea.status === "Submitted" &&
    idea.canEdit !== false &&
    (!idea.closesAt || new Date(idea.closesAt) >= new Date(now))
  );
}
export function submittedSnapshot(
  draft,
  profile,
  documents,
  existing,
  now = new Date().toISOString(),
) {
  for (const section of sections.slice(0, -1)) {
    const errors = sectionErrors(section.id, draft, profile, documents, now);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  }
  if (existing && !canUpdate(existing, now))
    throw new Error(
      "This application is not open for changes. Contact CEDA about the next step.",
    );
  if (
    existing?.revisionRequest?.status === "open" &&
    !draft.responseMessage?.trim()
  )
    throw new Error("Explain how you addressed the requested correction.");
  const snapshot = structuredClone({
    ...draft,
    applicant: profile,
    documents: documents.filter((document) =>
      draft.documentIds.includes(document.id),
    ),
    submittedAt: now,
  });
  delete snapshot.revisionOf;
  const number = (existing?.versions?.length || (existing ? 1 : 0)) + 1;
  return { snapshot, number };
}

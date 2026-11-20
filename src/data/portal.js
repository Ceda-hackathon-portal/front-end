export const roles = [
  {
    id: "submitter",
    label: "Applicant",
    description: "Develop an idea and track its progress.",
    home: "/workspace",
  },
  {
    id: "eligibility-officer",
    label: "Eligibility officer",
    description: "Check screening flags and request missing evidence.",
    home: "/admin/screening",
  },
  {
    id: "evaluator",
    label: "Reviewer",
    description: "Review assigned ideas and give feedback.",
    home: "/review",
  },
  {
    id: "adjudicator",
    label: "Decision maker",
    description: "Compare evaluations and record decisions.",
    home: "/adjudication",
  },
  {
    id: "administrator",
    label: "Administrator",
    description: "Set up programmes, assign evaluators and release outcomes.",
    home: "/admin",
  },
  {
    id: "management",
    label: "CEDA management",
    description: "Read aggregate programme performance and reports.",
    home: "/management",
  },
  {
    id: "system-administrator",
    label: "System administrator",
    description: "Manage technical security, audit and availability controls.",
    home: "/system",
  },
];
export const stages = [
  "Submitted",
  "Under review",
  "Feedback",
  "Approved",
  "Award",
];
export const themes = [
  {
    id: "digital",
    number: "01",
    name: "Smarter digital services",
    category: "Digital transformation",
    description: "Make everyday services simpler, clearer and easier to reach.",
    color: "red",
    icon: "digital",
  },
  {
    id: "sustainable",
    number: "02",
    name: "Sustainable enterprise",
    category: "Sustainable development",
    description:
      "Help businesses use resources thoughtfully and grow for the long term.",
    color: "gold",
    icon: "leaf",
  },
  {
    id: "inclusive",
    number: "03",
    name: "Opportunity for everyone",
    category: "Inclusive entrepreneurship",
    description:
      "Bring useful tools and opportunities closer to more Batswana.",
    color: "green",
    icon: "people",
  },
];
export const criteria = [
  {
    name: "Problem & relevance",
    description: "Is the problem clear and aligned with the challenge?",
  },
  {
    name: "Originality",
    description: "What does the idea improve or do differently?",
  },
  {
    name: "Feasibility",
    description: "Can the proposed approach be built and sustained?",
  },
  {
    name: "Potential impact",
    description: "Who benefits, and how could that benefit be measured?",
  },
];
export const demoIdeas = [
  {
    id: "CEDA-DEMO-001",
    title: "Rural enterprise toolkit",
    theme: "digital",
    problem:
      "Small businesses need a simpler way to find and prepare information for support services.",
    solution:
      "A guided checklist that helps entrepreneurs organise the information they need.",
    impact: "Reduce time spent preparing and revising an application.",
    team: "Example innovation team",
    status: "Under review",
    submittedAt: "2026-11-07T09:00:00+02:00",
    feedback: [],
  },
  {
    id: "CEDA-DEMO-002",
    title: "Shared resource exchange",
    theme: "sustainable",
    problem:
      "Useful equipment can sit idle while nearby businesses need temporary access.",
    solution:
      "A local directory for businesses to discover opportunities to share resources.",
    impact: "Support more efficient use of equipment.",
    team: "Example enterprise team",
    status: "Feedback",
    submittedAt: "2026-11-06T11:30:00+02:00",
    feedback: [
      {
        id: "example-feedback",
        author: "Example evaluation team",
        message:
          "Please explain how participating businesses would verify equipment availability and agree responsibilities.",
        createdAt: "2026-11-07T14:00:00+02:00",
      },
    ],
  },
];

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
const information = {
  about: {
    eyebrow: 'CEDA', title: 'About the portal',
    introduction: 'This hackathon prototype explores an innovation portal for the Citizen Entrepreneurial Development Agency (CEDA).',
    sections: [
      ['From ideas to development', 'The proposed portal brings idea submission, collaborative evaluation, adjudication, feedback and recognition into one clear journey.'],
      ['A foundation to build on', 'Explore the idea journey and preview the proposed workspaces. Live accounts, secure submissions and team workflows are the next step.'],
    ],
  },
  help: {
    eyebrow: 'Support', title: 'Help',
    introduction: 'Explore services or open a demo workspace.',
    sections: [
      ['How do I try a submission?', 'Open the Applicant demo, choose New idea and complete the required fields with fictional information. Save a draft or add a demo submission. Records stay in this browser when storage is available.'],
      ['How do I preview staff screens?', 'On the sign-in page, choose Evaluator, Adjudicator, Programme administrator, CEDA management or System administrator from the demo workspace list. Each role has a separate view.'],
      ['Where are my live updates?', 'Live notifications, reviewer messages, file uploads and real accounts are not connected in this first phase. Existing feedback is example content.'],
    ],
  },
  privacy: {
    eyebrow: 'Your information', title: 'Privacy',
    introduction: 'Use fictional information in this prototype.',
    sections: [
      ['What this prototype stores', 'Demo submissions and one draft are saved under ceda.prototype.v1 in this browser’s local storage. They are shared between demo roles in the same browser. Demo identities last only for the current page session.'],
      ['What leaves this prototype', 'Account and submission forms do not send information to a backend. The page loads typography from Google Fonts. The CEDA website link opens the official external site.'],
      ['Remove your demo information', 'Clear this site’s storage in your browser settings to remove saved prototype records. Refreshing ends the demo identity but retains local drafts and submissions.'],
      ['Before live use', 'The team must implement access controls, secure file storage, appropriate data handling and retention, an approved privacy notice and protection for submitted ideas.'],
    ],
  },
  'not-found': { eyebrow: 'A different direction', title: 'That page isn’t here.', introduction: 'The link may belong to an earlier version of the website. There’s still plenty to explore.', sections: [] },
}
export default function InformationPage({ kind }) {
  const content = information[kind]
  return (
    <section className="container page-section">
      <header className="public-page-header"><h1>{content.title}</h1><p>{content.introduction}</p></header>
      <div className="information-grid">{content.sections.map(([title, text]) => <details className="guide-details" key={title}><summary>{title}</summary><p>{text}</p></details>)}</div>
      <Link className="button button-outline" to={kind === 'help' ? '/login' : '/'}>{kind === 'help' ? 'Try a demo workspace' : 'Back to the portal'}<ArrowRight size={17} /></Link>
    </section>
  )
}

import SupportInformation from '../components/service/SupportInformation'
import '../styles/service-center.css'
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
    introduction: 'Find answers, contact a consultant or report a portal fault.',
    sections: [
      ['How do I apply?', 'Sign in, choose a programme, complete the required sections and attach the requested documents. Review the declaration before submitting. A successful submission produces a reference in your account.'],
      ['Can I save and return?', 'Connected applications are saved against your account. Check the save confirmation before leaving. Demo records stay in the browser and are separate from connected accounts.'],
      ['Which files are accepted?', 'PDF, DOCX, JPG and PNG files, up to 10 MB each and 10 per application. Use the document category shown in the programme checklist.'],
      ['How do I get a response?', 'Open the support button and sign in to start a private consultant conversation. Replies appear in the same conversation. After hours, your message is queued.'],
      ['How do I receive updates?', 'Open support, then Settings to manage free account-based alerts. Email is available only when its delivery service is configured.'],
      ['What should I do after an error?', 'Keep your answers and retry after checking the connection. If a submission response is uncertain, reopen the application before attempting another submission. Send the request reference to support if provided.'],
    ],
  },
  privacy: {
    eyebrow: 'Your information', title: 'Privacy notice',
    introduction: 'Version 2026-11-23. This notice describes the portal implementation; CEDA must approve the controller details and retention schedule before public use.',
    sections: [
      ['Purpose and access', 'Account details, applications and supporting documents are used to administer programme participation, evaluation and support. Applicants see their own records. Staff access is checked against programme permissions and assignments. Private evaluation material is not published to applicants.'],
      ['Support and calls', 'Conversation messages are stored in the portal database. Consultant notes are private to authorised staff. Browser audio calls are not recorded. Call signalling is retained temporarily for connection troubleshooting; audio travels between participants or through the configured relay.'],
      ['Updates and contact consent', 'Contact preferences and the notice version are saved in your account. You can disable application alerts in support Settings. Email alerts contain a sign-in link rather than your application contents.'],
      ['Retention and deletion', 'Submitted application records and activity history are protected against changes. A deletion request must be reviewed against the approved retention schedule and any legal hold. Call signalling is removed after one day. Other retention periods require approval and configuration; the portal does not silently erase submitted records.'],
      ['Access, corrections and requests', 'Open support Settings to request a copy or deletion of your information. Your request has a visible status. Contact CEDA through its official help centre for privacy questions. Authentication recovery is handled through the account service.'],
      ['External services', 'Configured email and call-relay providers process the minimum information needed for delivery or connection. Production hosting location, processors and retention arrangements must be confirmed by the service owner.'],
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
      {kind === 'help' && <SupportInformation />}
      <Link className="button button-outline" to={kind === 'help' ? '/login' : '/'}>{kind === 'help' ? 'Sign in for support' : 'Back to the portal'}<ArrowRight size={17} /></Link>
    </section>
  )
}

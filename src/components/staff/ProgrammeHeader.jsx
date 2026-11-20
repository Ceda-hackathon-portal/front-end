import { Link, NavLink } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { programmeStatuses, templates } from '../../data/admin'
import { displayDate } from '../../utils/portal'

export function ProgrammeStatus({ status }) {
  return <span className={'st-status st-status-' + status}>{programmeStatuses[status] || status}</span>
}

export default function ProgrammeHeader({ programme, applicationCount }) {
  const template = templates.find((item) => item.id === programme.templateId)
  const dates = programme.opensAt && programme.closesAt ? `Applications ${displayDate(programme.opensAt)} to ${displayDate(programme.closesAt)}` : 'Dates not set'
  return (
    <>
      <Link className="st-back" to="/admin/programmes"><ArrowLeft size={15} aria-hidden="true" />All programmes</Link>
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">{programme.code || 'No code yet'} · {template?.name}</span>
          <h1>{programme.name}</h1>
          <p>{dates}</p>
        </div>
        <ProgrammeStatus status={programme.status} />
      </header>
      <nav className="st-tabs" aria-label="Programme sections">
        <NavLink end to={'/admin/programmes/' + programme.id}>Settings</NavLink>
        <NavLink to={'/admin/programmes/' + programme.id + '/applications'}>Applications<span>{applicationCount}</span></NavLink>
      </nav>
    </>
  )
}

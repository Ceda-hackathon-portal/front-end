import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { themes } from '../data/portal'

export default function ChallengesPage() {
  return (
    <section className="container page-section">
      <header className="public-page-header"><h1>Programmes</h1><p>Sample themes for the portal.</p></header>
      <div className="simple-service-list">{themes.map((theme) => <Link key={theme.id} to={'/login?redirect=' + encodeURIComponent('/workspace/new?theme=' + theme.id)}><span><strong>{theme.name}</strong><small>{theme.category}</small></span><ArrowRight size={19} /></Link>)}</div>
    </section>
  )
}

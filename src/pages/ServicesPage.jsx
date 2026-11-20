import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
export const portalServices = [
  { name: 'Submit an idea', to: '/login?redirect=%2Fworkspace%2Fnew' },
  { name: 'My submissions', to: '/login?redirect=%2Fworkspace' },
  { name: 'Programmes', to: '/challenges' },
  { name: 'Submission guide', to: '/how-it-works' },
  { name: 'Review workspace', to: '/login' },
  { name: 'Help', to: '/help' },
]
export default function ServicesPage() {
  return <section className="container page-section"><header className="public-page-header"><h1>Services</h1></header><div className="simple-service-list">{portalServices.map((service) => <Link key={service.name} to={service.to}><strong>{service.name}</strong><ArrowRight size={18} /></Link>)}</div></section>
}

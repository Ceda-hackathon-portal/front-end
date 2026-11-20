import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { portalServices } from './ServicesPage'
export default function SearchPage() {
  const [query, setQuery] = useState('')
  const results = portalServices.filter((service) => service.name.toLowerCase().includes(query.toLowerCase()))
  return <section className="container page-section narrow-page"><header className="public-page-header"><h1>Search</h1></header><input className="service-search" aria-label="Search services" placeholder="Find a service…" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="simple-service-list">{results.map((service) => <Link key={service.name} to={service.to}><strong>{service.name}</strong><ArrowRight size={18} /></Link>)}{!results.length && <p className="muted">No services found.</p>}</div></section>
}

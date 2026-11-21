import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { portalServices } from './ServicesPage'
import '../styles/search-page.css'

// Bold the part of a service name that matches what was typed.
function highlight(name, query) {
  const term = query.trim().toLowerCase()
  const start = term ? name.toLowerCase().indexOf(term) : -1
  if (start === -1) return name
  const end = start + term.length
  return <>{name.slice(0, start)}<mark>{name.slice(start, end)}</mark>{name.slice(end)}</>
}

export default function SearchPage() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState(() => params.get('q') || '')
  const results = portalServices.filter((service) => service.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <section className="container page-section narrow-page search-page">
      <header className="public-page-header"><h1>Search</h1></header>
      <div className="search-field">
        <Search size={22} aria-hidden="true" />
        <input
          className="search-input"
          aria-label="Search services"
          placeholder="Find a service…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p className="search-count" role="status">{results.length} {results.length === 1 ? 'service' : 'services'}</p>
      <div className="simple-service-list">
        {results.map((service) => (
          <Link key={service.name} to={service.to}>
            <strong>{highlight(service.name, query)}</strong>
            <span className="search-arrow"><ArrowRight size={18} /></span>
          </Link>
        ))}
        {!results.length && <p className="search-empty">No services found.<small>Try a different word.</small></p>}
      </div>
    </section>
  )
}

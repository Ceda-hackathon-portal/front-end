import { useState } from 'react'
import { ArrowUpRight, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../utils/portal'

const actions = [
  { label: 'Submit an idea', to: '/workspace/new', secure: true },
  { label: 'Track an idea', to: '/workspace', secure: true },
  { label: 'Guidelines', to: '/how-it-works' },
]

export default function PortalAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const navigate = useNavigate()
  const { user, requireAuth } = useAuth()

  function follow(action) {
    const target = user && user.role !== 'submitter' && action.to.startsWith('/workspace')
      ? roleHome(user.role) : action.to
    if (!action.secure || requireAuth(target)) navigate(target)
    setOpen(false)
  }

  function send(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    const action = /track|status|progress|draft/i.test(text) ? actions[1]
      : /submit|idea|apply/i.test(text) ? actions[0] : actions[2]
    setMessages([...messages, { text, action }])
    setInput('')
  }

  return (
    <div className="portal-assistant">
      {open && (
        <section className="assistant-window" role="dialog" aria-label="CEDA guide">
          <header><img src="/images/ceda-logo.png" alt="CEDA" /><span>CEDA guide</span><button onClick={() => setOpen(false)} aria-label="Close CEDA guide"><X size={16} /></button></header>
          <div className="assistant-messages" aria-live="polite">
            <p>How can I help?</p>
            <div className="assistant-choices">{actions.map((action) => <button key={action.to} onClick={() => follow(action)}>{action.label}<ArrowUpRight size={13} /></button>)}</div>
            {messages.map((message, index) => (
              <div key={index} className="assistant-exchange">
                <div>{message.text}</div>
                <p>Here’s the next step.</p>
                <button onClick={() => follow(message.action)}>{message.action.label}<ArrowUpRight size={13} /></button>
              </div>
            ))}
          </div>
          <form onSubmit={send}><input aria-label="Ask the CEDA guide" placeholder="Find a service…" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} /><button type="submit" aria-label="Send question"><Send size={16} /></button></form>
          <small>Portal guide · AI connection planned</small>
        </section>
      )}
      <button className="assistant-trigger" onClick={() => setOpen(!open)} aria-label={open ? 'Close CEDA guide' : 'Open CEDA guide'} aria-expanded={open}>
        {open ? <X size={22} /> : <img src="/images/ceda-logo.png" alt="" />}
      </button>
    </div>
  )
}

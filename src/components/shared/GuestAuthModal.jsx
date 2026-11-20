import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Brand from './Brand'
export default function GuestAuthModal() {
  const { authModalTarget, closeAuthModal } = useAuth()
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!authModalTarget || !dialog) return
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [authModalTarget])
  function continueTo(mode) {
    const target = authModalTarget
    closeAuthModal()
    navigate('/' + mode + '?redirect=' + encodeURIComponent(target))
  }
  return (
    <dialog ref={dialogRef} className="auth-modal" aria-labelledby="guest-modal-title"
      onCancel={closeAuthModal} onClick={(event) => { if (event.target === dialogRef.current) closeAuthModal() }}>
      <div className="auth-modal-content">
        <button className="icon-button modal-close" onClick={closeAuthModal} aria-label="Close sign-in popup"><X size={20} /></button>
        <Brand /><h2 id="guest-modal-title">Sign in to CEDA</h2>
        <p>Submit and track your ideas.</p>
        <button className="button button-primary" onClick={() => continueTo('login')}>Sign in<ArrowRight size={16} /></button>
        <button className="button button-outline" onClick={closeAuthModal}>Continue as guest</button>
        <button className="text-button" onClick={() => continueTo('register')}>Create an account</button>
      </div>
    </dialog>
  )
}

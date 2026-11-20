export default function Brand({ light = false }) {
  return (
    <span className={'brand' + (light ? ' brand-light' : '')}><img src="/images/ceda-logo.png" alt="CEDA" width="112" height="69" /></span>
  )
}

import { roles } from '../data/portal'
export function roleHome(role) {
  return roles.find((item) => item.id === role)?.home || '/workspace'
}
export function safeReturnPath(target, role) {
  const home = roleHome(role)
  if (role === 'submitter' && (target === '/workspace' || /^\/workspace\/new(?:\?theme=(digital|sustainable|inclusive))?$/.test(target || '') || /^\/workspace\/ideas\/[a-zA-Z0-9-]+$/.test(target || ''))) return target
  if (target === home || (['evaluator', 'adjudicator', 'administrator', 'management'].includes(role) && target === '/reports')) return target
  return home
}
export function displayDate(value) {
  return new Intl.DateTimeFormat('en-BW', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Gaborone' }).format(new Date(value))
}
export function displayDateTime(value) {
  return new Intl.DateTimeFormat('en-BW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Gaborone' }).format(new Date(value)) + ' CAT'
}

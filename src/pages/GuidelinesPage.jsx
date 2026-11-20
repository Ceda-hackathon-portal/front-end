import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function GuidelinesPage() {
  return (
    <section className="container page-section narrow-page">
      <header className="public-page-header"><h1>Submission guide</h1></header>
      <ol className="simple-steps">
        <li><span>01</span><div><h2>Sign in</h2><p>Open your CEDA workspace.</p></div></li>
        <li><span>02</span><div><h2>Submit an idea</h2><p>Describe the problem, your solution and its impact.</p></div></li>
        <li><span>03</span><div><h2>Track progress</h2><p>Follow review updates and feedback.</p></div></li>
      </ol>
      <details className="guide-details"><summary>What information do I need?</summary><p>An idea title, programme theme, problem, solution, expected impact and team name.</p></details>
      <details className="guide-details"><summary>What happens after submission?</summary><p>Ideas move through review, feedback and a decision. Programme rules will define the exact stages.</p></details>
      <Link className="button button-primary" to="/login?redirect=%2Fworkspace%2Fnew">Get started<ArrowRight size={16} /></Link>
    </section>
  )
}

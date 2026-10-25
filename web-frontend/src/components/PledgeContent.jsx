import { Link } from 'react-router-dom';

export const PLEDGE_TITLE = 'Bharat Sevak Pledge & Terms of Membership';

export const pledgeSections = [
  {
    title: '1. Our Core Principles',
    paragraphs: [
      'I believe that serving humanity is our highest duty. As a member of Bharat Sevak, I will not engage in any activity that undermines human dignity, rights, respect, or humanity.',
      'Our goal is to reach the highest ideals of humanity. We are collaborators and supporters of one another, not competitors.',
    ],
  },
  {
    title: '2. Service Is Our Religion',
    paragraphs: [
      'I pledge to strive to benefit people through my work, business, products, services, and conduct.',
      "I will never exploit people's helplessness, trust, or needs for personal gain.",
    ],
  },
  {
    title: '3. Responsibility Towards Humanity',
    paragraphs: [
      'I will not discriminate against anyone on the basis of religion, caste, language, gender, economic status, or social identity.',
      'Every human being deserves respect, justice, and humane treatment.',
    ],
  },
  {
    title: '4. Standing Against Dishonest and Inhumane Activities',
    paragraphs: [
      'I will not participate in fraud, exploitation, corruption, injustice, violence, harassment, forgery, the spread of false information, or any activity that causes harm to others.',
      'If any member engages in such activities, we will collectively take appropriate, fair, and lawful action against them.',
      'We will not tolerate wrongdoing, nor will we declare anyone guilty without proper verification.',
    ],
  },
  {
    title: '5. Mutual Cooperation and Respect',
    paragraphs: [
      'I will respect every member of Bharat Sevak and offer assistance whenever needed.',
      'I will strive to use my knowledge, skills, experience, and abilities for the welfare of humanity.',
    ],
  },
  {
    title: '6. Honesty and Transparency',
    paragraphs: [
      'I will maintain honesty and transparency regarding my products, services, prices, quality, transactions, and commitments.',
      'I will not mislead any Customer, Provider, Service Provider, Admin, or other member.',
    ],
  },
  {
    title: '7. Responsible Membership',
    paragraphs: [
      'I will abide by the rules and regulations of Bharat Sevak.',
      'I will not misuse my responsibilities or authority.',
      "I will not unlawfully use any member's personal information, property, or rights.",
    ],
  },
  {
    title: '8. Preventing Injustice and Protecting Humanity',
    paragraphs: [
      'If I witness any unethical, harmful, or inhumane activity, I will report it to the appropriate authorities or through the designated reporting mechanisms of Bharat Sevak.',
      "Together, we will work to protect people's safety, ensure justice, and uphold human dignity.",
      'Our efforts to prevent wrongdoing will always be peaceful, fair, and lawful.',
    ],
  },
  {
    title: '9. Consequences of Violating the Pledge',
    paragraphs: [
      'I understand that if I violate this pledge, my actions may be reviewed in accordance with the policies and regulations of Bharat Sevak.',
      'If an allegation is substantiated, appropriate measures may be taken depending on the circumstances. These may include a warning, temporary suspension, termination of membership, or other necessary lawful action.',
    ],
  },
  {
    title: '10. My Final Commitment',
    paragraphs: [
      'As a responsible member of Bharat Sevak, I pledge that:',
    ],
    commitments: [
      'I will stand by people in their time of need.',
      'I will stand against injustice.',
      'I will uphold the dignity of humanity.',
      'I will conduct myself with honesty and integrity.',
      'I will embrace service as my religion.',
    ],
  },
];

export default function PledgeContent({ compact = false }) {
  return (
    <article className={`pledge-content ${compact ? 'pledge-content-compact' : ''}`}>
      <header className="pledge-heading">
        <p className="pledge-kicker">BHARAT SEVAK</p>
        <h2>{PLEDGE_TITLE}</h2>
        <p className="pledge-motto">Service Is Our Religion | Humanity Is Our Identity</p>
        <p className="pledge-intro">
          This pledge applies to every Provider, Service Provider, Admin, Supervisor, Customer,
          and other member associated with Bharat Sevak.
        </p>
      </header>

      {pledgeSections.map((section) => (
        <section className="pledge-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.commitments && (
            <ul>{section.commitments.map((item) => <li key={item}>{item}</li>)}</ul>
          )}
        </section>
      ))}

      <blockquote className="pledge-final-quote">
        “Service Is Our Religion, Humanity Is Our Identity, and the Welfare of People Is Our Highest Goal.”
      </blockquote>
      <p className="pledge-closing">
        I accept this pledge voluntarily, with full awareness and sincere commitment.
      </p>
      {!compact && (
        <p className="pledge-back-link"><Link to="/">← Back to Bharat Sevak home</Link></p>
      )}
    </article>
  );
}

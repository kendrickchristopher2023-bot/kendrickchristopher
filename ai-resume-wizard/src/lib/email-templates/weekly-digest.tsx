import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface DigestMatch {
  company: string
  role: string
  location?: string | null
}

export interface DigestFollowup {
  company: string
  role: string
  days_since: number
}

interface Props {
  fullName?: string | null
  matches?: DigestMatch[]
  followups?: DigestFollowup[]
  matchesUrl?: string
  followupsUrl?: string
  unsubscribeUrl?: string
}

const SITE = 'https://excel-ai-resume.lovable.app'

const WeeklyDigestEmail = ({
  fullName,
  matches = [],
  followups = [],
  matchesUrl = `${SITE}/apply/matches`,
  followupsUrl = `${SITE}/apply/matches`,
  unsubscribeUrl = `${SITE}/apply/settings`,
}: Props) => {
  const greeting = fullName?.trim() ? `Hi ${fullName.trim()},` : 'Hi there,'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {matches.length} new matches, {followups.length} follow-ups due.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your weekly job kit</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Here's what's fresh in your Application Kit this week.
          </Text>

          {matches.length > 0 && (
            <Section style={{ marginTop: 24 }}>
              <Heading style={h2}>
                {matches.length} new auto-suggested match
                {matches.length === 1 ? '' : 'es'}
              </Heading>
              {matches.map((m, i) => (
                <Text key={i} style={itemText}>
                  <strong>{m.role}</strong> at {m.company}
                  {m.location ? ` — ${m.location}` : ''}
                </Text>
              ))}
              <Text style={text}>
                <Link href={matchesUrl} style={linkStyle}>
                  Review your matches →
                </Link>
              </Text>
            </Section>
          )}

          {followups.length > 0 && (
            <Section style={{ marginTop: 24 }}>
              <Heading style={h2}>
                {followups.length} follow-up
                {followups.length === 1 ? '' : 's'} due
              </Heading>
              {followups.map((f, i) => (
                <Text key={i} style={itemText}>
                  <strong>{f.role}</strong> at {f.company} — {f.days_since} day
                  {f.days_since === 1 ? '' : 's'} since you applied
                </Text>
              ))}
              <Text style={text}>
                <Link href={followupsUrl} style={linkStyle}>
                  Draft a follow-up →
                </Link>
              </Text>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footerText}>
            You're getting this weekly digest because email notifications are on
            in your account.{' '}
            <Link href={unsubscribeUrl} style={linkStyle}>
              Unsubscribe
            </Link>{' '}
            to stop these emails.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyDigestEmail,
  subject: 'Your weekly job kit digest',
  displayName: 'Weekly digest (matches + follow-ups)',
  previewData: {
    fullName: 'Jane',
    matches: [
      { company: 'Acme', role: 'Senior PM', location: 'Remote' },
      { company: 'Globex', role: 'Staff PM', location: 'Charlotte, NC' },
    ],
    followups: [
      { company: 'Initech', role: 'Director of Product', days_since: 9 },
    ],
    unsubscribeUrl: `${SITE}/api/public/hooks/unsubscribe?u=preview&t=preview`,
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}
const h1: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 16px',
}
const h2: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 8px',
}
const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#1f2937',
  margin: '0 0 12px',
}
const itemText: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#1f2937',
  margin: '0 0 6px',
}
const linkStyle: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'underline',
}
const hr: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '32px 0 16px',
}
const footerText: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#9ca3af',
  margin: 0,
}

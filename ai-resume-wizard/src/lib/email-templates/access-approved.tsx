import * as React from 'react'
import {
  Body,
  Button,
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

interface Props {
  magicLink?: string
  fullName?: string | null
}

const AccessApprovedEmail = ({ magicLink, fullName }: Props) => {
  const greeting = fullName?.trim() ? `Hi ${fullName.trim()},` : 'Hi there,'
  const link = magicLink || 'https://excel-ai-resume.lovable.app/auth'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your access request was approved — sign in to get started.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're in.</Heading>
          <Text style={text}>{greeting}</Text>
          <Text style={text}>
            Your access request for the Application Kit was approved. Click the
            button below to sign in — no password needed.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href={link} style={button}>
              Sign in
            </Button>
          </Section>
          <Text style={smallText}>
            Or paste this link into your browser:
            <br />
            <Link href={link} style={linkStyle}>
              {link}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footerText}>
            This link is single-use and expires soon. If you didn't request
            access, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AccessApprovedEmail,
  subject: 'Your access is approved — sign in',
  displayName: 'Access approved (magic link)',
  previewData: {
    fullName: 'Jane',
    magicLink: 'https://excel-ai-resume.lovable.app/auth#preview',
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
const text: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#1f2937',
  margin: '0 0 12px',
}
const smallText: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#6b7280',
  margin: '16px 0 0',
}
const button: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const linkStyle: React.CSSProperties = {
  color: '#2563eb',
  wordBreak: 'break-all',
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

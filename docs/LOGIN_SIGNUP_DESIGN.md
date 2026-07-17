# URL Defender Login and Sign Up Design

## Purpose

This document defines the visual and interaction design for the web Login and Sign Up pages only. It does not change authentication logic, API requests, validation rules, database behavior, OAuth flow, or backend responses.

## Design direction

The experience should feel like a premium cybersecurity SaaS product: focused, calm, trustworthy, and fast. The visual language uses URL Defender green as the primary action color against a deep navy background.

| Token | Value | Use |
|---|---|---|
| Primary | `#16A34A` | Main actions, active states, security accents |
| Secondary | `#22C55E` | Highlights, verification, progress states |
| Background | `#0B1220` | Authentication page base |
| Card | `#111827` | Form panel |
| Border | `rgba(255,255,255,0.08)` | Card and control boundaries |
| Primary text | `#FFFFFF` | Headings and labels |
| Secondary text | `#9CA3AF` | Descriptions and support text |
| Error | `#EF4444` | Validation/error states |
| Warning | `#F59E0B` | Password/rate-limit warnings |

## Desktop layout

```text
+---------------------------------------------------------------+
|                       Authentication Page                     |
|                                                               |
|  Left visual panel                 Right authentication area  |
|  ----------------                 -------------------------  |
|  URL Defender logo                Theme toggle                |
|  Product message                                              |
|  Abstract security illustration    Floating glass form card   |
|  Feature highlights                Login or Sign Up fields    |
|  Privacy/trust note                OAuth and account links    |
|                                                               |
+---------------------------------------------------------------+
```

### Left panel

The left panel is visible on desktop and large tablet layouts. It occupies approximately 45-50% of the viewport and uses a dark security-themed visual surface:

- URL Defender logo and product name at the top.
- Headline: **Protect every link before it becomes a threat.**
- Supporting copy: concise explanation of real-time URL analysis and privacy-first threat intelligence.
- Abstract illustration built with a shield, link nodes, soft green glow, subtle grid, and radial gradients. It must not contain sensitive data or external URLs.
- Feature list:
  - Real-Time URL Protection
  - Shared Threat Intelligence
  - Privacy-First Analysis
  - Fast and Secure
- Small trust footer such as: `Your scans stay private to your account.`

The panel should have a subtle gradient overlay so text remains readable and should use motion only as a low-contrast ambient effect.

### Right panel

The right area centers the form vertically and horizontally. It contains:

- A compact mobile-only URL Defender logo at the top.
- The authentication card.
- Theme toggle placed in the upper-right page chrome.
- Comfortable desktop max width of roughly 440-480 px.

## Authentication card

The form card is a dark glass panel with:

- 20-24 px corner radius.
- Background based on `#111827` with low-opacity white border.
- Backdrop blur and a soft black/green shadow.
- Spacious padding: 32 px desktop, 24 px tablet, 20 px mobile.
- Fade-and-slide-up entrance animation.
- Visible focus rings and sufficient text contrast.

```text
+------------------------------------------+
| Welcome back                             |
| Sign in to continue protecting links.    |
|                                          |
| [ Google icon  Continue with Google ]    |
| ----------- or continue with email ----- |
| [ Email address                         ]|
| [ Password                         eye  ]|
| [ ] Remember me        Forgot password   |
| [          Sign in                    ]  |
|                                          |
| New to URL Defender? Create account      |
+------------------------------------------+
```

## Login page

### Content and hierarchy

1. Heading: **Welcome back**
2. Subtitle: `Sign in to continue protecting your links.`
3. Google sign-in button.
4. Divider: `or continue with email`.
5. Email Address field.
6. Password field with show/hide toggle.
7. Remember Me checkbox and Forgot Password link.
8. Full-width primary Sign in button.
9. Footer: `New to URL Defender? Create account`.

### Interaction states

- The sign-in button shows a spinner and `Signing in...` while the existing request is pending.
- Validation errors appear below the relevant field and use an error border plus an accessible message.
- Existing rate-limit and unverified-email behavior remains unchanged; only its visual presentation follows the card style.
- Google sign-in continues to use the existing OAuth handler.

## Sign Up page

### Content and hierarchy

1. Heading: **Create your account**
2. Subtitle: `Start with 50 free scans each month. No credit card required.`
3. Google sign-in button.
4. Divider: `or create an account with email`.
5. Full Name field.
6. Email Address field.
7. Password field with show/hide toggle.
8. Password strength meter.
9. Confirm Password field.
10. Terms and Privacy Policy checkbox.
11. Full-width Create Account button.
12. Footer: `Already have an account? Sign in`.

### Password strength presentation

```text
Too weak   [----]
Weak       [#---]
Okay       [##--]
Strong     [###-]
Excellent  [####]
```

The strength meter uses red, amber, and green states while retaining text labels; color is never the only indicator.

## Input design

Inputs use floating labels to keep the card compact while remaining accessible.

```text
Inactive                    Focused / filled
+--------------------+      +--------------------+
|  Email address      |      | Email address      |
|                     |      | you@company.com    |
+--------------------+      +--------------------+
```

Requirements:

- Rounded 12 px controls with generous hit targets (minimum 44 px high).
- Left icon for name, email, and password fields.
- Floating label animates upward on focus/value.
- Password visibility control is keyboard accessible and has an explicit screen-reader label.
- Error state: red border, error icon, error text.
- Valid state: green border/check where current validation supports it.
- Focus state: green/blue glow with a visible high-contrast outline.

## Buttons

### Primary action

- Full width.
- Green gradient or solid `#16A34A` treatment.
- Rounded 12 px corners.
- White semibold text.
- Hover lift and soft green glow.
- Pressed state scales subtly down.
- Disabled/loading state prevents duplicate submission and shows a spinner.

### Google button

- Full width.
- Light/white surface with dark text and Google icon.
- Clear hover border/shadow effect.
- Retains the existing Google sign-in handler.
- Does not expose OAuth client details, API URLs, or internal failure text.

## Responsive behavior

| Viewport | Layout |
|---|---|
| Desktop (1024 px and above) | Two columns; visual panel shown; centered 440-480 px card. |
| Tablet (768-1023 px) | Two columns with reduced visual-panel content and 24 px card spacing. |
| Mobile (below 768 px) | Single-column card; visual panel hidden; mobile logo and short trust message remain. |

On mobile, controls remain at least 44 px high, the card avoids horizontal overflow, and links/checkboxes wrap without reducing tap target size.

## Motion

- Card: one fade-up animation when the route enters.
- Background illustration: low-amplitude ambient glow only.
- Inputs: 150-200 ms border/label transition.
- Buttons: 150-200 ms hover/active transition.
- Errors: short shake only when a new validation error appears.
- Respect `prefers-reduced-motion`; disable decorative movement and keep state changes immediate.

## Accessibility and safety

- Semantic headings, labels, form controls, and error associations.
- Keyboard access for every control, including password visibility and Google sign-in.
- Visible focus indicator independent of color preference.
- WCAG-conscious contrast for text and error messages.
- Friendly messages only. UI must not surface SQL errors, PHP warnings, stack traces, API URLs, or internal server details.
- Existing client-side validation and backend responses remain the source for validation outcomes; this design changes presentation only.

## Shared reusable UI pieces

The implementation should reuse shared frontend components rather than duplicate authentication behavior:

- `AuthLayout`: responsive split-screen shell and visual panel.
- `AuthCard`: floating glass card with standard spacing and animation.
- `Field`: floating-label input with icon, validation, and password visibility behavior.
- `GoogleButton`: visual wrapper around the existing Google OAuth handler.
- `PasswordStrength`: existing strength logic with updated presentation only.
- `AuthFooterLink`: consistent sign-in/sign-up cross-link treatment.

## Non-goals

- No changes to API paths, payloads, validation schemas, JWT behavior, OAuth settings, database tables, or PHP backend code.
- No new authentication provider behavior.
- No mobile application work.

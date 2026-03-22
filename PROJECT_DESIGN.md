# Project Design

## Personality
Calm, instructive, and slightly clinical. Feels like a debugger you can trust, not a marketing page. Tone is direct and empathetic to engineers fighting flaky auth flows.

## Color & Styling
- Primary: Indigo/blue gradients for trust (e.g., #4338CA to #2563EB)
- Accent: Amber for warnings (#F59E0B) and Pink for interactive highlights (#EC4899)
- Neutral: Slate grays (#0F172A, #1E293B, #334155) with off-white panels (#F8FAFC)
- Success/Error: Emerald (#10B981) and Rose (#F43F5E)
- Depth: Soft shadows and subtle glassmorphism panels to separate zones

## Typography
- Headings: "Inter" bold, tracking-tight
- Body: "Inter" regular/medium for clarity
- Code/values: "JetBrains Mono" for tokens and state labels

## Components & Layout
- Three-panel layout: left scenario list, center flow visualizer, right inspector/explanation
- Timeline/graph node visualization with labeled transitions and badges for tokens
- Inspector cards for access/refresh tokens (issued, expires, rotation counter, cookie flags)
- Callouts for clock skew, stale refresh, and multi-tab events
- Controls: play/pause, step forward/back, reset; dropdown to inject edge-case events

## Motion & Interaction
- Smooth stepping animations on transitions; highlight current state node
- Animated token expiry bars and rotation counters
- Subtle pulse on warnings/errors instead of harsh blinks

## Inspiration References
- State machine diagrams (XState viz) with cleaner UI
- Datadog/Segment-style event timelines
- Auth0 docs illustrations for clarity

## Assets to Capture
- Screenshot of a failed refresh with highlighted cause
- GIF of stepping through multi-tab logout showing cookie invalidation
- Tooltip hover showing cookie flags (HttpOnly/SameSite/Secure)

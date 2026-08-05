---
name: Aptis Practice
description: A calm Vietnamese exam-preparation workspace inspired by a focused learning center.
colors:
  canvas: "#fafaf7"
  sidebar: "#f5f3ec"
  surface: "#ffffff"
  ink: "#1a1a18"
  muted: "#73716b"
  border: "#e8e5dc"
  primary: "#0d493d"
  primary-deep: "#063f35"
  primary-soft: "#dcefe8"
  premium-soft: "#fbf3dc"
  premium: "#8b6415"
typography:
  family: "Be Vietnam Pro, Inter, system-ui, sans-serif"
rounded:
  control: "0.5rem"
  surface: "0.75rem"
  pill: "9999px"
---

# Design System: Aptis Practice

## Direction

**Creative North Star: “Trung tâm luyện thi điềm tĩnh.”**

The learner application feels like a well-organized Vietnamese exam center: warm off-white paper surfaces, a stable cream sidebar, crisp white work areas, and deep teal for progress and action. Information is compact but never cramped. The product should look dependable enough for serious exam preparation and friendly enough for daily use.

## Visual language

- Be Vietnam Pro is the interface voice; headings are compact, medium-weight, and use restrained negative tracking.
- Deep teal owns active navigation, primary actions, focus, and major study surfaces.
- Warm cream and off-white replace cold gray canvases. Muted colors stay warm and readable.
- Canonical surfaces use 12px corners and one soft downward shadow. Borders are used mainly for shell separation and form controls, not under every shadow.
- Small pastel icon tiles identify skills. Their colors are categorical; teal still owns interaction.

## Layout

- Desktop uses a fixed 240px sidebar and a 64px top bar. The content area is capped near 1240px.
- Dashboard hierarchy: greeting, start-here notice, daily rhythm area, then skill choices.
- Study pages retain the same shell and begin with a dark-teal title band where orientation matters.
- Mobile removes the sidebar and uses a compact top bar plus four-item bottom navigation.

## Interaction and accessibility

- All controls provide at least a 40–44px target where practical.
- Keyboard focus is a visible 2px teal outline with offset.
- Body copy and placeholders meet WCAG AA contrast; status never relies on color alone.
- Motion is restrained to short color, shadow, and small positional feedback; reduced-motion preferences remain respected by the browser.
- Loading, empty, locked, error, and disabled states preserve the surrounding layout and explain the next action.

## Guardrails

- Keep Aptis Practice branding and original copy; do not reuse third-party logos or proprietary visual assets.
- Avoid electric blue, oversized marketing heroes, glass decoration, and cold enterprise-dashboard styling.
- Do not add metrics the backend cannot support. Zero or unavailable states must be stated honestly.

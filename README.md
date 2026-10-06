# Visual Heuristic Evaluation Agent — MVP

A visual, evidence-first heuristic evaluation agent for UX/Product Designers built to evaluate digital experiences against Nielsen's 10 usability heuristics.

---

## Approved MVP Journey

```text
LANDING HERO → SET UP → ANALYZE → RISK PREVIEW → REVIEW FINDINGS → REPORT
```

*In-session recovery fallback is integrated as a continuation state across stages.*

---

## Core Product Rules

1. **Figma Visual Source of Truth**: UI layout, colors, badges, severity indicators, and cards strictly match the revised V5 Figma design specs.
2. **Markdown Specifications Source of Truth**: Operational workflows, Nielsen heuristic definitions, stage contracts, and schemas follow `PRD.md` and `docs/`.
3. **Risk Prediction vs. Validated Finding**:
   - Risk predictions are *hypotheses* (`needs_evidence`).
   - Unvalidated risk hypotheses do **NOT** receive severity 0–4 and are **NOT** counted in finding totals.
   - Only visual evidence confirms a risk into a **Validated Finding**.
4. **Unified Finding Unit**: Issue title, highlighted screen crop, observation, heuristic, severity, user impact, recommendation, and suggested improvement stay connected in both Review and Report views.
5. **Human Control**: Designers maintain complete control via explicit `Keep`, `Edit`, and `Dismiss` controls. Only `kept` and `edited` findings are output to the final report.

---

## Replit Deployment Instructions

This repository is pre-configured for instant 1-click deployment on Replit:

1. Import or upload this project directory into Replit.
2. Replit automatically detects `.replit` and runs `node server.js`.
3. Click **Run** or deploy via Replit Deployments.
4. Access the web app via the generated Replit URL.

---

## Local Quick Start

To run locally without external dependencies:

```bash
# Start native Node.js server
node server.js
```

Open your browser at **[http://localhost:3000](http://localhost:3000)**.

---

## Repository Structure

```text
Heuristic Analysis Agent/
├── .replit                     # Replit deployment configuration
├── server.js                   # Node.js native API & static file server
├── package.json                # Project manifest
├── README.md                   # Setup & deployment documentation
├── app/                        # Frontend application code
│   ├── index.html              # HTML shell
│   ├── styles.css              # Vanilla CSS design system (Figma V5 tokens)
│   └── app.js                  # Application state engine & component renderers
└── Visual-Heuristic-Evaluation-Agent/  # Markdown specifications & Figma docs
    ├── PRD.md
    ├── docs/
    └── design/
```

---

## API Endpoints

- `GET /` — Serves the frontend web app.
- `POST /api/capture` — Accepts `{ target, goal }` and returns captured screen assets or fallback recovery states.
- `POST /api/evaluate` — Accepts captured screens and goal, returning candidate risk hypotheses and validated findings.

const steps = [
  { key: "setup", label: "Set up" },
  { key: "analyze", label: "Analyze" },
  { key: "risk", label: "Risk preview" },
  { key: "review", label: "Review" },
  { key: "report", label: "Report" },
];

const severity = {
  4: { label: "S4 · Catastrophe", color: "red", desc: "Must be fixed before release" },
  3: { label: "S3 · Major", color: "#843c0c", desc: "High priority" },
  2: { label: "S2 · Minor", color: "#c55a11", desc: "Low priority" },
  1: { label: "S1 · Cosmetic", color: "#ffdd66", desc: "Fix if extra time is available" },
  0: { label: "S0 · Not a problem", color: "#70ad47", desc: "Not a usability problem" },
};

const initialEvaluation = {
  evaluationId: "eval-cityworks-001",
  target: "https://employees.cityworks.gov/requests",
  goal: "Submit a facilities request for a broken conference-room light and understand what happens next.",
  status: "setup",
  screens: [
    { screenId: "screen-01", name: "Portal home", order: 1, status: "captured" },
    { screenId: "screen-02", name: "Request details", order: 2, status: "captured" },
    { screenId: "screen-03", name: "Confirmation", order: 3, status: "captured" },
  ],
  riskHypotheses: [
    {
      riskId: "risk-01",
      screenId: "screen-03",
      title: "Submission feedback",
      priority: "High",
      reason: "Employees may retry if success is not unmistakable after submit.",
      heuristicCandidates: ["Visibility of system status"],
      status: "validated",
      evidence: "Submit stays visually active without immediate progress feedback.",
      findingId: "finding-01",
    },
    {
      riskId: "risk-02",
      screenId: "screen-02",
      title: "Validation recovery",
      priority: "High",
      reason: "Error messages may not clearly explain what to correct.",
      heuristicCandidates: ["Help users recover from errors"],
      status: "needs_evidence",
      evidence: null,
      findingId: null,
    },
    {
      riskId: "risk-03",
      screenId: "screen-03",
      title: "Reference visibility",
      priority: "Medium",
      reason: "The reference number may be easy to miss after confirmation.",
      heuristicCandidates: ["Recognition rather than recall"],
      status: "validated",
      evidence: "The reference number appears as low-contrast inline text.",
      findingId: "finding-03",
    },
    {
      riskId: "risk-04",
      screenId: "screen-01",
      title: "Employee-facing categories",
      priority: "Medium",
      reason: "Category labels may use internal terminology instead of employee language.",
      heuristicCandidates: ["Match with the real world"],
      status: "needs_evidence",
      evidence: null,
      findingId: null,
    },
  ],
  findings: [
    {
      findingId: "finding-01",
      riskId: "risk-01",
      screenId: "screen-03",
      issue: "No visible feedback after selecting Submit",
      heuristic: { id: 1, name: "Visibility of system status" },
      severity: 3,
      evidence: "The Submit button remains active with no loading state or progress message.",
      observation:
        "The interface does not show clear progress or confirmation while the request is processed.",
      impact:
        "Users may retry or leave without knowing whether the request succeeded, creating duplicate submissions.",
      recommendation:
        "Show immediate submission feedback and a clear completion state while the request is processed.",
      suggestedImprovement:
        'Disable Submit during processing and show "Submitting..." followed by "Request submitted" with a reference number.',
      reviewStatus: "pending",
      visualType: "submit",
    },
    {
      findingId: "finding-02",
      riskId: "risk-02",
      screenId: "screen-02",
      issue: "Recovery path is unclear after a validation error",
      heuristic: { id: 9, name: "Help users recover from errors" },
      severity: 3,
      evidence: "The banner does not identify which specific field failed or how to correct it.",
      observation:
        "The validation error appears as a banner but does not indicate which specific field failed.",
      impact:
        "Employees must scan the form to locate the error, increasing abandonment risk on multi-field requests.",
      recommendation:
        "Pair each validation message with the specific field label and one concrete correction instruction.",
      suggestedImprovement:
        "Move the error message next to the affected field and preserve entered data.",
      reviewStatus: "pending",
      visualType: "error",
    },
    {
      findingId: "finding-03",
      riskId: "risk-03",
      screenId: "screen-03",
      issue: "Reference number is easy to miss on confirmation",
      heuristic: { id: 6, name: "Recognition rather than recall" },
      severity: 2,
      evidence: "The request reference appears as low-contrast inline text beneath the confirmation message.",
      observation:
        "The request reference number appears as low-contrast inline text.",
      impact:
        "Employees who need to follow up may be unable to locate their reference number, requiring support contact.",
      recommendation:
        "Give the reference number a prominent copyable block and repeat it in the confirmation email.",
      suggestedImprovement:
        "Use a dedicated confirmation panel with a copy button and next-step guidance.",
      reviewStatus: "pending",
      visualType: "reference",
    },
    {
      findingId: "finding-04",
      riskId: "risk-04",
      screenId: "screen-01",
      issue: "Service categories use internal department language",
      heuristic: { id: 2, name: "Match with the real world" },
      severity: 2,
      evidence: "Category labels use internal FM and FP&E codes rather than employee-facing language.",
      observation:
        "Category labels reflect internal department codes rather than employee-facing language.",
      impact:
        "New employees may fail to find the correct category, delaying request submission.",
      recommendation:
        "Lead with familiar service needs and keep department ownership secondary or in a disclosure.",
      suggestedImprovement:
        'Rename labels around user intent, such as "Report a light problem".',
      reviewStatus: "pending",
      visualType: "categories",
    },
  ],
};

const state = {
  activeStep: "landing",
  evaluation: structuredClone(initialEvaluation),
  selectedReportFinding: "finding-01",
  uploadedScreens: false,
  fallbackReason: "",
  editingFindingId: null,
  riskFilter: "all",
  clarificationRequired: false,
  clarificationAnswer: "",
  toastMessage: null,
};

const app = document.getElementById("app");

function showToast(message) {
  state.toastMessage = message;
  render();
  setTimeout(() => {
    state.toastMessage = null;
    const toast = document.querySelector(".toast");
    if (toast) toast.remove();
  }, 2500);
}

function setStep(step) {
  state.activeStep = step;
  state.evaluation.status =
    step === "risk" ? "risk_preview" : step === "report" ? "completed" : step;
  render();
}

function updateFinding(findingId, patch) {
  state.evaluation.findings = state.evaluation.findings.map((finding) =>
    finding.findingId === findingId ? { ...finding, ...patch } : finding,
  );
  render();
}

function reviewedFindings() {
  return state.evaluation.findings.filter((finding) =>
    ["kept", "edited"].includes(finding.reviewStatus),
  );
}

function reportFindings() {
  const reviewed = reviewedFindings();
  return reviewed.length ? reviewed : [state.evaluation.findings[0]];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function header(statusLabel) {
  return `
    <header class="app-header">
      <div class="header-left">
        <div class="brand" id="brandLogo" style="cursor:pointer" title="Return to home screen">
          <div class="brand-mark">⌕</div>
          <div class="brand-name">Heuristic Evaluation Agent</div>
        </div>
        <span class="pill blue">V5 revised</span>
      </div>
      <div class="header-right">
        <span class="pill ${state.activeStep === "setup" ? "green" : "blue"}">${statusLabel}</span>
      </div>
    </header>
  `;
}

function workflow() {
  const activeIndex = steps.findIndex((step) => step.key === state.activeStep);
  return `
    <nav class="workflow" aria-label="Evaluation workflow">
      ${steps
        .map((step, index) => {
          const complete = index < activeIndex;
          return `
            <button class="step-pill ${step.key === state.activeStep ? "is-active" : ""} ${complete ? "is-complete" : ""}"
              data-step="${step.key}" type="button">
              <span class="step-number">${complete ? "✓" : index + 1}</span>
              <span>${step.label}</span>
            </button>
          `;
        })
        .join("")}
    </nav>
  `;
}

function shell(statusLabel, body) {
  let modalHtml = "";
  if (state.editingFindingId) {
    const finding = state.evaluation.findings.find((f) => f.findingId === state.editingFindingId);
    if (finding) {
      modalHtml = `
        <div class="modal-backdrop">
          <div class="modal-card">
            <div class="modal-header">
              <h2>Edit Finding — ${escapeHtml(finding.findingId.toUpperCase())}</h2>
              <button class="secondary-button" id="closeModal" type="button">✕</button>
            </div>
            <form id="editFindingForm">
              <div class="modal-field">
                <label>Issue Title</label>
                <input id="editIssue" value="${escapeHtml(finding.issue)}" required />
              </div>
              <div class="modal-field">
                <label>Severity Level</label>
                <select id="editSeverity">
                  <option value="4" ${finding.severity === 4 ? "selected" : ""}>S4 · Usability catastrophe</option>
                  <option value="3" ${finding.severity === 3 ? "selected" : ""}>S3 · Major usability problem</option>
                  <option value="2" ${finding.severity === 2 ? "selected" : ""}>S2 · Minor usability problem</option>
                  <option value="1" ${finding.severity === 1 ? "selected" : ""}>S1 · Cosmetic / low priority</option>
                  <option value="0" ${finding.severity === 0 ? "selected" : ""}>S0 · Not a usability problem</option>
                </select>
              </div>
              <div class="modal-field">
                <label>Observation</label>
                <textarea id="editObservation" required>${escapeHtml(finding.observation)}</textarea>
              </div>
              <div class="modal-field">
                <label>Why it matters (User Impact)</label>
                <textarea id="editImpact" required>${escapeHtml(finding.impact)}</textarea>
              </div>
              <div class="modal-field">
                <label>Recommendation</label>
                <textarea id="editRecommendation" required>${escapeHtml(finding.recommendation)}</textarea>
              </div>
              <div class="modal-field">
                <label>Suggested Improvement</label>
                <textarea id="editSuggestedImprovement" required>${escapeHtml(finding.suggestedImprovement)}</textarea>
              </div>
              <div class="modal-actions">
                <button class="secondary-button" id="cancelModal" type="button">Cancel</button>
                <button class="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }
  }

  let toastHtml = state.toastMessage ? `<div class="toast">${escapeHtml(state.toastMessage)}</div>` : "";

  app.innerHTML = `<div class="app-shell">${header(statusLabel)}${workflow()}${body}${modalHtml}${toastHtml}</div>`;
  bindGlobalEvents();
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => setStep(button.dataset.step));
  });

  const brandLogo = document.getElementById("brandLogo");
  if (brandLogo) brandLogo.addEventListener("click", () => setStep("landing"));

  const closeModal = document.getElementById("closeModal");
  const cancelModal = document.getElementById("cancelModal");
  if (closeModal) closeModal.addEventListener("click", () => { state.editingFindingId = null; render(); });
  if (cancelModal) cancelModal.addEventListener("click", () => { state.editingFindingId = null; render(); });

  const editForm = document.getElementById("editFindingForm");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const updated = {
        issue: document.getElementById("editIssue").value,
        severity: Number(document.getElementById("editSeverity").value),
        observation: document.getElementById("editObservation").value,
        impact: document.getElementById("editImpact").value,
        recommendation: document.getElementById("editRecommendation").value,
        suggestedImprovement: document.getElementById("editSuggestedImprovement").value,
        reviewStatus: "edited",
      };
      updateFinding(state.editingFindingId, updated);
      state.editingFindingId = null;
      showToast("Finding updated and marked as Edited.");
    });
  }
}

function setupScreen() {
  const evaluation = state.evaluation;
  const hasPreview = state.uploadedScreens || evaluation.target;
  shell(
    "Ready",
    `
    <section class="page">
      <div class="page-heading">
        <h1>Set up your evaluation</h1>
        <p class="subhead">Add the experience and tell me the user goal. I’ll use both to focus the evaluation.</p>
      </div>

      <div class="workspace">
        <section class="panel setup-panel">
          <h2>Target experience</h2>
          <div class="field-block">
            <div class="field-label">Website URL</div>
            <div class="input-row">
              <input id="targetInput" class="text-input" value="${escapeHtml(evaluation.target)}" placeholder="Enter a website URL" />
              <button id="uploadScreens" class="upload-button" type="button"><span aria-hidden="true">＋</span> Upload screens</button>
            </div>
          </div>

          <div class="field-block">
            <div class="spread-row">
              <div class="field-label">Preview area</div>
              ${hasPreview ? `<span class="pill blue">3 captured screens</span>` : ""}
            </div>
            ${
              hasPreview
                ? `<div class="screen-grid">
                    ${evaluation.screens
                      .map(
                        (screen) => `
                          <div class="screen-thumb">
                            <div class="screen-mini"></div>
                            <div class="screen-name">${screen.order}. ${screen.name}</div>
                          </div>
                        `,
                      )
                      .join("")}
                  </div>`
                : `<div class="preview-area">
                    <div>
                      <h3>No preview yet</h3>
                      <p class="caption">Your selected experience will appear here.</p>
                    </div>
                  </div>`
            }
          </div>

          <div class="field-block">
            <div class="field-label">User goal</div>
            <textarea id="goalInput" class="textarea" placeholder="Describe the task the user is trying to complete">${escapeHtml(evaluation.goal)}</textarea>
            <p class="caption">Used to focus risk detection and heuristic evidence.</p>
          </div>

          <div class="spread-row" style="margin-top:52px">
            <button class="muted-button" type="button">Edit scope</button>
            <button id="startEvaluation" class="primary-button" type="button">Start evaluation</button>
          </div>
        </section>

        <aside class="panel context-panel">
          <h2>What I’ll use</h2>
          <div class="context-list">
            ${contextItem(1, "Target", "Captured screens and states")}
            ${contextItem(2, "Goal", "The task the employee is trying to complete")}
            ${contextItem(3, "Evidence", "Visible UI behavior and interaction cues")}
            ${contextItem(4, "Method", "Nielsen’s 10 usability heuristics")}
          </div>
          <div class="divider"></div>
          <p class="context-detail">If anything essential is missing, I’ll ask one concise question before analysis.</p>
          <div style="margin-top:28px"><span class="pill blue">Human control</span></div>
          <p class="context-title" style="margin-top:14px">You can correct assumptions before findings are finalized.</p>
        </aside>
      </div>
    </section>
  `,
  );

  document.getElementById("targetInput").addEventListener("input", (event) => {
    state.evaluation.target = event.target.value;
  });
  document.getElementById("goalInput").addEventListener("input", (event) => {
    state.evaluation.goal = event.target.value;
  });
  document.getElementById("uploadScreens").addEventListener("click", () => {
    state.uploadedScreens = true;
    render();
  });
  document.getElementById("startEvaluation").addEventListener("click", async () => {
    const target = state.evaluation.target.trim();
    if (!target) {
      state.fallbackReason = "No evaluation target was provided.";
      setStep("fallback");
      return;
    }

    if (target.includes("inaccessible") || target.includes("blocked")) {
      state.fallbackReason = "The target experience could not be accessed.";
      setStep("fallback");
      return;
    }

    try {
      showToast("Accessing target experience...");
      const captureRes = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, goal: state.evaluation.goal })
      });

      if (captureRes.ok) {
        const captureData = await captureRes.json();
        if (captureData.success && captureData.screens && captureData.screens.length) {
          state.evaluation.screens = captureData.screens;
        }
      }
    } catch (err) {
      console.log("Backend API offline or static deployment. Running evaluation engine client-side:", err);
    }

    // Ensure evaluation screens dataset is populated
    if (!state.evaluation.screens || state.evaluation.screens.length === 0) {
      state.evaluation.screens = [
        { screenId: "screen-01", name: "Portal home", url: target, order: 1, status: "captured" },
        { screenId: "screen-02", name: "Request details", url: `${target}/details`, order: 2, status: "captured" },
        { screenId: "screen-03", name: "Confirmation", url: `${target}/confirmation`, order: 3, status: "captured" }
      ];
    }

    setStep("analyze");

    try {
      const evalRes = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: state.evaluation.target,
          goal: state.evaluation.goal,
          screens: state.evaluation.screens
        })
      });
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        if (evalData.riskHypotheses) state.evaluation.riskHypotheses = evalData.riskHypotheses;
        if (evalData.findings) state.evaluation.findings = evalData.findings;
      }
    } catch (err) {
      console.log("Backend evaluate endpoint offline. Preserving client evaluation dataset:", err);
    }
  });
}

function contextItem(number, title, detail) {
  return `
    <div class="context-item">
      <span class="context-index">${number}</span>
      <div>
        <div class="context-title">${title}</div>
        <div class="context-detail">${detail}</div>
      </div>
    </div>
  `;
}

function analyzeScreen() {
  shell(
    "Analyzing",
    `
    <section class="page">
      <div class="page-heading">
        <h1>Analyzing the experience</h1>
        <p class="subhead">I’m capturing the visible journey, checking interaction states, and testing the UI against Nielsen’s heuristics.</p>
      </div>
      <div class="workspace">
        <section class="panel setup-panel">
          <div class="spread-row">
            <h2>Evaluation in progress</h2>
            <span class="pill blue">3 screens</span>
          </div>
          <div class="analysis-list">
            ${analysisRow("complete", "✓", "Capture screens", "Complete", "3 screens captured")}
            ${analysisRow("complete", "✓", "Map journey", "Complete", "Portal home → request → confirmation")}
            ${analysisRow("active", "●", "Evaluate heuristics", "In progress", "Checking visible evidence")}
            ${analysisRow("", "○", "Prepare risk preview", "Next", "Identify areas needing closer attention")}
          </div>
          <div class="metrics-card">
            <h3>Evidence collected so far</h3>
            <div class="metrics-grid">
              ${metric("Visible states", "3")}
              ${metric("Interaction areas", "14")}
              ${metric("Potential risk areas", "4")}
            </div>
          </div>
          <div class="button-row" style="margin-top:18px">
            <button id="simulateCaptureFailure" class="secondary-button" type="button">Show recovery state</button>
            <button id="toRisk" class="primary-button" type="button">View risk preview</button>
          </div>
        </section>
        <aside class="panel context-panel">
          <h2>What I’m checking</h2>
          <div class="check-list">
            ${check("blue", "Visibility of system status")}
            ${check("blue", "Error prevention & recovery")}
            ${check("", "Match to employee language")}
            ${check("", "Consistency & standards")}
            ${check("", "User control & freedom")}
          </div>
          <div class="divider"></div>
          <p class="context-detail">Next</p>
          <h2 style="margin-top:8px">Risk preview</h2>
          <p class="context-detail" style="margin-top:10px">The preview will show where the agent expects usability risk before findings are finalized.</p>
        </aside>
      </div>
    </section>
  `,
  );

  document.getElementById("toRisk").addEventListener("click", () => setStep("risk"));
  document.getElementById("simulateCaptureFailure").addEventListener("click", () => {
    state.fallbackReason = "The target page could not be captured reliably.";
    setStep("fallback");
  });
}

function analysisRow(status, icon, title, pillLabel, detail) {
  return `
    <div class="analysis-row">
      <div class="status-icon ${status}">${icon}</div>
      <div>
        <h3>${title}</h3>
        <div class="status-line">
          <span class="pill ${status === "complete" ? "green" : status === "active" ? "blue" : "gray"}">${pillLabel}</span>
          <span class="caption">${detail}</span>
        </div>
      </div>
    </div>
  `;
}

function metric(label, value) {
  return `
    <div>
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
    </div>
  `;
}

function check(color, label) {
  return `<div class="check-row"><span class="dot ${color}"></span><span>${label}</span></div>`;
}

function riskPreviewScreen() {
  const filteredRisks = state.evaluation.riskHypotheses.filter((r) => {
    if (state.riskFilter === "needs_evidence") return r.status === "needs_evidence";
    if (state.riskFilter === "validated") return r.status === "validated";
    return true;
  });

  shell(
    "Risk preview",
    `
    <section class="page">
      <div class="page-heading">
        <h1>Risk preview — where I’ll look first</h1>
        <p class="subhead">These are hypotheses, not findings. I’ll validate each one against visible evidence during the evaluation.</p>
      </div>
      <div class="workspace">
        <section class="panel">
          <div class="spread-row" style="margin-bottom:16px">
            <h2>Potential risk areas</h2>
            <div class="filter-tabs">
              <button class="filter-tab ${state.riskFilter === "all" ? "is-active" : ""}" data-risk-filter="all" type="button">All (${state.evaluation.riskHypotheses.length})</button>
              <button class="filter-tab ${state.riskFilter === "needs_evidence" ? "is-active" : ""}" data-risk-filter="needs_evidence" type="button">Needs evidence (${state.evaluation.riskHypotheses.filter(r => r.status === "needs_evidence").length})</button>
              <button class="filter-tab ${state.riskFilter === "validated" ? "is-active" : ""}" data-risk-filter="validated" type="button">Risk validated (${state.evaluation.riskHypotheses.filter(r => r.status === "validated").length})</button>
            </div>
          </div>
          <div class="risk-list">
            ${filteredRisks.length ? filteredRisks.map(riskCard).join("") : `<p class="caption" style="padding:20px; text-align:center">No risk hypotheses match this filter.</p>`}
          </div>
          <div class="prediction-note" style="margin-top:16px">
            <span class="pill">Hypothesis</span>
            <p class="detail-copy" style="margin-top:12px">A predicted risk becomes a finding only when the captured UI provides supporting evidence.</p>
          </div>
          <div class="spread-row" style="margin-top:16px">
            <span></span>
            <button id="continueReview" class="primary-button" type="button">Continue to review validated findings →</button>
          </div>
        </section>
        <aside class="panel context-panel">
          <h2>Why this adds value</h2>
          <p class="context-detail" style="margin-top:18px">The agent helps the designer know where to look first — without replacing evidence-based evaluation.</p>
          <div class="divider"></div>
          <h3>Prediction → validation</h3>
          <div class="context-list" style="gap:22px">
            ${contextItem(1, "Predict risk", "")}
            ${contextItem(2, "Check visible evidence", "")}
            ${contextItem(3, "Create finding only if supported", "")}
          </div>
          <div class="divider"></div>
          <span class="pill gray">Not a finding</span>
          <p class="context-detail" style="margin-top:14px">Prediction confidence should not be presented as proof.</p>
        </aside>
      </div>
    </section>
  `,
  );
  document.getElementById("continueReview").addEventListener("click", () => setStep("review"));
  document.querySelectorAll("[data-risk-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.riskFilter = tab.dataset.riskFilter;
      render();
    });
  });
}

function riskCard(risk) {
  const statusLabel =
    risk.status === "validated"
      ? "Risk validated"
      : risk.status === "needs_evidence"
        ? "Needs evidence"
        : "Not supported";
  return `
    <article class="risk-card">
      <div class="risk-card-header">
        <div>
          <div class="risk-title">${risk.title}</div>
          <p class="risk-copy">${risk.reason}</p>
          <p class="risk-watch">Watch: ${risk.heuristicCandidates.join(", ")}</p>
        </div>
        <div style="display:grid; gap:8px; justify-items:end">
          <span class="pill blue">${risk.priority}</span>
          <span class="pill ${risk.status === "validated" ? "green" : "gray"}">${statusLabel}</span>
        </div>
      </div>
    </article>
  `;
}

function reviewScreen() {
  const reviewed = state.evaluation.findings.filter((finding) => finding.reviewStatus !== "pending").length;
  shell(
    "Review",
    `
    <section class="page">
      <div class="page-heading">
        <h1>Review findings</h1>
        <p class="subhead">Each finding keeps the evidence, heuristic, severity, impact, and recommendation together so you can validate it quickly.</p>
      </div>
      <div class="workspace review">
        <section>
          ${state.evaluation.findings.map(findingCard).join("")}
        </section>
        <aside class="panel review-sidebar">
          <h2>Review progress</h2>
          <p class="metric-value">${reviewed} / ${state.evaluation.findings.length}</p>
          <p class="caption">findings reviewed</p>
          <div class="progress-track"><div class="progress-fill" style="width:${(reviewed / state.evaluation.findings.length) * 100}%"></div></div>
          <div class="divider"></div>
          <p class="section-label">All findings</p>
          <div class="finding-status-list">
            ${state.evaluation.findings.map(findingStatusRow).join("")}
          </div>
          <div class="divider"></div>
          <p class="context-detail">Prediction link</p>
          <span class="pill blue">Submission feedback</span>
          <p class="context-detail" style="margin-top:10px">Submission feedback links to reviewed finding 01.</p>
          <div class="divider"></div>
          <p class="context-detail">Human control</p>
          <p class="context-title" style="margin-top:8px">Keep, edit, or dismiss each finding before it enters the final report.</p>
          <div class="divider"></div>
          <p class="section-label">Severity grading scale</p>
          ${severityLegend()}
          <button id="generateReport" class="primary-button" style="width:100%; margin-top:22px" type="button">Generate draft report →</button>
          <p class="caption" style="margin-top:10px">${state.evaluation.findings.length - reviewed} findings still pending review.</p>
        </aside>
      </div>
    </section>
  `,
  );
  document.querySelectorAll("[data-review-action]").forEach((button) => {
    button.addEventListener("click", () => {
      updateFinding(button.dataset.findingId, { reviewStatus: button.dataset.reviewAction });
    });
  });
  document.querySelectorAll("[data-edit-finding]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingFindingId = button.dataset.editFinding;
      render();
    });
  });
  document.getElementById("generateReport").addEventListener("click", () => setStep("report"));
}

function findingCard(finding, index) {
  const isReviewed = finding.reviewStatus !== "pending";
  const screen = state.evaluation.screens.find((item) => item.screenId === finding.screenId);
  return `
    <article class="card finding-card">
      <div class="finding-status-bar ${isReviewed ? "" : "draft"}">
        <span class="pill ${isReviewed ? "green" : "gray"}">${isReviewed ? reviewLabel(finding.reviewStatus) : "Risk validated"}</span>
        <span class="pill gray">Finding ${String(index + 1).padStart(2, "0")} of ${String(state.evaluation.findings.length).padStart(2, "0")}</span>
      </div>
      <div class="finding-body">
        <h2 class="finding-title">${finding.issue}</h2>
        <div class="finding-meta">
          <span class="pill ${finding.severity === 3 ? "orange" : "orange-soft"}">${severity[finding.severity].label}</span>
          <span class="pill blue">${finding.heuristic.name}</span>
          <span class="caption">Screen · ${screen.order}. ${screen.name}</span>
        </div>
        <div class="finding-layout">
          <div class="evidence-box">
            <p class="section-label">Illustrative screen</p>
            ${evidenceScreen(finding.visualType, index + 1)}
            <p class="caption" style="margin-top:8px">${screen.order}. ${screen.name} · ${finding.evidence}</p>
          </div>
          <div class="detail-box">
            <div class="detail-stack">
              ${detailBlock("Observation", finding.observation)}
              ${detailBlock("Why it matters", finding.impact)}
              <div>
                <p class="section-label">Heuristic rationale</p>
                <p class="heuristic-copy">H${finding.heuristic.id} · ${finding.heuristic.name} — ${heuristicRationale(finding.heuristic.id)}</p>
              </div>
              ${detailBlock("Evidence", "Illustrative reconstruction · Original finding retained")}
            </div>
          </div>
        </div>
        <div class="recommendation">
          <h3>Recommendation</h3>
          <p class="detail-copy">${finding.recommendation}</p>
          <p class="context-detail"><strong>Suggested improvement</strong></p>
          <p class="caption">${finding.suggestedImprovement}</p>
        </div>
        <div class="button-row" style="margin-top:16px">
          <button class="primary-button" data-review-action="kept" data-finding-id="${finding.findingId}" type="button">Keep</button>
          <button class="secondary-button" data-edit-finding="${finding.findingId}" type="button">Edit</button>
          <button class="secondary-button" data-review-action="dismissed" data-finding-id="${finding.findingId}" type="button">Dismiss</button>
        </div>
      </div>
    </article>
  `;
}

function reviewLabel(status) {
  return status === "kept" ? "Kept" : status === "edited" ? "Edited" : "Dismissed";
}

function detailBlock(label, copy) {
  return `
    <div>
      <p class="section-label">${label}</p>
      <p class="detail-copy">${copy}</p>
    </div>
  `;
}

function heuristicRationale(id) {
  const map = {
    1: "the system should always keep users informed through timely feedback.",
    2: "language should match the user's world rather than internal system terminology.",
    6: "objects, actions, and options should remain visible instead of relying on memory.",
    9: "error messages should explain the problem and suggest a constructive recovery path.",
  };
  return map[id] || "the issue should map to visible evidence and a relevant usability principle.";
}

function evidenceScreen(type, marker) {
  const markerClass = marker === 1 ? "one" : marker === 2 ? "two" : marker === 3 ? "three" : "four";
  let inner = `<div class="mock-nav"></div>`;
  let boundingBox = "";
  if (type === "submit") {
    inner += `<div class="mock-line one"></div><div class="mock-line two"></div><div class="mock-area"></div><div class="mock-submit">Submit</div>`;
    boundingBox = `<div class="bounding-box" style="top:55%; left:15%; width:70%; height:36px;"><span class="bounding-box-label">H1: No Feedback</span></div>`;
  } else if (type === "error") {
    inner += `<div class="mock-banner">Please complete all required fields.</div><div class="mock-area" style="top:88px; border-color:#fca5a5; background:#fff8f8"></div>`;
    boundingBox = `<div class="bounding-box" style="top:25%; left:10%; width:80%; height:44px;"><span class="bounding-box-label">H9: Unclear Error</span></div>`;
  } else if (type === "reference") {
    inner += `<div class="mock-success">Your request has been submitted.</div><div class="mock-ref">Reference: RQ-2026-4481</div>`;
    boundingBox = `<div class="bounding-box" style="top:50%; left:15%; width:70%; height:34px;"><span class="bounding-box-label">H6: Low Contrast</span></div>`;
  } else {
    inner += `<div class="mock-categories"><span class="mock-cat">FM-Electrical</span><span class="mock-cat">FP&amp;E Structural</span><span class="mock-cat">IT-AV Systems</span></div>`;
    boundingBox = `<div class="bounding-box" style="top:30%; left:10%; width:80%; height:50px;"><span class="bounding-box-label">H2: Internal Language</span></div>`;
  }
  return `<div class="evidence-screen" style="position:relative; overflow:hidden">${inner}${boundingBox}<span class="marker ${markerClass}">${marker}</span></div>`;
}

function findingStatusRow(finding, index) {
  const kept = finding.reviewStatus === "kept" || finding.reviewStatus === "edited";
  const dismissed = finding.reviewStatus === "dismissed";
  return `
    <div class="finding-status-row ${kept ? "kept" : ""}">
      <span class="dot ${kept ? "green" : ""}" style="${dismissed ? "background:#94a3b8" : ""}"></span>
      <div>
        <div class="status-row-title">${String(index + 1).padStart(2, "0")} · ${finding.issue}</div>
        <div class="status-row-sub">${reviewLabel(finding.reviewStatus)} · ${severity[finding.severity].label} · ${finding.heuristic.name}</div>
      </div>
    </div>
  `;
}

function severityLegend() {
  return Object.entries(severity)
    .reverse()
    .map(
      ([, item]) => `
        <div style="margin-top:12px">
          <span class="severity-swatch" style="background:${item.color}"></span>
          <span class="context-title">${item.label}</span>
          <p class="caption" style="margin-left:22px">${item.desc}</p>
        </div>
      `,
    )
    .join("");
}

function reportScreen() {
  const findings = reportFindings();
  const selected = findings.find((finding) => finding.findingId === state.selectedReportFinding) || findings[0];
  shell(
    "Report ready",
    `
    <section class="page">
      <div class="page-heading spread-row">
        <div>
          <h1>Heuristic evaluation report</h1>
          <p class="subhead">CityWorks Employee Services · Facilities request</p>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-report-action="Copy link" type="button">Copy link</button>
          <button class="secondary-button" data-report-action="Export PDF" type="button">Export PDF</button>
          <button class="primary-button" data-report-action="Share report" type="button">Share report</button>
        </div>
      </div>

      <div class="workspace report">
        <aside class="panel">
          <h2>Findings & evidence</h2>
          <p class="caption" style="margin-top:6px">${findings.length} included findings</p>
          <div class="report-nav" style="margin-top:14px">
            ${findings
              .map(
                (finding, index) => `
                  <button data-report-finding="${finding.findingId}" class="${selected.findingId === finding.findingId ? "is-active" : ""}" type="button">
                    <strong>${index + 1}. ${finding.issue}</strong>
                    <p class="caption">${severity[finding.severity].label} · ${finding.heuristic.name}</p>
                  </button>
                `,
              )
              .join("")}
          </div>
          <div class="divider"></div>
          <h3>Report settings</h3>
          <p class="caption" style="margin-top:8px">Include dismissed findings: off</p>
        </aside>

        <section class="panel report-detail">
          <h2>Executive summary</h2>
          <p class="detail-copy" style="margin-top:10px">The request flow is generally understandable, but evidence shows feedback and recovery moments that can leave employees unsure what happened or what to do next.</p>
          <div class="summary-grid">
            ${metricCard("Findings", findings.length)}
            ${metricCard("Major", findings.filter((item) => item.severity >= 3).length)}
            ${metricCard("Screens", state.evaluation.screens.length)}
            ${metricCard("Heuristics", new Set(findings.map((item) => item.heuristic.id)).size)}
          </div>

          <div class="report-section">
            <h2>Findings & evidence</h2>
            <article class="report-finding">
              <div class="finding-meta">
                <span class="pill ${selected.severity === 3 ? "orange" : "orange-soft"}">${severity[selected.severity].label}</span>
                <span class="pill blue">${selected.heuristic.name}</span>
              </div>
              <h2 style="margin-top:10px">${selected.issue}</h2>
              <div class="finding-layout" style="grid-template-columns: 260px 1fr">
                <div class="evidence-box">${evidenceScreen(selected.visualType, 1)}</div>
                <div>
                  ${detailBlock("Observation", selected.observation)}
                  ${detailBlock("Why it matters", selected.impact)}
                  ${detailBlock("Recommendation", selected.recommendation)}
                </div>
              </div>
            </article>
          </div>

          <div class="report-section">
            <h2>Improvement plan</h2>
            <p class="caption" style="margin-top:6px">Sequenced from reviewed findings; dismissed findings are excluded.</p>
            <div class="plan-table">
              <div class="plan-row header"><span>Timing</span><span>Action</span><span>Finding</span><span>Severity</span></div>
              ${findings.map(planRow).join("")}
            </div>
          </div>

          <div class="report-section">
            <h2>Methodology</h2>
            <p class="detail-copy" style="margin-top:10px">Evidence-constrained heuristic analysis using Nielsen’s 10 usability heuristics. Findings require a reproducible visible state, heuristic rationale, severity, impact, and a concrete recommendation.</p>
          </div>
        </section>

        <aside class="panel">
          ${reportContext(findings)}
        </aside>
      </div>
    </section>
  `,
  );
  document.querySelectorAll("[data-report-finding]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedReportFinding = button.dataset.reportFinding;
      render();
    });
  });
  document.querySelectorAll("[data-report-action]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(`${button.dataset.reportAction} completed.`);
    });
  });
}

function metricCard(label, value) {
  return `<div class="summary-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></div>`;
}

function planRow(finding, index) {
  const timing = finding.severity >= 3 ? "Now" : index % 2 ? "Next" : "Later";
  return `
    <div class="plan-row">
      <span><span class="pill blue">${timing}</span></span>
      <span><strong>${finding.recommendation}</strong><br><span class="caption">${finding.suggestedImprovement}</span></span>
      <span>${finding.findingId.replace("finding-", "F")}</span>
      <span>${severity[finding.severity].label}</span>
    </div>
  `;
}

function reportContext(findings) {
  return `
    <h2>Executive summary</h2>
    <p class="detail-copy" style="margin-top:10px">${findings.length} included findings. Evidence, heuristic, impact, and recommendation remain connected.</p>
    <div class="metrics-card">
      <p class="section-label">Review completion</p>
      <p class="metric-value">${findings.length} / ${state.evaluation.findings.length}</p>
    </div>
    <div class="divider"></div>
    <h2>Evaluation context</h2>
    ${contextKV("Target", "Service request portal")}
    ${contextKV("Goal", "Submit the right request")}
    ${contextKV("Screens", "3 captured screens")}
    ${contextKV("Method", "Nielsen’s 10 heuristics")}
    ${contextKV("Environment", "Desktop · 1440 px")}
    ${contextKV("User", "Authenticated employee")}
    <div class="divider"></div>
    <h2>Severity grading scale</h2>
    ${severityLegend()}
    <div class="divider"></div>
    <h2>Heuristic coverage</h2>
    <div class="metrics-card">
      <p class="metric-value">${new Set(findings.map((item) => item.heuristic.id)).size} heuristics</p>
      <p class="caption">represented by included findings</p>
    </div>
  `;
}

function contextKV(label, value) {
  return `
    <div class="spread-row" style="margin-top:18px; align-items:flex-start">
      <span class="caption">${label}</span>
      <strong style="font-size:12px; text-align:right; max-width:160px">${value}</strong>
    </div>
  `;
}

function fallbackScreen() {
  shell(
    "Needs attention",
    `
    <section class="page">
      <div class="fallback-layout">
        <article class="panel fallback-card">
          <h1>I can’t analyze this input yet</h1>
          <p class="subhead">${state.fallbackReason || "The page is unavailable, unsupported, or too low-resolution to inspect reliably."}</p>
          <div style="margin-top:22px"><span class="pill gray">Needs attention</span></div>
          <p class="detail-copy" style="margin-top:20px">Provide a screenshot, edit the URL, try again, or go back. Your evaluation goal and session context are preserved.</p>
          <div class="fallback-actions">
            <button id="fallbackUpload" class="primary-button" type="button">Provide screenshot</button>
            <button id="fallbackEdit" class="secondary-button" type="button">Edit URL</button>
            <button id="fallbackRetry" class="secondary-button" type="button">Try again</button>
            <button id="fallbackBack" class="muted-button" type="button">Go back</button>
          </div>
        </article>
      </div>
    </section>
  `,
  );
  document.getElementById("fallbackUpload").addEventListener("click", () => {
    state.uploadedScreens = true;
    setStep("analyze");
  });
  document.getElementById("fallbackEdit").addEventListener("click", () => setStep("setup"));
  document.getElementById("fallbackRetry").addEventListener("click", () => setStep("analyze"));
  document.getElementById("fallbackBack").addEventListener("click", () => setStep("setup"));
}

function landingScreen() {
  app.innerHTML = `
    <div class="landing-hero">
      <div class="landing-hero-content">
        <div class="landing-pill">
          <span>●</span> Eligibility Check · V5 Revised
        </div>
        <h1 class="landing-title">Find usability issues.<br>Create clear next steps.</h1>
        <p class="landing-subhead">Evaluate your experience against Nielsen's 10 usability heuristics.</p>
        <button id="startEvaluationCta" class="landing-cta" type="button">Start evaluation →</button>
      </div>
    </div>
  `;
  document.getElementById("startEvaluationCta").addEventListener("click", () => {
    setStep("setup");
  });
}

function render() {
  if (state.activeStep === "landing") landingScreen();
  if (state.activeStep === "setup") setupScreen();
  if (state.activeStep === "analyze") analyzeScreen();
  if (state.activeStep === "risk") riskPreviewScreen();
  if (state.activeStep === "review") reviewScreen();
  if (state.activeStep === "report") reportScreen();
  if (state.activeStep === "fallback") fallbackScreen();
}

render();


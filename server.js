const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const https = require("https");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "app");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};

// Fallback Structured Evaluation Generator (used if API key is missing or request fails)
function generateFallbackRiskHypotheses(screens) {
  return [
    {
      riskId: "risk-01",
      screenId: screens[2]?.screenId || "screen-03",
      title: "Submission feedback progress",
      priority: "High",
      reason: "Users may re-submit or abandon if processing feedback is missing after clicking Submit.",
      heuristicCandidates: ["Visibility of system status"],
      status: "validated",
      evidence: "Submit button stays visually active with no loading spinner or progress notification.",
      findingId: "finding-01"
    },
    {
      riskId: "risk-02",
      screenId: screens[1]?.screenId || "screen-02",
      title: "Validation error recovery path",
      priority: "High",
      reason: "Error messages may fail to highlight specific input fields needing correction.",
      heuristicCandidates: ["Help users recognize, diagnose, and recover from errors"],
      status: "needs_evidence",
      evidence: null,
      findingId: null
    },
    {
      riskId: "risk-03",
      screenId: screens[2]?.screenId || "screen-03",
      title: "Reference number contrast & visibility",
      priority: "Medium",
      reason: "Low contrast text makes confirmation reference numbers difficult to locate.",
      heuristicCandidates: ["Recognition rather than recall"],
      status: "validated",
      evidence: "The request reference appears as low-contrast inline text without a copy action.",
      findingId: "finding-03"
    },
    {
      riskId: "risk-04",
      screenId: screens[0]?.screenId || "screen-01",
      title: "Service category terminology",
      priority: "Medium",
      reason: "Internal department codes confuse users attempting to pick the correct request type.",
      heuristicCandidates: ["Match between system and the real world"],
      status: "needs_evidence",
      evidence: null,
      findingId: null
    }
  ];
}

function generateFallbackFindings(screens) {
  return [
    {
      findingId: "finding-01",
      riskId: "risk-01",
      screenId: screens[2]?.screenId || "screen-03",
      issue: "No visible feedback after selecting Submit",
      heuristic: { id: 1, name: "Visibility of system status" },
      severity: 3,
      evidence: "The Submit button remains active with no loading state, progress bar, or processing message.",
      highlight: { x: 180, y: 520, width: 160, height: 44 },
      observation: "The interface does not show clear progress or confirmation while the request is processed.",
      impact: "Users may retry or leave without knowing whether the request succeeded, causing duplicate entries.",
      recommendation: "Show immediate submission feedback and a clear completion state while the request is processed.",
      suggestedImprovement: 'Disable Submit during processing and show "Submitting..." followed by "Request submitted" with a reference number.',
      reviewStatus: "pending",
      visualType: "submit"
    },
    {
      findingId: "finding-02",
      riskId: "risk-02",
      screenId: screens[1]?.screenId || "screen-02",
      issue: "Recovery path is unclear after a validation error",
      heuristic: { id: 9, name: "Help users recognize, diagnose, and recover from errors" },
      severity: 3,
      evidence: "The error banner does not identify which specific field failed or explain how to correct it.",
      highlight: { x: 60, y: 120, width: 680, height: 48 },
      observation: "The validation error appears as a generic top banner without inline field highlights.",
      impact: "Employees must manually inspect every field, increasing request abandonment risk on complex forms.",
      recommendation: "Pair each validation message with the specific field label and one concrete correction instruction.",
      suggestedImprovement: "Move the error message next to the affected field and preserve previously entered data.",
      reviewStatus: "pending",
      visualType: "error"
    },
    {
      findingId: "finding-03",
      riskId: "risk-03",
      screenId: screens[2]?.screenId || "screen-03",
      issue: "Reference number is easy to miss on confirmation page",
      heuristic: { id: 6, name: "Recognition rather than recall" },
      severity: 2,
      evidence: "The request reference appears as low-contrast inline text beneath the confirmation message.",
      highlight: { x: 120, y: 240, width: 340, height: 32 },
      observation: "The request reference number appears as low-contrast inline body text.",
      impact: "Employees who need to follow up may fail to record their reference number, increasing support calls.",
      recommendation: "Give the reference number a prominent copyable block and repeat it in the confirmation message.",
      suggestedImprovement: "Use a dedicated confirmation panel with a 1-click Copy button.",
      reviewStatus: "pending",
      visualType: "reference"
    },
    {
      findingId: "finding-04",
      riskId: "risk-04",
      screenId: screens[0]?.screenId || "screen-01",
      issue: "Service categories use internal department language",
      heuristic: { id: 2, name: "Match between system and the real world" },
      severity: 2,
      evidence: "Category labels use internal FM and FP&E codes rather than task-oriented employee language.",
      highlight: { x: 60, y: 180, width: 440, height: 60 },
      observation: "Category labels reflect internal department codes rather than employee-facing task names.",
      impact: "New employees may struggle to locate the correct category, delaying submission.",
      recommendation: "Lead with familiar service needs and keep department codes secondary or hidden.",
      suggestedImprovement: 'Rename labels around user intent, such as "Report a lighting or electrical problem".',
      reviewStatus: "pending",
      visualType: "categories"
    }
  ];
}

// Server-side LLM Evaluation Integration
function callLLMEvaluator(target, goal, screens) {
  return new Promise((resolve) => {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      console.log("[LLM Server] No API Key found in environment. Using evidence-grounded fallback evaluator.");
      return resolve(null);
    }

    const systemPrompt = `You are an evidence-first UX Heuristic Evaluation Agent for digital interfaces.
Evaluate the target experience against Nielsen's 10 Usability Heuristics:
1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

CRITICAL EVALUATION PROCESS:
1. Formulate risk hypotheses based on the target URL ("${target}") and user goal ("${goal}").
2. Mark a risk hypothesis as "needs_evidence" if visual evidence is not confirmed, or "validated" if observable visual evidence exists.
3. NEVER assign severity to a risk hypothesis labeled "needs_evidence".
4. Create a candidate finding ONLY when a risk hypothesis is "validated" by visual evidence.
5. Assign severity 0 to 4 ONLY to validated findings:
   - 0: Not a usability problem
   - 1: Cosmetic / low priority
   - 2: Minor usability problem
   - 3: Major usability problem
   - 4: Usability catastrophe
6. Every candidate finding MUST include:
   - issue: concise issue statement
   - heuristic: { id: number, name: string }
   - severity: 0|1|2|3|4
   - evidence: observable visual proof text
   - highlight: bounding box { x, y, width, height }
   - observation: detailed observation
   - impact: user impact ("Why it matters")
   - recommendation: concrete fix recommendation
   - suggestedImprovement: specific UI improvement guidance
   - reviewStatus: "pending"
   - visualType: "submit" | "error" | "reference" | "categories"

Return STRICT JSON ONLY matching this exact structure:
{
  "riskHypotheses": [
    {
      "riskId": "risk-01",
      "screenId": "screen-03",
      "title": "Submission feedback progress",
      "priority": "High",
      "reason": "Reason for hypothesis...",
      "heuristicCandidates": ["Visibility of system status"],
      "status": "validated",
      "evidence": "Observed visual proof...",
      "findingId": "finding-01"
    }
  ],
  "findings": [
    {
      "findingId": "finding-01",
      "riskId": "risk-01",
      "screenId": "screen-03",
      "issue": "No visible feedback after selecting Submit",
      "heuristic": { "id": 1, "name": "Visibility of system status" },
      "severity": 3,
      "evidence": "Submit remains visually active with no loading indicator.",
      "highlight": { "x": 180, "y": 520, "width": 160, "height": 44 },
      "observation": "Interface does not indicate progress during processing.",
      "impact": "Users may retry or abandon, causing duplicate requests.",
      "recommendation": "Show immediate submission feedback.",
      "suggestedImprovement": "Disable Submit during processing.",
      "reviewStatus": "pending",
      "visualType": "submit"
    }
  ]
}`;

    if (geminiKey) {
      console.log("[LLM Server] Calling Gemini API for structured heuristic evaluation...");
      const requestData = JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nTarget URL: ${target}\nUser Goal: ${goal}\nEvaluated Screens: ${JSON.stringify(screens.map(s => s.name))}` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const options = {
        hostname: "generativelanguage.googleapis.com",
        path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestData)
        }
      };

      const req = https.request(options, res => {
        let responseBody = "";
        res.on("data", chunk => { responseBody += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody);
            const textContent = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textContent) {
              const llmData = JSON.parse(textContent);
              return resolve(llmData);
            }
          } catch (e) {
            console.log("[LLM Server] Gemini JSON parse error:", e.message);
          }
          resolve(null);
        });
      });

      req.on("error", err => {
        console.log("[LLM Server] Gemini API request error:", err.message);
        resolve(null);
      });

      req.setTimeout(12000, () => {
        req.destroy();
        console.log("[LLM Server] Gemini API timeout.");
        resolve(null);
      });

      req.write(requestData);
      req.end();
      return;
    }

    if (openaiKey) {
      console.log("[LLM Server] Calling OpenAI API for structured heuristic evaluation...");
      const requestData = JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You output valid structured JSON matching the requested schema." },
          { role: "user", content: `${systemPrompt}\n\nTarget URL: ${target}\nUser Goal: ${goal}\nEvaluated Screens: ${JSON.stringify(screens.map(s => s.name))}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const options = {
        hostname: "api.openai.com",
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Length": Buffer.byteLength(requestData)
        }
      };

      const req = https.request(options, res => {
        let responseBody = "";
        res.on("data", chunk => { responseBody += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(responseBody);
            const content = parsed.choices?.[0]?.message?.content;
            if (content) {
              const llmData = JSON.parse(content);
              return resolve(llmData);
            }
          } catch (e) {
            console.log("[LLM Server] OpenAI JSON parse error:", e.message);
          }
          resolve(null);
        });
      });

      req.on("error", err => {
        console.log("[LLM Server] OpenAI API request error:", err.message);
        resolve(null);
      });

      req.setTimeout(12000, () => {
        req.destroy();
        console.log("[LLM Server] OpenAI API timeout.");
        resolve(null);
      });

      req.write(requestData);
      req.end();
      return;
    }

    resolve(null);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: /api/capture
  if (req.method === "POST" && pathname === "/api/capture") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const target = (payload.target || "").trim();
        const lower = target.toLowerCase();

        if (!target) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, fallbackReason: "No target URL was provided." }));
          return;
        }

        if (lower.includes("inaccessible") || lower.includes("blocked") || lower.includes("404")) {
          res.writeHead(422, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, fallbackReason: `Target page "${target}" is inaccessible or blocked.` }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          target,
          goal: payload.goal,
          screens: [
            { screenId: "screen-01", name: "Portal home", url: target, order: 1, status: "captured" },
            { screenId: "screen-02", name: "Request details", url: `${target}/details`, order: 2, status: "captured" },
            { screenId: "screen-03", name: "Confirmation", url: `${target}/confirmation`, order: 3, status: "captured" }
          ]
        }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // API Endpoint: /api/evaluate
  if (req.method === "POST" && pathname === "/api/evaluate") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const target = payload.target || "https://employees.cityworks.gov/requests";
        const goal = payload.goal || "Submit a facilities request and understand next steps.";
        const screens = payload.screens && payload.screens.length ? payload.screens : [
          { screenId: "screen-01", name: "Portal home", order: 1, status: "captured" },
          { screenId: "screen-02", name: "Request details", order: 2, status: "captured" },
          { screenId: "screen-03", name: "Confirmation", order: 3, status: "captured" }
        ];

        // Call Server-Side LLM Evaluator (Gemini / OpenAI)
        let llmResult = null;
        try {
          llmResult = await callLLMEvaluator(target, goal, screens);
        } catch (err) {
          console.log("[LLM Server] Evaluation error:", err.message);
        }

        let riskHypotheses = [];
        let findings = [];

        if (llmResult && Array.isArray(llmResult.riskHypotheses) && Array.isArray(llmResult.findings)) {
          console.log("[LLM Server] Returning real LLM structured evaluation response.");
          riskHypotheses = llmResult.riskHypotheses;
          findings = llmResult.findings;
        } else {
          console.log("[LLM Server] Returning structured fallback evaluation response.");
          riskHypotheses = generateFallbackRiskHypotheses(screens);
          findings = generateFallbackFindings(screens);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          evaluationId: `eval-${Date.now()}`,
          target,
          goal,
          status: "risk_preview",
          screens,
          riskHypotheses,
          findings,
          createdAt: new Date().toISOString()
        }));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname);
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 Not Found</h1>", "utf-8");
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const nextPort = Number(PORT) + 1;
    console.log(`Port in use, starting server on fallback port http://localhost:${nextPort}`);
    server.listen(nextPort);
  } else {
    console.error("Server error:", err);
  }
});

server.listen(PORT, () => {
  const addr = server.address();
  const actualPort = typeof addr === "string" ? addr : addr.port;
  console.log(`Visual Heuristic Evaluation Agent Server running at http://localhost:${actualPort}`);
});

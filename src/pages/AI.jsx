import React, { useEffect, useMemo, useRef, useState } from "react";
import { aiRequest, mealAiRequest } from "../auth/auth";

function localInsight(data) {
  const readings = data.glucose || [];
  const meals = data.meals || [];
  const insulin = data.insulin || [];

  if (!readings.length) {
    return "Add a few glucose, meal, and insulin entries and I can start finding patterns in your own history.";
  }

  const avg = Math.round(
    readings.reduce((a, x) => a + Number(x.value || 0), 0) / readings.length
  );

  const highs = readings.filter((x) => Number(x.value) > 180).length;
  const lows = readings.filter((x) => Number(x.value) < 70).length;

  const mealCarbs = meals.reduce(
    (a, x) => a + Number(x.carbs || 0),
    0
  );

  return `You have ${readings.length} glucose readings, ${
    meals.length
  } meals, and ${insulin.length} insulin entries. Your average logged glucose is about ${avg} mg/dL, with ${highs} reading(s) above 180 and ${lows} below 70. ${
    mealCarbs
      ? `Your logged meals total about ${mealCarbs} g of carbs.`
      : ""
  } This is a pattern summary, not a diagnosis or dosing recommendation.`;
}

function personalPatterns(data) {
  const g = data.glucose || [];
  const meals = data.meals || [];

  if (!g.length) {
    return ["Add glucose readings to unlock personal pattern detection."];
  }

  const patterns = [];

  const high = g.filter((x) => Number(x.value) > 180);
  const low = g.filter((x) => Number(x.value) < 70);

  if (high.length) {
    patterns.push(
      `${high.length} of ${g.length} logged readings are above 180 mg/dL.`
    );
  }

  if (low.length) {
    patterns.push(
      `${low.length} of ${g.length} logged readings are below 70 mg/dL.`
    );
  }

  const afterMeal = g.filter((x) => /after/i.test(x.context || ""));

  if (afterMeal.length >= 2) {
    const avgAfter = Math.round(
      afterMeal.reduce((s, x) => s + Number(x.value), 0) /
        afterMeal.length
    );

    patterns.push(
      `Your after-meal readings average about ${avgAfter} mg/dL across ${afterMeal.length} logged readings.`
    );
  }

  if (
    meals.length &&
    meals.some((x) => Number(x.carbs) >= 60)
  ) {
    patterns.push(
      "Some logged meals contain 60 g or more of carbohydrates; compare these entries with your later readings to look for your own patterns."
    );
  }

  return patterns.slice(0, 4);
}

function weeklyReport(data) {
  const g = data.glucose || [];
  const m = data.meals || [];
  const i = data.insulin || [];

  const avg = g.length
    ? Math.round(
        g.reduce((s, x) => s + Number(x.value || 0), 0) /
          g.length
      )
    : null;

  const high = g.filter((x) => Number(x.value) > 180).length;
  const low = g.filter((x) => Number(x.value) < 70).length;

  return {
    avg,
    high,
    low,
    readings: g.length,
    meals: m.length,
    insulin: i.length,
    carbs: m.reduce(
      (s, x) => s + Number(x.carbs || 0),
      0
    ),
  };
}

function parseVoice(text) {
  const t = text.toLowerCase();

  const glucose = t.match(
    /(?:glucose|sugar|reading)\s*(?:is|was)?\s*(\d{2,3})/i
  );

  const insulin = t.match(
    /(?:insulin|dose)\s*(?:is|was)?\s*(\d+(?:\.\d+)?)\s*(?:units?|u)?/i
  );

  const carbs = t.match(
    /(?:carbs?|carbohydrates?)\s*(?:is|are|was)?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)?/i
  );

  return {
    glucose: glucose ? Number(glucose[1]) : null,
    insulin: insulin ? Number(insulin[1]) : null,
    carbs: carbs ? Number(carbs[1]) : null,
  };
}

export default function AI({
  data,
  onAddGlucose,
  onAddInsulin,
  onAddMeal,
}) {
  const [tab, setTab] = useState("assistant");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: localInsight(data),
    },
  ]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [scanImage, setScanImage] = useState(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [voiceText, setVoiceText] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);

  const recognitionRef = useRef(null);

  const report = useMemo(
    () => weeklyReport(data),
    [data]
  );

  const patterns = useMemo(
    () => personalPatterns(data),
    [data]
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  // =========================================================
  // AI CHAT
  // =========================================================

  async function send(e) {
    e?.preventDefault();

    const text = input.trim();

    if (!text || busy) return;

    const next = [
      ...messages,
      {
        role: "user",
        text,
      },
    ];

    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const result = await aiRequest({
        message: text,
        history: next.slice(-8),
        data: {
          glucose: data.glucose.slice(0, 30),
          insulin: data.insulin.slice(0, 30),
          meals: data.meals.slice(0, 30),
        },
      });

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            result?.reply ||
            "I couldn't generate a response right now.",
        },
      ]);
    } catch (error) {
      console.error("Sugr AI error:", error);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `AI request failed: ${
            error?.message || "Unknown error"
          }`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  // =========================================================
  // VOICE LOGGING
  // =========================================================

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceText(
        "Voice recognition is not supported by this browser. Try Chrome on Android or desktop."
      );
      return;
    }

    const r = new SpeechRecognition();

    recognitionRef.current = r;

    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = false;

    setVoiceText("");
    setVoiceBusy(true);

    r.onresult = (e) => {
      setVoiceText(
        Array.from(e.results)
          .map((x) => x[0].transcript)
          .join(" ")
      );
    };

    r.onerror = () => {
      setVoiceBusy(false);
      setVoiceText(
        "I couldn't hear that. Please try again."
      );
    };

    r.onend = () => {
      setVoiceBusy(false);
    };

    r.start();
  }

  // =========================================================
  // MEAL SCANNER
  // =========================================================

  function scanMeal(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    setScanResult(null);

    const reader = new FileReader();

    reader.onload = () => {
      setScanImage(reader.result);
    };

    reader.readAsDataURL(file);
  }

  async function analyzeMeal() {
    if (!scanImage || scanBusy) return;

    setScanBusy(true);

    try {
      const result = await mealAiRequest(scanImage);

      setScanResult(result);
    } catch (error) {
      console.error("Meal AI error:", error);

      setScanResult({
        title: "Meal analysis failed",
        items: [
          error?.message ||
            "Unable to analyze the meal image.",
        ],
        carbs: null,
        note:
          "Please verify the meal manually before saving.",
      });
    } finally {
      setScanBusy(false);
    }
  }

  // =========================================================
  // VOICE SAVE
  // =========================================================

  function addVoiceEntries() {
    const parsed = parseVoice(voiceText);

    if (parsed.glucose) {
      onAddGlucose(parsed.glucose, "Voice log");
    }

    if (parsed.insulin) {
      onAddInsulin(parsed.insulin, "Voice log");
    }

    if (parsed.carbs) {
      onAddMeal("Voice meal", parsed.carbs);
    }

    setVoiceText("");
  }

  // =========================================================
  // DOCTOR REPORT
  // =========================================================

  function printDoctorReport() {
    window.print();
  }

  const tabs = [
    ["assistant", "✦ AI Assistant"],
    ["patterns", "🔎 Why changed?"],
    ["meal", "📸 Meal Scanner"],
    ["voice", "🎤 Voice Log"],
    ["weekly", "📊 Weekly Report"],
    ["doctor", "🩺 Doctor Report"],
    ["offline", "☁ Offline & Sync"],
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <section className="ai-page">

      {/* HERO */}
      <div className="ai-hero panel">
        <div className="ai-orb">✦</div>

        <div>
          <div className="eyebrow">
            SUGR AI LAB
          </div>

          <h2>
            Your data, explained simply
          </h2>

          <p>
            Personal insights, meal recognition,
            voice logging and reports — built
            around your own Sugr history.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="ai-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={
              tab === id ? "active" : ""
            }
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* =====================================================
          AI ASSISTANT
      ===================================================== */}

      {tab === "assistant" && (
        <div className="ai-chat panel">

          <div className="ai-messages">

            {messages.map((m, i) => (
              <div
                key={i}
                className={`ai-message ${m.role}`}
              >
                <div className="ai-avatar">
                  {m.role === "assistant"
                    ? "✦"
                    : "You"}
                </div>

                <div className="ai-bubble">
                  {m.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="ai-message assistant">
                <div className="ai-avatar">
                  ✦
                </div>

                <div className="ai-bubble">
                  Thinking about your Sugr data…
                </div>
              </div>
            )}

          </div>

          <form
            className="ai-input"
            onSubmit={send}
          >
            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="Ask Sugr AI about your data…"
              disabled={busy}
            />

            <button
              className="primary-btn"
              disabled={busy || !input.trim()}
            >
              {busy ? "Thinking…" : "Send"}
            </button>
          </form>

          <div className="ai-disclaimer">
            Sugr AI is for education and pattern
            tracking. It does not diagnose,
            prescribe treatment, or calculate
            insulin doses.
          </div>
        </div>
      )}

      {/* =====================================================
          PATTERNS
      ===================================================== */}

      {tab === "patterns" && (
        <div className="feature-grid">

          <section className="panel feature-card feature-wide">

            <div className="feature-title">
              <span>🔎</span>

              <div>
                <h3>
                  Why did my glucose change?
                </h3>

                <p>
                  Sugr looks for associations
                  in your own logged data.
                </p>
              </div>
            </div>

            <div className="pattern-list">

              {patterns.map((x, i) => (
                <div
                  key={i}
                  className="pattern"
                >
                  <b>{i + 1}</b>
                  <span>{x}</span>
                </div>
              ))}

            </div>

            <p className="small-note">
              These are observations from your
              entries, not proof that a meal,
              activity, stressor, or other factor
              caused a glucose change.
            </p>

          </section>

          <section className="panel feature-card">

            <h3>
              Ask Sugr about this
            </h3>

            <p>
              Try questions such as:
            </p>

            <div className="suggestions">

              {[
                "Compare my morning and evening readings",
                "What patterns do you see after meals?",
                "What should I ask my clinician?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTab("assistant");
                  }}
                >
                  {q}
                </button>
              ))}

            </div>

          </section>

        </div>
      )}

      {/* =====================================================
          MEAL SCANNER
      ===================================================== */}

      {tab === "meal" && (
        <div className="feature-grid">

          <section className="panel feature-card">

            <div className="feature-title">
              <span>📸</span>

              <div>
                <h3>
                  AI Meal Scanner
                </h3>

                <p>
                  Take a photo of your food and
                  get an estimated breakdown.
                  Always confirm before logging.
                </p>
              </div>
            </div>

            <input
              className="file-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={scanMeal}
            />

            {scanImage && (
              <img
                className="meal-preview"
                src={scanImage}
                alt="Selected meal"
              />
            )}

            <button
              className="primary-btn"
              disabled={!scanImage || scanBusy}
              onClick={analyzeMeal}
            >
              {scanBusy
                ? "Analyzing…"
                : "Analyze meal"}
            </button>

          </section>

          <section className="panel feature-card">

            <h3>
              AI estimate
            </h3>

            {scanResult ? (
              <>
                <h4>
                  {scanResult.title}
                </h4>

                <ul className="scan-list">
                  {(scanResult.items || []).map(
                    (x, i) => (
                      <li key={i}>{x}</li>
                    )
                  )}
                </ul>

                {scanResult.carbs != null && (
                  <div className="estimate">
                    <b>
                      {scanResult.carbs} g
                    </b>

                    <span>
                      estimated carbohydrates
                    </span>
                  </div>
                )}

                <p className="small-note">
                  {scanResult.note}
                </p>

                {scanResult.carbs != null && (
                  <button
                    className="secondary-btn"
                    onClick={() =>
                      onAddMeal(
                        scanResult.title ||
                          "Scanned meal",
                        Number(
                          scanResult.carbs
                        )
                      )
                    }
                  >
                    Save as meal
                  </button>
                )}
              </>
            ) : (
              <p className="empty-feature">
                Upload a meal photo to see
                an AI estimate.
              </p>
            )}

          </section>

        </div>
      )}

      {/* =====================================================
          VOICE
      ===================================================== */}

      {tab === "voice" && (
        <div className="feature-grid">

          <section className="panel feature-card voice-card">

            <div className="voice-mic">
              🎤
            </div>

            <h3>
              Voice Logging
            </h3>

            <p>
              Say something like:
              “Glucose 142, insulin 6 units,
              carbs 45 grams.”
            </p>

            <button
              className={`primary-btn voice-button ${
                voiceBusy ? "recording" : ""
              }`}
              onClick={startVoice}
            >
              {voiceBusy
                ? "Listening…"
                : "Start voice log"}
            </button>

            {voiceText && (
              <div className="transcript">
                <b>Transcript</b>
                <p>{voiceText}</p>
              </div>
            )}

          </section>

          <section className="panel feature-card">

            <h3>
              Review before saving
            </h3>

            {voiceText ? (
              <>
                <div className="parsed-grid">

                  {Object.entries(
                    parseVoice(voiceText)
                  ).map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>

                      <b>
                        {v ?? "—"}

                        {v != null &&
                          k !== "glucose" &&
                          (k === "insulin"
                            ? " U"
                            : " g")}

                        {v != null &&
                          k === "glucose" &&
                          " mg/dL"}
                      </b>
                    </div>
                  ))}

                </div>

                <button
                  className="secondary-btn"
                  onClick={addVoiceEntries}
                >
                  Save detected entries
                </button>
              </>
            ) : (
              <p className="empty-feature">
                Your spoken entries will appear
                here for review before they are saved.
              </p>
            )}

          </section>

        </div>
      )}

      {/* =====================================================
          WEEKLY REPORT
      ===================================================== */}

      {tab === "weekly" && (
        <section className="panel report-card">

          <div className="report-head">

            <div>
              <div className="eyebrow">
                SUGR WEEKLY REVIEW
              </div>

              <h3>
                Your data snapshot
              </h3>
            </div>

            <button
              className="secondary-btn"
              onClick={() => {
                setInput(
                  "Explain my weekly report"
                );
                setTab("assistant");
              }}
            >
              Ask AI
            </button>

          </div>

          <div className="report-stats">

            <div>
              <b>{report.avg ?? "—"}</b>
              <span>avg glucose</span>
            </div>

            <div>
              <b>{report.readings}</b>
              <span>readings</span>
            </div>

            <div>
              <b>{report.meals}</b>
              <span>meals</span>
            </div>

            <div>
              <b>{report.insulin}</b>
              <span>insulin logs</span>
            </div>

            <div>
              <b>{report.carbs}</b>
              <span>logged carbs (g)</span>
            </div>

          </div>

          <div className="report-sections">

            <div>
              <h4>
                What Sugr noticed
              </h4>

              <ul>
                {patterns.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4>
                Missing context
              </h4>

              <p>
                Not every day needs every field.
                More consistent logging can make
                personal trends easier to interpret.
              </p>
            </div>

          </div>

        </section>
      )}

      {/* =====================================================
          DOCTOR REPORT
      ===================================================== */}

      {tab === "doctor" && (
        <section className="panel doctor-report">

          <div className="report-head">

            <div>
              <div className="eyebrow">
                CLINIC VISIT MODE
              </div>

              <h3>
                Doctor discussion report
              </h3>

              <p>
                A concise summary you can print
                or save as PDF from your browser.
              </p>
            </div>

            <button
              className="primary-btn"
              onClick={printDoctorReport}
            >
              Print / Save PDF
            </button>

          </div>

          <div className="doctor-sheet">

            <h2>
              Sugr Health Tracking Summary
            </h2>

            <p>
              Generated{" "}
              {new Date().toLocaleDateString()}
            </p>

            <hr />

            <h4>
              Logged data
            </h4>

            <p>
              Glucose readings:{" "}
              <b>{report.readings}</b>
              {" · "}
              Meals:{" "}
              <b>{report.meals}</b>
              {" · "}
              Insulin entries:{" "}
              <b>{report.insulin}</b>
            </p>

            <p>
              Average logged glucose:{" "}
              <b>
                {report.avg ?? "No data"}
              </b>{" "}
              mg/dL
            </p>

            <h4>
              Patterns to discuss
            </h4>

            <ul>
              {patterns.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>

            <h4>
              Questions for my clinician
            </h4>

            <ul>
              <li>
                Are there patterns in my readings
                that I should review?
              </li>

              <li>
                Is my current monitoring routine
                appropriate for me?
              </li>

              <li>
                What additional information would
                be useful at my next visit?
              </li>
            </ul>

            <p className="small-note">
              This report summarizes user-entered
              tracking data. It is not a medical
              diagnosis or treatment plan.
            </p>

          </div>

        </section>
      )}

      {/* =====================================================
          OFFLINE & SYNC
      ===================================================== */}

      {tab === "offline" && (
        <section className="feature-grid">

          <section className="panel feature-card">

            <div className="sync-status">

              <span
                className={
                  navigator.onLine
                    ? "online-dot"
                    : "offline-dot"
                }
              />

              <div>
                <h3>
                  {navigator.onLine
                    ? "Online"
                    : "Offline mode"}
                </h3>

                <p>
                  Sugr stores your entries locally
                  first, so logging can continue
                  without internet.
                </p>
              </div>

            </div>

            <div className="sync-points">
              <div>
                ✓ Glucose, insulin and meals
                work offline
              </div>

              <div>
                ✓ Dashboard and history remain
                available
              </div>

              <div>
                ✓ Data stays in this browser until
                you export or connect a cloud backend
              </div>
            </div>

          </section>

          <section className="panel feature-card">

            <h3>
              Backup your Sugr data
            </h3>

            <p>
              Export a local JSON backup so you
              can keep a copy outside the browser.
            </p>

            <button
              className="secondary-btn"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(data, null, 2)],
                  {
                    type: "application/json",
                  }
                );

                const a =
                  document.createElement("a");

                a.href =
                  URL.createObjectURL(blob);

                a.download = `sugr-backup-${new Date()
                  .toISOString()
                  .slice(0, 10)}.json`;

                a.click();

                URL.revokeObjectURL(a.href);
              }}
            >
              Export backup
            </button>

            <p className="small-note">
              Cloud synchronization is enabled
              when the Sugr server is connected to
              MongoDB. Your account token
              authenticates each sync request.
            </p>

          </section>

        </section>
      )}

    </section>
  );
}
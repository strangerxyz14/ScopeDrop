// Offline tests for supabase/functions/_shared/deal-guards.ts.
// Run: npm run test:deal-guards
// (esbuild bundles this file for Node and pipes it into node.)
import { guardCapitalEvent, type DealGuardInput, type DealStatus } from "../supabase/functions/_shared/deal-guards.ts";

type Expect =
  | { rejected: true }
  | { status?: DealStatus | DealStatus[]; amountUsd?: number | null; valuationUsd?: number | null };

interface Case {
  name: string;
  input: Omit<DealGuardInput, "signalDate" | "valuationUsd" | "content"> & { content?: string; valuationUsd?: number | null };
  expect: Expect;
}

const SIGNAL_DATE = "2026-10-30T09:00:00Z";

const cases: Case[] = [
  // ── From the 2026-10-31 audit ──
  {
    name: "Anthropic/Riot cloud deal → rejected",
    input: {
      kind: "acquisition",
      title: "Anthropic strikes $9 billion cloud deal with Riot Platforms",
      content: "Anthropic has agreed to rent computing capacity from bitcoin miner Riot Platforms in a deal worth up to $9 billion over ten years.",
      amountUsd: 9e9,
    },
    expect: { rejected: true },
  },
  {
    name: "Nvidia $250B OpenAI data-center push → rejected",
    input: {
      kind: "acquisition",
      title: "Nvidia puts $250B on table for OpenAI's data center push",
      content: "Nvidia is prepared to commit as much as $250 billion to support OpenAI's data center buildout.",
      amountUsd: 250e9,
    },
    expect: { rejected: true },
  },
  {
    name: "Nvidia $500B funding package → rejected",
    input: {
      kind: "funding",
      title: "Apollo, Blackstone and others partnering with Nvidia on a $500B funding package for AI infrastructure",
      content: "A group of private credit firms is working with Nvidia on a financing package to pay for data centers.",
      amountUsd: 500e9,
    },
    expect: { rejected: true },
  },
  {
    name: "Shein $50B IPO valuation → valuation only",
    input: {
      kind: "ipo",
      title: "Shein will struggle to justify up to $50 billion Hong Kong IPO valuation",
      content: "The fast-fashion retailer is preparing a Hong Kong listing that bankers say could value it at up to $50 billion.",
      amountUsd: 50e9,
    },
    expect: { amountUsd: null, valuationUsd: 50e9 },
  },
  {
    name: "Firmus $43b ASX debut → valuation only",
    input: {
      kind: "ipo",
      title: "Firmus eyes $43b ASX debut as AI cloud demand soars",
      content: "The Australian AI infrastructure company is preparing to list on the ASX.",
      amountUsd: 43e9,
    },
    expect: { status: "reported", amountUsd: null, valuationUsd: 43e9 },
  },
  {
    name: "OpenAI seeks $30B → reported",
    input: { kind: "funding", title: "OpenAI seeks $30B in new funding from SoftBank and others", amountUsd: 30e9 },
    expect: { status: "reported", amountUsd: 30e9 },
  },
  {
    name: "DeepSeek looks to raise $12B → reported",
    input: { kind: "funding", title: "DeepSeek looks to raise $12B", amountUsd: 12e9 },
    expect: { status: "reported" },
  },
  {
    name: "Schneider in advanced talks to buy PTC → reported",
    input: { kind: "acquisition", title: "Schneider in advanced talks to buy PTC", amountUsd: null },
    expect: { status: "reported" },
  },
  {
    name: "DoorDash acquiring Instacart → agreed/closed, kept",
    input: {
      kind: "acquisition",
      title: "DoorDash acquiring Instacart in $17 billion deal",
      content: "DoorDash said on Thursday it would buy Instacart in a deal valued at $17 billion, including debt.",
      amountUsd: 17e9,
    },
    expect: { status: ["agreed", "closed"], amountUsd: 17e9 },
  },
  {
    name: "Commonwealth Fusion Systems raises another $1B → closed",
    input: { kind: "funding", title: "Commonwealth Fusion Systems raises another $1B", amountUsd: 1e9 },
    expect: { status: "closed", amountUsd: 1e9 },
  },
  {
    name: "Manus / Meta $2B deal unwinds → rejected",
    input: { kind: "acquisition", title: "Manus goes solo again as Meta's $2B AI deal unwinds", amountUsd: 2e9 },
    expect: { rejected: true },
  },
  {
    name: "Groq engineers' lawsuit over 2025 Nvidia deal → rejected",
    input: {
      kind: "acquisition",
      title: "Former Groq engineers file a lawsuit over payouts from Groq's deal with Nvidia in 2025",
      amountUsd: 20e9,
    },
    expect: { rejected: true },
  },
  // ── Extra coverage ──
  {
    name: "Niantic changes its name → rejected",
    input: { kind: "acquisition", title: "Niantic changes its name to Niantic Spatial after games sale", amountUsd: null },
    expect: { rejected: true },
  },
  {
    name: "Deal placed 'last year' → rejected",
    input: { kind: "acquisition", title: "Inside the deal Google struck to buy Wiz last year", amountUsd: 32e9 },
    expect: { rejected: true },
  },
  {
    name: "Deal placed in an earlier year → rejected",
    input: { kind: "acquisition", title: "How Nvidia's $20B Groq deal in 2025 reshaped inference chips", amountUsd: 20e9 },
    expect: { rejected: true },
  },
  {
    name: "IPO planned for a future year is kept",
    input: { kind: "ipo", title: "Revolut plans IPO in 2027", amountUsd: null },
    expect: { status: "reported" },
  },
  {
    name: "Body mentioning a prior round doesn't make it stale",
    input: {
      kind: "funding",
      title: "Acme Robotics raises $40M Series B, plans expansion into Europe",
      content: "Acme Robotics, founded in 2019, previously raised $12M in 2024. The company could use the money to hire.",
      amountUsd: 40e6,
    },
    expect: { status: "closed", amountUsd: 40e6 },
  },
  {
    name: "Round with a separate valuation keeps both",
    input: {
      kind: "funding",
      title: "Lumen AI raises $100M at a $1B valuation",
      amountUsd: 100e6,
      valuationUsd: 1e9,
    },
    expect: { status: "closed", amountUsd: 100e6, valuationUsd: 1e9 },
  },
  {
    name: "Amount the LLM copied from the valuation → valuation only",
    input: {
      kind: "funding",
      title: "Lumen AI raises new funding at a $1B valuation",
      amountUsd: 1e9,
      valuationUsd: null,
    },
    expect: { amountUsd: null, valuationUsd: 1e9 },
  },
  {
    name: "Pre-IPO round 'ahead of its debut' keeps the amount",
    input: { kind: "funding", title: "Klarna raises $100M ahead of its stock market debut", amountUsd: 100e6 },
    expect: { status: "closed", amountUsd: 100e6 },
  },
  {
    name: "Acquisition with 'partnership' and a buy verb is kept",
    input: { kind: "acquisition", title: "Salesforce to buy Informatica, ending years-long partnership", amountUsd: 8e9 },
    expect: { status: "agreed" },
  },
  {
    name: "Plain acquisition headline defaults to agreed",
    input: { kind: "acquisition", title: "Stripe and Bridge: what the stablecoin deal means", amountUsd: 1.1e9 },
    expect: { status: "agreed" },
  },
  {
    name: "Completed acquisition → closed",
    input: { kind: "acquisition", title: "HPE completes $14B Juniper acquisition", amountUsd: 14e9 },
    expect: { status: "closed" },
  },
  {
    name: "Funding with capex language → rejected",
    input: { kind: "funding", title: "Meta lines up $30B for capex on Louisiana data center", amountUsd: 30e9 },
    expect: { rejected: true },
  },
];

let failed = 0;
for (const c of cases) {
  const res = guardCapitalEvent({
    content: null,
    valuationUsd: null,
    ...c.input,
    signalDate: SIGNAL_DATE,
  });
  const problems: string[] = [];
  if ("rejected" in c.expect) {
    if (res.ok) problems.push(`expected rejection, got ${res.dealStatus}`);
  } else if (!res.ok) {
    problems.push(`unexpected rejection (${res.reason})`);
  } else {
    const e = c.expect;
    if (e.status !== undefined) {
      const allowed = Array.isArray(e.status) ? e.status : [e.status];
      if (!allowed.includes(res.dealStatus)) problems.push(`status ${res.dealStatus}, expected ${allowed.join("|")}`);
    }
    if (e.amountUsd !== undefined && res.amountUsd !== e.amountUsd) problems.push(`amount ${res.amountUsd}, expected ${e.amountUsd}`);
    if (e.valuationUsd !== undefined && res.valuationUsd !== e.valuationUsd) problems.push(`valuation ${res.valuationUsd}, expected ${e.valuationUsd}`);
  }
  const got = res.ok
    ? `kept: ${res.dealStatus}, amount=${res.amountUsd ?? "null"}, valuation=${res.valuationUsd ?? "null"}`
    : `rejected: ${res.reason}`;
  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "ok  "}  ${c.name}\n      ${got}${problems.length ? `\n      ✗ ${problems.join("; ")}` : ""}`);
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
if (failed) process.exit(1);

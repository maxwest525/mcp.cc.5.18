import { useMemo, useRef, useState, useLayoutEffect } from "react";
import HyperMCPShell from "@/components/layout/HyperMCPShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Plus, Wand2, Upload, Download, ArrowRightLeft, AlertTriangle, CheckCircle2,
  Database, Zap, Clock, History, Play, Trash2, Settings2, Eye, RotateCcw,
  Link2, Unlink, FileWarning, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type FieldType = "string" | "number" | "boolean" | "date" | "email" | "phone" | "enum";

interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  sample?: string;
}

interface Mapping {
  sourceKey: string;
  destKey: string;
  transform?: string;
  fallback?: string;
  conditional?: string;
  ignore?: boolean;
}

interface SystemPair {
  id: string;
  source: string;
  destination: string;
  sourceFields: SchemaField[];
  destFields: SchemaField[];
  mappings: Mapping[];
  lastSync: string;
  errors: number;
  unmapped: number;
  rules: number;
  conflicts: number;
}

const PAIRS: SystemPair[] = [
  {
    id: "crm-granot",
    source: "CRM",
    destination: "Granot",
    lastSync: "2m ago",
    errors: 1,
    unmapped: 2,
    rules: 6,
    conflicts: 0,
    sourceFields: [
      { key: "first_name", label: "First Name", type: "string", required: true, sample: "Sarah" },
      { key: "last_name", label: "Last Name", type: "string", required: true, sample: "Cohen" },
      { key: "email", label: "Email", type: "email", required: true, sample: "Sarah.Cohen@gmail.com" },
      { key: "phone", label: "Phone", type: "phone", required: true, sample: "(305) 555-9214" },
      { key: "origin_address", label: "Origin Address", type: "string", sample: "123 Ocean Dr, Miami FL" },
      { key: "destination_address", label: "Destination Address", type: "string", sample: "88 Park Ave, NYC NY" },
      { key: "move_date", label: "Move Date", type: "date", sample: "2026-06-12" },
      { key: "estimated_cuft", label: "Estimated Cu Ft", type: "number", sample: "850" },
      { key: "lead_source", label: "Lead Source", type: "string", sample: "meta_ads" },
      { key: "agent_id", label: "Agent ID", type: "string", sample: "rep_01" },
      { key: "deposit_paid", label: "Deposit Paid", type: "boolean", sample: "true" },
      { key: "vendor_status", label: "Vendor Status", type: "enum", sample: "qualified" },
    ],
    destFields: [
      { key: "customer.first", label: "customer.first", type: "string", required: true },
      { key: "customer.last", label: "customer.last", type: "string", required: true },
      { key: "customer.email_lower", label: "customer.email_lower", type: "email", required: true },
      { key: "customer.phone_e164", label: "customer.phone_e164", type: "phone", required: true },
      { key: "move.from", label: "move.from", type: "string", required: true },
      { key: "move.to", label: "move.to", type: "string", required: true },
      { key: "move.date_utc", label: "move.date_utc", type: "date" },
      { key: "move.volume_cuft", label: "move.volume_cuft", type: "number" },
      { key: "attribution.source", label: "attribution.source", type: "enum" },
      { key: "ops.assigned_rep", label: "ops.assigned_rep", type: "string" },
      { key: "billing.deposit_received", label: "billing.deposit_received", type: "boolean" },
      { key: "qualification_tier", label: "qualification_tier", type: "enum", required: true },
    ],
    mappings: [
      { sourceKey: "first_name", destKey: "customer.first" },
      { sourceKey: "last_name", destKey: "customer.last" },
      { sourceKey: "email", destKey: "customer.email_lower", transform: "lowercase" },
      { sourceKey: "phone", destKey: "customer.phone_e164", transform: "phone_e164" },
      { sourceKey: "origin_address", destKey: "move.from" },
      { sourceKey: "destination_address", destKey: "move.to" },
      { sourceKey: "move_date", destKey: "move.date_utc", transform: "tz_to_utc" },
      { sourceKey: "estimated_cuft", destKey: "move.volume_cuft" },
      { sourceKey: "lead_source", destKey: "attribution.source", transform: "vendor_status_map" },
      { sourceKey: "agent_id", destKey: "ops.assigned_rep" },
      { sourceKey: "deposit_paid", destKey: "billing.deposit_received", transform: "boolean_normalize" },
      { sourceKey: "vendor_status", destKey: "qualification_tier", transform: "vendor_status_map", fallback: "standard" },
    ],
  },
  {
    id: "crm-pulse",
    source: "CRM",
    destination: "Pulse",
    lastSync: "11m ago",
    errors: 0,
    unmapped: 1,
    rules: 3,
    conflicts: 0,
    sourceFields: [
      { key: "agent_id", label: "Agent ID", type: "string", required: true, sample: "rep_01" },
      { key: "phone", label: "Phone", type: "phone", required: true, sample: "(305) 555-9214" },
      { key: "call_recording_url", label: "Call Recording URL", type: "string", sample: "https://..." },
      { key: "call_duration_sec", label: "Call Duration (s)", type: "number", sample: "240" },
      { key: "lead_id", label: "Lead ID", type: "string", required: true, sample: "lead_8821" },
    ],
    destFields: [
      { key: "rep_handle", label: "rep_handle", type: "string", required: true },
      { key: "phone_e164", label: "phone_e164", type: "phone", required: true },
      { key: "audio_url", label: "audio_url", type: "string", required: true },
      { key: "duration_minutes", label: "duration_minutes", type: "number" },
      { key: "external_id", label: "external_id", type: "string", required: true },
    ],
    mappings: [
      { sourceKey: "agent_id", destKey: "rep_handle" },
      { sourceKey: "phone", destKey: "phone_e164", transform: "phone_e164" },
      { sourceKey: "call_recording_url", destKey: "audio_url" },
      { sourceKey: "call_duration_sec", destKey: "duration_minutes", transform: "seconds_to_minutes" },
      { sourceKey: "lead_id", destKey: "external_id" },
    ],
  },
  {
    id: "convoso-crm",
    source: "Convoso",
    destination: "CRM",
    lastSync: "27s ago",
    errors: 2,
    unmapped: 3,
    rules: 4,
    conflicts: 1,
    sourceFields: [
      { key: "FullName", label: "FullName", type: "string", sample: "Sarah Cohen" },
      { key: "PhoneNumber", label: "PhoneNumber", type: "phone", sample: "3055559214" },
      { key: "EmailAddr", label: "EmailAddr", type: "email", sample: "SARAH@GMAIL.COM" },
      { key: "FromAddress", label: "FromAddress", type: "string", sample: "123 Ocean Dr" },
      { key: "FromCity", label: "FromCity", type: "string", sample: "Miami" },
      { key: "DispoStatus", label: "DispoStatus", type: "enum", sample: "INTERESTED" },
    ],
    destFields: [
      { key: "first_name", label: "first_name", type: "string", required: true },
      { key: "last_name", label: "last_name", type: "string", required: true },
      { key: "phone", label: "phone", type: "phone", required: true },
      { key: "email", label: "email", type: "email", required: true },
      { key: "origin_address", label: "origin_address", type: "string" },
      { key: "lead_status", label: "lead_status", type: "enum", required: true },
    ],
    mappings: [
      { sourceKey: "FullName", destKey: "first_name", transform: "split_name_first" },
      { sourceKey: "FullName", destKey: "last_name", transform: "split_name_last" },
      { sourceKey: "PhoneNumber", destKey: "phone", transform: "phone_e164" },
      { sourceKey: "EmailAddr", destKey: "email", transform: "lowercase" },
      { sourceKey: "DispoStatus", destKey: "lead_status", transform: "vendor_status_map", fallback: "new" },
    ],
  },
  {
    id: "meta-crm",
    source: "Meta Ads",
    destination: "CRM",
    lastSync: "1m ago",
    errors: 0,
    unmapped: 0,
    rules: 2,
    conflicts: 0,
    sourceFields: [
      { key: "full_name", label: "full_name", type: "string", required: true, sample: "Sarah Cohen" },
      { key: "phone_number", label: "phone_number", type: "phone", required: true, sample: "+13055559214" },
      { key: "email", label: "email", type: "email", required: true, sample: "sarah@gmail.com" },
      { key: "campaign_id", label: "campaign_id", type: "string", sample: "120211009" },
    ],
    destFields: [
      { key: "first_name", label: "first_name", type: "string", required: true },
      { key: "last_name", label: "last_name", type: "string", required: true },
      { key: "phone", label: "phone", type: "phone", required: true },
      { key: "email", label: "email", type: "email", required: true },
      { key: "lead_source", label: "lead_source", type: "enum", required: true },
      { key: "campaign_ref", label: "campaign_ref", type: "string" },
    ],
    mappings: [
      { sourceKey: "full_name", destKey: "first_name", transform: "split_name_first" },
      { sourceKey: "full_name", destKey: "last_name", transform: "split_name_last" },
      { sourceKey: "phone_number", destKey: "phone", transform: "phone_e164" },
      { sourceKey: "email", destKey: "email", transform: "lowercase" },
      { sourceKey: "campaign_id", destKey: "campaign_ref" },
    ],
  },
  {
    id: "searchatlas-marketing",
    source: "SearchAtlas",
    destination: "Marketing Module",
    lastSync: "8m ago",
    errors: 0,
    unmapped: 4,
    rules: 1,
    conflicts: 0,
    sourceFields: [
      { key: "keyword", label: "keyword", type: "string", required: true, sample: "long distance movers" },
      { key: "position", label: "position", type: "number", sample: "4" },
      { key: "search_volume", label: "search_volume", type: "number", sample: "12100" },
      { key: "url", label: "url", type: "string", sample: "/services/long-distance" },
    ],
    destFields: [
      { key: "term", label: "term", type: "string", required: true },
      { key: "rank", label: "rank", type: "number" },
      { key: "monthly_volume", label: "monthly_volume", type: "number" },
      { key: "landing_page", label: "landing_page", type: "string" },
    ],
    mappings: [
      { sourceKey: "keyword", destKey: "term" },
      { sourceKey: "position", destKey: "rank" },
      { sourceKey: "search_volume", destKey: "monthly_volume" },
      { sourceKey: "url", destKey: "landing_page" },
    ],
  },
];

const TRANSFORMS = [
  { value: "none", label: "Direct (no transform)" },
  { value: "lowercase", label: "Normalize email casing" },
  { value: "uppercase", label: "Convert to UPPERCASE" },
  { value: "phone_e164", label: "Format phone (E.164)" },
  { value: "tz_to_utc", label: "Convert timestamp → UTC" },
  { value: "split_name_first", label: "Split full name → first" },
  { value: "split_name_last", label: "Split full name → last" },
  { value: "merge_address", label: "Merge address lines" },
  { value: "boolean_normalize", label: "Normalize boolean (true/false/1/0)" },
  { value: "vendor_status_map", label: "Map vendor-specific statuses" },
  { value: "seconds_to_minutes", label: "Seconds → minutes" },
];

const HISTORY = [
  { ver: "v12", at: "2m ago", by: "Andre B.", note: "Mapped vendor_status → qualification_tier with fallback" },
  { ver: "v11", at: "1d ago", by: "Andre B.", note: "Added phone E.164 transform on Convoso pair" },
  { ver: "v10", at: "3d ago", by: "Maya R.", note: "Auto-map ran for Meta Ads pair" },
  { ver: "v9", at: "1w ago", by: "Andre B.", note: "Initial CRM ↔ Granot field schema" },
];

const STATUS_OF = (src: SchemaField, dst: SchemaField | undefined) => {
  if (!dst) return { kind: "unmapped" as const, label: "Unmapped", cls: "text-amber-700 bg-amber-50 border-amber-200" };
  if (src.type !== dst.type) return { kind: "warn" as const, label: "Type mismatch", cls: "text-rose-700 bg-rose-50 border-rose-200" };
  return { kind: "ok" as const, label: "Mapped", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
};

export default function AdminHyperMCPDataMapping() {
  const [pairs, setPairs] = useState<SystemPair[]>(PAIRS);
  const [activeId, setActiveId] = useState(PAIRS[0].id);
  const pair = pairs.find(p => p.id === activeId)!;

  const [editing, setEditing] = useState<{ source: SchemaField; mapping?: Mapping } | null>(null);
  const [open, setOpen] = useState(false);

  const [samplePayload, setSamplePayload] = useState<string>(() =>
    JSON.stringify(
      Object.fromEntries(PAIRS[0].sourceFields.map(f => [f.key, f.sample ?? ""])),
      null, 2,
    ),
  );

  // Mapping line refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const destRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<Array<{ id: string; y1: number; y2: number; status: "ok" | "warn" | "unmapped" }>>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const next = pair.mappings
      .filter(m => !m.ignore)
      .map((m, i) => {
        const s = sourceRefs.current[m.sourceKey];
        const d = destRefs.current[m.destKey];
        if (!s || !d) return null;
        const sR = s.getBoundingClientRect();
        const dR = d.getBoundingClientRect();
        const src = pair.sourceFields.find(f => f.key === m.sourceKey)!;
        const dst = pair.destFields.find(f => f.key === m.destKey);
        const status = STATUS_OF(src, dst).kind === "warn" ? "warn" : "ok";
        return {
          id: `${m.sourceKey}-${m.destKey}-${i}`,
          y1: sR.top + sR.height / 2 - cRect.top,
          y2: dR.top + dR.height / 2 - cRect.top,
          status,
        };
      })
      .filter(Boolean) as typeof lines;
    setLines(next);
  }, [pair]);

  const kpis = useMemo(() => {
    const totalActive = pairs.reduce((s, p) => s + p.mappings.filter(m => !m.ignore).length, 0);
    return {
      active: totalActive,
      unmapped: pairs.reduce((s, p) => s + p.unmapped, 0),
      errors: pairs.reduce((s, p) => s + p.errors, 0),
      rules: pairs.reduce((s, p) => s + p.rules, 0),
      lastSync: "27s ago",
      conflicts: pairs.reduce((s, p) => s + p.conflicts, 0),
    };
  }, [pairs]);

  const findMapping = (sourceKey: string) => pair.mappings.find(m => m.sourceKey === sourceKey);

  const upsertMapping = (sourceKey: string, patch: Partial<Mapping>) => {
    setPairs(prev => prev.map(p => p.id !== pair.id ? p : {
      ...p,
      mappings: (() => {
        const exists = p.mappings.some(m => m.sourceKey === sourceKey);
        if (exists) return p.mappings.map(m => m.sourceKey === sourceKey ? { ...m, ...patch } : m);
        return [...p.mappings, { sourceKey, destKey: patch.destKey ?? "", ...patch }];
      })(),
    }));
  };

  const removeMapping = (sourceKey: string) => {
    setPairs(prev => prev.map(p => p.id !== pair.id ? p : {
      ...p, mappings: p.mappings.filter(m => m.sourceKey !== sourceKey),
    }));
    toast.success("Mapping removed");
  };

  const autoMap = () => {
    setPairs(prev => prev.map(p => {
      if (p.id !== pair.id) return p;
      const next = [...p.mappings];
      for (const s of p.sourceFields) {
        if (next.some(m => m.sourceKey === s.key)) continue;
        const guess = p.destFields.find(d =>
          d.key.toLowerCase().includes(s.key.toLowerCase()) ||
          s.key.toLowerCase().includes(d.key.split(".").pop()!.toLowerCase()),
        );
        if (guess) next.push({ sourceKey: s.key, destKey: guess.key });
      }
      return { ...p, mappings: next, unmapped: Math.max(0, p.unmapped - 1) };
    }));
    toast.success("Auto-map complete — 92% confidence");
  };

  const transformedPreview = useMemo(() => {
    let parsed: Record<string, any> = {};
    try { parsed = JSON.parse(samplePayload); } catch { return { ok: false, output: "Invalid JSON" }; }
    const out: Record<string, any> = {};
    const errs: string[] = [];
    for (const m of pair.mappings.filter(m => !m.ignore)) {
      const v = parsed[m.sourceKey];
      let transformed: any = v ?? m.fallback ?? null;
      if (m.transform === "lowercase" && typeof v === "string") transformed = v.toLowerCase();
      if (m.transform === "uppercase" && typeof v === "string") transformed = v.toUpperCase();
      if (m.transform === "phone_e164" && v) transformed = "+1" + String(v).replace(/\D/g, "").slice(-10);
      if (m.transform === "split_name_first" && typeof v === "string") transformed = v.split(" ")[0];
      if (m.transform === "split_name_last" && typeof v === "string") transformed = v.split(" ").slice(1).join(" ");
      if (m.transform === "boolean_normalize") transformed = ["true", "1", "yes", true, 1].includes(v as any);
      if (m.transform === "seconds_to_minutes" && typeof v === "number") transformed = Math.round(v / 60);
      // assign nested keys
      const parts = m.destKey.split(".");
      let cur = out;
      for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] = cur[parts[i]] ?? {}; cur = cur[parts[i]]; }
      cur[parts[parts.length - 1]] = transformed;
      const dst = pair.destFields.find(d => d.key === m.destKey);
      if (dst?.required && (transformed === null || transformed === undefined || transformed === "")) errs.push(`Missing required: ${dst.key}`);
    }
    return { ok: errs.length === 0, output: JSON.stringify(out, null, 2), errs };
  }, [samplePayload, pair]);

  const onPairChange = (id: string) => {
    setActiveId(id);
    const p = pairs.find(x => x.id === id)!;
    setSamplePayload(JSON.stringify(Object.fromEntries(p.sourceFields.map(f => [f.key, f.sample ?? ""])), null, 2));
  };

  const openEdit = (source: SchemaField) => {
    setEditing({ source, mapping: findMapping(source.key) });
    setOpen(true);
  };

  return (
    <HyperMCPShell>
      <div className="p-6 space-y-5 max-w-[1700px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Data Mapping Studio</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure field mappings, transformations, and cross-platform schema alignment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success("Mapping imported")}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />Import Mapping
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success("Mapping exported")}>
              <Download className="w-3.5 h-3.5 mr-1.5" />Export Mapping
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={autoMap}>
              <Wand2 className="w-3.5 h-3.5 mr-1.5" />Auto Map Fields
            </Button>
            <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={() => toast.success("New mapping pair created")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />New Mapping
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {[
            { label: "Active Mappings", value: kpis.active, icon: Link2, color: "text-emerald-600" },
            { label: "Unmapped Fields", value: kpis.unmapped, icon: Unlink, color: "text-amber-600" },
            { label: "Mapping Errors", value: kpis.errors, icon: AlertTriangle, color: "text-rose-600" },
            { label: "Transformation Rules", value: kpis.rules, icon: Sparkles, color: "text-blue-600" },
            { label: "Last Successful Sync", value: kpis.lastSync, icon: Clock, color: "text-slate-700" },
            { label: "Conflicting Schemas", value: kpis.conflicts, icon: FileWarning, color: "text-rose-600" },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className="border-slate-200 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{k.label}</span>
                    <Icon className={`w-3.5 h-3.5 ${k.color}`} />
                  </div>
                  <div className="text-xl font-semibold text-slate-900 mt-1.5">{k.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* System pair selector */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">System Pair</Label>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {pairs.map(p => (
                <button
                  key={p.id}
                  onClick={() => onPairChange(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${
                    p.id === activeId
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="font-medium">{p.source}</span>
                  <ArrowRightLeft className="w-3 h-3 opacity-60" />
                  <span className="font-medium">{p.destination}</span>
                  {p.errors > 0 && <span className="ml-1 text-[10px] px-1 rounded bg-rose-100 text-rose-700">{p.errors}</span>}
                </button>
              ))}
            </div>
            <div className="ml-auto text-[11px] text-slate-500">
              Last sync <span className="text-slate-700 font-medium">{pair.lastSync}</span> · {pair.mappings.filter(m => !m.ignore).length} active mappings
            </div>
          </CardContent>
        </Card>

        {/* Workspace + side */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
          {/* Mapping workspace */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-600 font-medium">
                <div className="px-3 py-2">Source · {pair.source}</div>
                <div className="px-3 py-2 text-center">Mapping</div>
                <div className="px-3 py-2">Destination · {pair.destination}</div>
              </div>

              <div ref={containerRef} className="relative grid grid-cols-3">
                {/* SVG overlay for lines */}
                <svg className="pointer-events-none absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  {lines.map(l => (
                    <line
                      key={l.id}
                      x1="33.333%"
                      x2="66.666%"
                      y1={l.y1}
                      y2={l.y2}
                      stroke={l.status === "warn" ? "#f43f5e" : "#10b981"}
                      strokeWidth={1.25}
                      strokeOpacity={0.55}
                    />
                  ))}
                </svg>

                {/* SOURCE column */}
                <div className="border-r border-slate-200">
                  {pair.sourceFields.map(f => {
                    const m = findMapping(f.key);
                    const dst = m ? pair.destFields.find(d => d.key === m.destKey) : undefined;
                    const status = STATUS_OF(f, dst);
                    return (
                      <div
                        key={f.key}
                        ref={(el) => (sourceRefs.current[f.key] = el)}
                        className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer group"
                        onClick={() => openEdit(f)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <code className="text-[11px] font-mono text-slate-900 font-medium truncate">{f.key}</code>
                              {f.required && <span className="text-rose-500 text-[10px]">*</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              <span className="font-medium text-slate-600">{f.type}</span>
                              {f.sample && <span className="ml-1.5 text-slate-400">e.g. {f.sample}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className={`${status.cls} border text-[9px] font-medium ml-2`}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CENTER column - mapping list */}
                <div className="border-r border-slate-200">
                  {pair.sourceFields.map(f => {
                    const m = findMapping(f.key);
                    return (
                      <div key={f.key} className="px-3 py-2 border-b border-slate-100 min-h-[52px] flex items-center justify-center">
                        {m && !m.ignore ? (
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span className="uppercase tracking-wider">{m.transform && m.transform !== "none" ? m.transform.replace(/_/g, " ") : "direct"}</span>
                            </div>
                            {m.fallback && (
                              <div className="text-[9px] text-slate-400 mt-0.5">fallback: {m.fallback}</div>
                            )}
                          </div>
                        ) : m?.ignore ? (
                          <span className="text-[10px] text-slate-400 italic">Ignored</span>
                        ) : (
                          <button
                            className="text-[10px] text-slate-400 hover:text-slate-700"
                            onClick={() => openEdit(f)}
                          >
                            + map field
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* DEST column */}
                <div>
                  {pair.sourceFields.map(f => {
                    const m = findMapping(f.key);
                    const dst = m ? pair.destFields.find(d => d.key === m.destKey) : undefined;
                    return (
                      <div
                        key={f.key}
                        ref={(el) => { if (dst) destRefs.current[dst.key] = el; }}
                        className="px-3 py-2 border-b border-slate-100 min-h-[52px]"
                      >
                        {dst ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <code className="text-[11px] font-mono text-slate-900 font-medium truncate">{dst.key}</code>
                              {dst.required && <span className="text-rose-500 text-[10px]">*</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              <span className="font-medium text-slate-600">{dst.type}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic h-full flex items-center">unmapped</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unmapped destination fields */}
              <div className="border-t border-slate-200 px-3 py-2.5 bg-slate-50/40">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-1.5">
                  Unmapped destination fields
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pair.destFields.filter(d => !pair.mappings.some(m => m.destKey === d.key)).map(d => (
                    <Badge key={d.key} variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600 font-mono">
                      {d.key}{d.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </Badge>
                  ))}
                  {pair.destFields.filter(d => !pair.mappings.some(m => m.destKey === d.key)).length === 0 && (
                    <span className="text-[10px] text-slate-400">All destination fields mapped.</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side: Validation, Testing, History */}
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${transformedPreview.ok ? "text-emerald-600" : "text-rose-600"}`} />
                  <h3 className="text-sm font-semibold text-slate-900">Validation</h3>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {pair.destFields.filter(d => d.required && !pair.mappings.some(m => m.destKey === d.key)).map(d => (
                    <div key={d.key} className="flex items-start gap-1.5 text-rose-700">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Missing required <code className="bg-rose-50 px-1 rounded">{d.key}</code></span>
                    </div>
                  ))}
                  {pair.mappings.filter(m => {
                    const s = pair.sourceFields.find(x => x.key === m.sourceKey);
                    const d = pair.destFields.find(x => x.key === m.destKey);
                    return s && d && s.type !== d.type && !m.transform;
                  }).map((m, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-amber-700">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>Type mismatch on <code className="bg-amber-50 px-1 rounded">{m.sourceKey}</code> → <code className="bg-amber-50 px-1 rounded">{m.destKey}</code></span>
                    </div>
                  ))}
                  {(() => {
                    const dups = pair.mappings.reduce<Record<string, number>>((acc, m) => { acc[m.destKey] = (acc[m.destKey] ?? 0) + 1; return acc; }, {});
                    return Object.entries(dups).filter(([, n]) => n > 1).map(([k, n]) => (
                      <div key={k} className="flex items-start gap-1.5 text-amber-700">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>Duplicate mapping on <code className="bg-amber-50 px-1 rounded">{k}</code> ({n}×)</span>
                      </div>
                    ));
                  })()}
                  {transformedPreview.ok && pair.mappings.every(m => {
                    const s = pair.sourceFields.find(x => x.key === m.sourceKey);
                    const d = pair.destFields.find(x => x.key === m.destKey);
                    return !s || !d || s.type === d.type || m.transform;
                  }) && (
                    <div className="flex items-start gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>All required fields mapped. No conflicts detected.</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Testing Area</h3>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-600">Sample source payload</Label>
                  <Textarea
                    rows={6}
                    value={samplePayload}
                    onChange={(e) => setSamplePayload(e.target.value)}
                    className="text-[11px] font-mono bg-slate-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-slate-600">Transformed output preview</Label>
                  <pre className="text-[11px] font-mono bg-slate-900 text-emerald-300 p-2.5 rounded-md overflow-auto max-h-[200px]">{transformedPreview.output}</pre>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => toast.success("Output validated")}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" />Validate
                  </Button>
                  <Button size="sm" className="h-8 text-xs flex-1 bg-slate-900 hover:bg-slate-800" onClick={() => toast.success("Sync simulation complete")}>
                    <Zap className="w-3.5 h-3.5 mr-1.5" />Simulate Sync
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-semibold text-slate-900">Mapping History</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {HISTORY.map(h => (
                    <div key={h.ver} className="py-2 flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 border-slate-200 text-slate-700 shrink-0">{h.ver}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-slate-700">{h.note}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{h.by} · {h.at}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700" onClick={() => toast.success(`Rolled back to ${h.ver}`)}>
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Field mapping drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[460px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Map Field
            </SheetTitle>
            <SheetDescription className="text-xs">
              Configure destination, transformation, fallback, and conditional logic.
            </SheetDescription>
          </SheetHeader>

          {editing && (
            <div className="py-4 space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Source field</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <code className="text-sm font-mono text-slate-900 font-medium">{editing.source.key}</code>
                  {editing.source.required && <span className="text-rose-500 text-xs">*</span>}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{editing.source.type} · sample: {editing.source.sample ?? "—"}</div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Destination field</Label>
                <Select
                  value={editing.mapping?.destKey ?? ""}
                  onValueChange={(v) => {
                    upsertMapping(editing.source.key, { destKey: v });
                    setEditing({ ...editing, mapping: { ...(editing.mapping ?? { sourceKey: editing.source.key, destKey: v }), destKey: v } });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {pair.destFields.map(d => (
                      <SelectItem key={d.key} value={d.key}>
                        {d.key} <span className="text-slate-400 ml-1">({d.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Transformation rule</Label>
                <Select
                  value={editing.mapping?.transform ?? "none"}
                  onValueChange={(v) => {
                    upsertMapping(editing.source.key, { transform: v === "none" ? undefined : v });
                    setEditing({ ...editing, mapping: { ...(editing.mapping ?? { sourceKey: editing.source.key, destKey: "" }), transform: v === "none" ? undefined : v } });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSFORMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fallback value</Label>
                  <Input
                    placeholder="e.g. standard"
                    value={editing.mapping?.fallback ?? ""}
                    onChange={(e) => {
                      upsertMapping(editing.source.key, { fallback: e.target.value });
                      setEditing({ ...editing, mapping: { ...(editing.mapping ?? { sourceKey: editing.source.key, destKey: "" }), fallback: e.target.value } });
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Condition</Label>
                  <Input
                    placeholder="e.g. only if status=qualified"
                    value={editing.mapping?.conditional ?? ""}
                    onChange={(e) => {
                      upsertMapping(editing.source.key, { conditional: e.target.value });
                      setEditing({ ...editing, mapping: { ...(editing.mapping ?? { sourceKey: editing.source.key, destKey: "" }), conditional: e.target.value } });
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <Label className="text-xs">Ignore this field</Label>
                  <p className="text-[10px] text-slate-500">Exclude from sync without deleting the mapping.</p>
                </div>
                <Switch
                  checked={!!editing.mapping?.ignore}
                  onCheckedChange={(v) => {
                    upsertMapping(editing.source.key, { ignore: v });
                    setEditing({ ...editing, mapping: { ...(editing.mapping ?? { sourceKey: editing.source.key, destKey: "" }), ignore: v } });
                  }}
                />
              </div>
            </div>
          )}

          <SheetFooter className="gap-2 border-t pt-3">
            {editing?.mapping && (
              <Button variant="outline" size="sm" className="h-8 text-xs text-rose-600 hover:text-rose-700" onClick={() => { removeMapping(editing.source.key); setOpen(false); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />Remove
              </Button>
            )}
            <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={() => { toast.success("Mapping saved"); setOpen(false); }}>
              Save Mapping
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </HyperMCPShell>
  );
}

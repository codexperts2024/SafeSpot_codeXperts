"use client";

import { useState, useEffect, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/** Color-coded badge for alert level */
function AlertBadge({ level }) {
  const styles = {
    caution: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    danger:  "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    extreme: "bg-red-500/15 text-red-400 border border-red-500/30",
  };
  const labels = {
    caution: "Caution ⚠️",
    danger:  "Danger 🚨",
    extreme: "Extreme 🔴",
  };
  const key = level?.toLowerCase();
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${styles[key] ?? "bg-white/5 text-neutral-400 border border-white/10"}`}>
      {labels[key] ?? level ?? "—"}
    </span>
  );
}

/** Format ISO timestamp */
function formatTs(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

/** Sensor Readings tab */
function SensorTab({ from, to }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (from) params.set("from", from);
      if (to)   params.set("to",   to);
      const res = await fetch(`${BACKEND_URL}/api/sensors?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : (data.readings ?? data.data ?? []));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-center text-neutral-600 py-12 text-[12px]">Loading…</p>;
  if (error)   return <p className="text-center text-red-400/70 py-12 text-[12px]">Error: {error}</p>;
  if (!rows.length) return <p className="text-center text-neutral-600 py-12 text-[12px]">No readings found.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5">
            {["Timestamp", "Temperature", "Humidex", "Humidity", "Source"].map(h => (
              <th key={h} className="py-2 pr-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <td className="py-2 pr-4 text-[11px] text-neutral-500 whitespace-nowrap">{formatTs(r.timestamp)}</td>
              <td className="py-2 pr-4 text-[12px] font-semibold text-orange-400">{r.temperature != null ? `${r.temperature} °C` : "—"}</td>
              <td className="py-2 pr-4 text-[12px] text-neutral-300">{r.humidex != null ? `${r.humidex} °C` : "—"}</td>
              <td className="py-2 pr-4 text-[12px] text-neutral-300">{r.humidity != null ? `${r.humidity}%` : "—"}</td>
              <td className="py-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10 font-medium">{r.source ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Alert Events tab */
function AlertTab({ from, to }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (from) params.set("from", from);
      if (to)   params.set("to",   to);
      const res = await fetch(`${BACKEND_URL}/api/logs/alerts?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : (data.alerts ?? data.data ?? []));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-center text-neutral-600 py-12 text-[12px]">Loading…</p>;
  if (error)   return <p className="text-center text-red-400/70 py-12 text-[12px]">Error: {error}</p>;
  if (!rows.length) return <p className="text-center text-neutral-600 py-12 text-[12px]">No alert events found.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5">
            {["Timestamp", "Alert Level", "Humidex", "Zone"].map(h => (
              <th key={h} className="py-2 pr-4 text-[10px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <td className="py-2 pr-4 text-[11px] text-neutral-500 whitespace-nowrap">{formatTs(r.timestamp)}</td>
              <td className="py-2 pr-4"><AlertBadge level={r.alertLevel ?? r.alert_level ?? r.level} /></td>
              <td className="py-2 pr-4 text-[12px] text-neutral-300">{r.humidex != null ? `${r.humidex} °C` : "—"}</td>
              <td className="py-2 text-[12px] text-neutral-300">{r.zone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Main LogViewer modal */
export default function LogViewer({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("sensor");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  function applyFilter() { setAppliedFrom(from); setAppliedTo(to); }
  function clearFilter() { setFrom(""); setTo(""); setAppliedFrom(""); setAppliedTo(""); }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.80)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[16px] border border-white/10 bg-[#0a0a0a] shadow-[0_40px_100px_rgba(255,255,255,0.03)] ring-1 ring-white/5 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Sensor Log</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-white text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {[
            { key: "sensor", label: "🌡️ Sensor Readings" },
            { key: "alerts", label: "🚨 Alert Events" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === key
                  ? "bg-white/5 text-white border border-white/10"
                  : "text-neutral-600 hover:text-neutral-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 px-6 py-3 border-y border-white/5 bg-white/[0.02] shrink-0">
          {["From", "To"].map((label) => (
            <div key={label} className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-600 uppercase tracking-wider">{label}</label>
              <input
                type="date"
                value={label === "From" ? from : to}
                onChange={(e) => label === "From" ? setFrom(e.target.value) : setTo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyFilter(); }}
                className="bg-white/[0.04] border border-white/10 text-neutral-300 text-[11px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          ))}
          <button
            onClick={applyFilter}
            className="text-[10px] md:text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 font-bold uppercase tracking-wider transition-colors"
          >
            Apply
          </button>
          {(appliedFrom || appliedTo) && (
            <button
              onClick={clearFilter}
              className="text-[10px] md:text-[11px] px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 font-bold uppercase tracking-wider transition-colors"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-neutral-700 ml-auto">Newest first · max {activeTab === "sensor" ? 100 : 50} rows</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "sensor"
            ? <SensorTab from={appliedFrom} to={appliedTo} />
            : <AlertTab  from={appliedFrom} to={appliedTo} />
          }
        </div>

      </div>
    </div>
  );
}

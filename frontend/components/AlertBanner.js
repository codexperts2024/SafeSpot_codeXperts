"use client";

/**
 * AlertBanner — shows a full-width warning banner based on temperature alert level.
 *
 * Props:
 *   alert — { level: "safe" | "caution" | "danger" | "extreme", message: string }
 *           Pass null/undefined to hide the banner.
 */
export default function AlertBanner({ alert }) {
  if (!alert || alert.level === "safe") return null;

  const styles = {
    caution: {
      bg: "bg-yellow-500 text-black",
      border: "border-yellow-400",
      icon: "⚠️",
      label: "HEAT CAUTION",
    },
    danger: {
      bg: "bg-orange-600 text-white",
      border: "border-orange-500",
      icon: "🚨",
      label: "EXTREME HEAT WARNING",
    },
    extreme: {
      bg: "bg-red-600 text-white",
      border: "border-red-500",
      icon: "🔴",
      label: "CRITICAL DANGER",
    },
  };

  const s = styles[alert.level] ?? styles.caution;

  return (
    <div className={`fixed top-[65px] left-0 right-0 w-full z-[40] flex items-center justify-center gap-4 px-6 py-3 border-b ${s.border} ${s.bg} animate-[fade-down_0.3s_ease-out]`}>
      <span className="text-[14px] md:text-[18px] animate-pulse drop-shadow-sm leading-none shrink-0">{s.icon}</span>
      <div className="flex items-center gap-2 md:gap-3 font-sans min-w-0">
        <span className="font-bold tracking-widest text-[10px] md:text-[13px] uppercase whitespace-nowrap shrink-0">{s.label}</span>
        <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-current opacity-40 shrink-0"></span>
        <span className="text-[11px] md:text-[14px] font-medium whitespace-nowrap truncate">{alert.message}</span>
      </div>
    </div>
  );
}

export const naira = (n) =>
  "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });

export const when = (iso) =>
  new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const timeOnly = (iso) =>
  new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

export const num = (n) => String(Math.round(Number(n) * 1000) / 1000);

// Input checks shared by SADEX Express Logistics API routes.

// Nigerian mobile prefixes (after the leading 0). Covers MTN, Airtel, Glo, 9mobile and newer ranges.
const NG_MOBILE = /^(70[1-9]|80[2-9]|81[0-9]|90[1-9]|91[0-6])\d{7}$/;

// Returns "+234XXXXXXXXXX" or "" if the number is not a valid Nigerian mobile.
export function normalizeNigerianPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return NG_MOBILE.test(d) ? `+234${d}` : "";
}

const OTHER_STATES = /\b(lagos|ikeja|lekki|victoria island|port harcourt|ibadan|kano|enugu|benin city|kaduna city|owerri|calabar|uyo|jos)\b/i;
const ABUJA_WORDS = [
  "abuja", "fct", "wuse", "garki", "maitama", "asokoro", "jabi", "utako", "cbd", "central area",
  "gwarinpa", "katampe", "kado", "life camp", "lifecamp", "mabushi", "jahi", "wuye", "durumi", "gudu",
  "apo", "lokogoma", "galadimawa", "guzape", "lugbe", "kubwa", "dutse", "dawaki", "karu", "nyanya",
  "mararaba", "jikwoyi", "kyami", "idu", "airport road", "bwari", "zuba", "gwagwalada", "kuje", "mpape",
  "citec", "mbora", "games village", "centenary", "banex"
];

export function isAbujaAddress(address) {
  const a = String(address || "").toLowerCase();
  if (a.trim().length < 5) return false;
  if (OTHER_STATES.test(a)) return false;
  return ABUJA_WORDS.some(w => a.includes(w));
}

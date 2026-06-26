import { getName, registerLocale } from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

registerLocale(en);

export type PhoneCountry = {
  iso2: string;
  dial: string;
  name: string;
  flag: string;
};

function iso2Flag(iso2: string): string {
  const s = iso2.toUpperCase();
  if (s.length !== 2) return "🌐";
  const base = 0x1f1e6;
  const a = s.codePointAt(0)!;
  const b = s.codePointAt(1)!;
  if (a < 65 || b < 65) return "🌐";
  return String.fromCodePoint(base + a - 65, base + b - 65);
}

let _all: PhoneCountry[] | null = null;

export function allPhoneCountries(): PhoneCountry[] {
  if (_all) return _all;
  _all = getCountries()
    .map((code) => {
      const cc = code as CountryCode;
      return {
        iso2: code,
        dial: `+${getCountryCallingCode(cc)}`,
        name: getName(code, "en", { select: "official" }) ?? code,
        flag: iso2Flag(code)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return _all;
}

export function defaultPhoneCountry(): PhoneCountry {
  return allPhoneCountries().find((c) => c.iso2 === "IN") ?? allPhoneCountries()[0]!;
}

import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import type { PhoneCountry } from "./phoneCountries";

export function phoneToE164(
  localDigits: string,
  country: PhoneCountry
): { e164: string } | { error: string } {
  const trimmed = localDigits.replace(/[\s-]/g, "");
  if (!trimmed) {
    return { error: "Enter your phone number." };
  }
  const parsed = parsePhoneNumberFromString(trimmed, country.iso2 as CountryCode);
  if (!parsed?.isValid()) {
    return {
      error: "That number doesn’t look valid for the selected country."
    };
  }
  return { e164: parsed.format("E.164") };
}

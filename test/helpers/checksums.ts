// Independent implementations of the checksums, used to build synthetic test values at runtime.
// Every number built here is made up (zero bank codes, foreign-born NIR department 99...).

function mod97(digits: string): number {
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder;
}

/** An IBAN with valid check digits for a made-up account (`FR` + `00000…`). */
export function syntheticIban(country: string, bban: string): string {
  const numeric = `${bban}${country}00`.replace(/[A-Z]/g, (letter) =>
    String(letter.charCodeAt(0) - 55),
  );
  const check = String(98 - mod97(numeric)).padStart(2, "0");
  return `${country}${check}${bban}`;
}

/** Appends the Luhn check digit to a made-up card number body. */
export function withLuhnDigit(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let digit = Number(body[body.length - 1 - i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return `${body}${String((10 - (sum % 10)) % 10)}`;
}

/** Appends the control key to the 13 first characters of a made-up NIR. */
export function withNirKey(body: string): string {
  const numeric = body.replace("2A", "19").replace("2B", "18");
  const key = 97 - Number(BigInt(numeric) % 97n);
  return `${body}${String(key).padStart(2, "0")}`;
}

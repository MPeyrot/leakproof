import type { ContentRule } from "../content-rule.js";
import { cardNumber } from "./card-number.js";
import { iban } from "./iban.js";
import { nir } from "./nir.js";
import { personalEmail } from "./personal-email.js";
import { userPath } from "./user-path.js";

export const PERSONAL_DATA_RULES: readonly ContentRule[] = [
  iban,
  cardNumber,
  nir,
  personalEmail,
  userPath,
];

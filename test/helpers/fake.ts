/**
 * Builds a test value from pieces at runtime, so that no complete secret-looking literal
 * ever appears in the repository (keeps other scanners and GitHub push protection quiet).
 * Every value built with it is fake.
 */
export function fake(...pieces: string[]): string {
  return pieces.join("");
}

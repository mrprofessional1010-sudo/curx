"use client";

/**
 * CURX Authentication Service & Session Management
 * Provides typed auth interfaces, form validation, and backend integration hooks.
 */

export interface AuthError {
  field?: string;
  message: string;
}

// Password entropy calculator (0 to 4 score)
export function calculatePasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) {
    return { score: 0, label: "Strength: Idle", color: "bg-surface-container-highest" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score === 1) {
    return { score: 1, label: "Weak", color: "bg-curx-red" };
  } else if (score === 2) {
    return { score: 2, label: "Fair", color: "bg-curx-orange" };
  } else if (score === 3) {
    return { score: 3, label: "Strong", color: "bg-curx-amber" };
  } else {
    return { score: 4, label: "Very Strong", color: "bg-curx-cyan" };
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

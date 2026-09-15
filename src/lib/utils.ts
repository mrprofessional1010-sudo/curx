import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFrameNumber(index: number, padding: number = 4): string {
  return String(index).padStart(padding, "0");
}

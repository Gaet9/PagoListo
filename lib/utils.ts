import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { hasEnvVars } from "./has-env-vars";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SERVICE_AREAS = [
  "Mildura", "Irymple", "Red Cliffs", "Merbein",
  "Nichols Point", "Buronga", "Gol Gol", "Wentworth"
] as const;

export const DEVICE_TYPES = [
  "Smartphone", "Tablet", "Laptop", "Desktop PC", "Gaming Console",
  "Smart Watch", "Headphones/Earbuds", "Speaker", "Camera", "Drone", "Other"
] as const;

export const AUSTRALIAN_PHONE_REGEX = /^(?:\+61|0)[2-478]\d{8}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// LUMA V1 — Seed Utility Functions
// Helper functions for database seeding

import * as bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt.
 * Used for demo user OTP codes or any password-like data.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Generate a random integer between min (inclusive) and max (inclusive).
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 * Throws if the array is empty.
 */
export function randomPick<T>(array: readonly T[]): T {
  if (array.length === 0) {
    throw new Error("randomPick: cannot pick from an empty array");
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Pick N unique random elements from an array.
 * Returns at most array.length elements.
 */
export function randomPickN<T>(array: readonly T[], n: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, array.length));
}

/**
 * Generate a Turkish phone number in the format +90 5XX XXX XX XX.
 * Returns it without spaces (e.g., "+905321234567").
 */
export function generatePhoneNumber(index: number): string {
  const operators = [
    "530",
    "531",
    "532",
    "533",
    "534",
    "535",
    "536",
    "537",
    "538",
    "539",
    "540",
    "541",
    "542",
    "543",
    "544",
    "545",
    "546",
    "547",
    "548",
    "549",
    "550",
    "551",
    "552",
    "553",
    "554",
    "555",
    "556",
    "557",
    "558",
    "559",
  ];
  const operator = operators[index % operators.length];
  const suffix = String(1234500 + index).padStart(7, "0");
  return `+90${operator}${suffix}`;
}

/**
 * Generate a random date within a range (for realistic demo data).
 */
export function randomDate(start: Date, end: Date): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
}

/**
 * Generate a placeholder photo URL for demo users.
 */
export function demoPhotoUrl(name: string, index: number): string {
  return `https://cdn.lumaapp.com/photos/${name.toLowerCase()}_${index + 1}.jpg`;
}

/**
 * Generate a placeholder thumbnail URL for demo users.
 */
export function demoThumbnailUrl(name: string, index: number): string {
  return `https://cdn.lumaapp.com/photos/${name.toLowerCase()}_${index + 1}_thumb.jpg`;
}

/**
 * Turkish cities with coordinates for realistic demo profiles.
 */
export const TURKISH_CITIES: ReadonlyArray<{
  name: string;
  latitude: number;
  longitude: number;
}> = [
  { name: "Istanbul", latitude: 41.0082, longitude: 28.9784 },
  { name: "Ankara", latitude: 39.9334, longitude: 32.8597 },
  { name: "Izmir", latitude: 38.4237, longitude: 27.1428 },
  { name: "Antalya", latitude: 36.8969, longitude: 30.7133 },
  { name: "Bursa", latitude: 40.1885, longitude: 29.061 },
  { name: "Adana", latitude: 37.0, longitude: 35.3213 },
  { name: "Gaziantep", latitude: 37.0662, longitude: 37.3833 },
  { name: "Konya", latitude: 37.8746, longitude: 32.4932 },
  { name: "Mersin", latitude: 36.8, longitude: 34.6333 },
  { name: "Diyarbakir", latitude: 37.9144, longitude: 40.2306 },
  { name: "Kayseri", latitude: 38.7312, longitude: 35.4787 },
  { name: "Eskisehir", latitude: 39.7767, longitude: 30.5206 },
  { name: "Trabzon", latitude: 41.0027, longitude: 39.7168 },
  { name: "Samsun", latitude: 41.2867, longitude: 36.33 },
  { name: "Mugla", latitude: 37.2153, longitude: 28.3636 },
  { name: "Denizli", latitude: 37.7765, longitude: 29.0864 },
  { name: "Balikesir", latitude: 39.6484, longitude: 27.8826 },
  { name: "Canakkale", latitude: 40.1553, longitude: 26.4142 },
  { name: "Bodrum", latitude: 37.0343, longitude: 27.4305 },
  { name: "Cesme", latitude: 38.3237, longitude: 26.303 },
] as const;

/**
 * Interest tag pool for user profiles (Turkish).
 */
export const INTEREST_TAGS: readonly string[] = [
  "Seyahat",
  "Fotograf",
  "Yemek Yapma",
  "Muzik",
  "Spor",
  "Yoga",
  "Kitap",
  "Film",
  "Teknoloji",
  "Doga",
  "Dans",
  "Sanat",
  "Tiyatro",
  "Kahve",
  "Sarap",
  "Oyun",
  "Kosu",
  "Yuzme",
  "Bisiklet",
  "Kamp",
  "Dalga Sorfu",
  "Dagcilik",
  "Meditasyon",
  "Podcast",
  "Blog Yazma",
  "Gitar",
  "Piyano",
  "Resim",
  "Tasarim",
  "Siir",
  "Felsefe",
  "Tarih",
  "Bilim",
  "Astronomi",
  "Bahcecilik",
  "Geri Donusum",
  "Hayvan Sevgisi",
  "Gonullu Calisma",
  "Dil Ogrenme",
  "Stand-Up",
  "Pilates",
  "Boks",
  "Tenis",
  "Kayak",
  "Soket",
  "Futbol",
  "Basketbol",
  "Motor",
  "Klasik Araba",
  "Koleksiyon",
] as const;

import { describe, it, expect } from "vitest";
import { isProfileComplete } from "@/lib/auth/session";
import type { Profile } from "@/lib/types/db";

const base: Profile = {
  id: "00000000-0000-4000-8000-000000000000",
  username: "andres",
  full_name: "Andrés",
  avatar_url: null,
  bio: null,
  city: "Manizales",
  primary_sport_id: "00000000-0000-4000-8000-000000000001",
  primary_skill_level: "intermedio",
  rating_avg: 0,
  rating_count: 0,
  matches_played: 0,
  tournament_goals: 0,
  tournament_matches: 0,
  created_at: "",
  updated_at: "",
};

describe("isProfileComplete", () => {
  it("true cuando todos los campos obligatorios están", () => {
    expect(isProfileComplete(base)).toBe(true);
  });

  it("false cuando falta username", () => {
    expect(isProfileComplete({ ...base, username: null })).toBe(false);
  });

  it("false cuando falta city", () => {
    expect(isProfileComplete({ ...base, city: null })).toBe(false);
  });

  it("false cuando falta primary_sport_id", () => {
    expect(isProfileComplete({ ...base, primary_sport_id: null })).toBe(false);
  });

  it("false cuando falta primary_skill_level", () => {
    expect(isProfileComplete({ ...base, primary_skill_level: null })).toBe(false);
  });

  it("false cuando el perfil es null/undefined", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });
});

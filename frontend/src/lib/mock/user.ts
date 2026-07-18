/** Shared user DTO used by authenticated views. Data always comes from the API. */
export type MockUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  plan: "free" | "team" | "enterprise";
  created_at: string;
};

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

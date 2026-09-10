type MemberAvatarProps = { name: string; photoUrl?: string | null; size?: "sm" | "lg" };

export default function MemberAvatar({ name, photoUrl, size = "sm" }: MemberAvatarProps) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  const dimensions = size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";
  if (photoUrl) return <img src={photoUrl} alt={`Foto de ${name}`} className={`${dimensions} shrink-0 rounded-full object-cover`} />;
  return <div aria-label={`Avatar de ${name}`} className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-700`}>{initials}</div>;
}

"use client";
import { useAuth } from "@/lib/auth";
import { ProfileView } from "./_components/ProfileView";

export default function MyProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return <ProfileView userId={user.id} isMe />;
}

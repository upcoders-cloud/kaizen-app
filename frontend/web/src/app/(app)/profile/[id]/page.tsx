"use client";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileView } from "../_components/ProfileView";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = Number(id);
  if (!Number.isFinite(userId) || userId <= 0) return <EmptyState variant="card" title="Nieprawidłowy adres profilu" />;
  return <ProfileView key={userId} userId={userId} isMe={user?.id === userId} />;
}

// Typy domenowe współdzielone przez strony pomysłów (webcore) i webflow.

export type Role = "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "DIRECTOR";

export type PostStatus =
  | "TO_VERIFY"
  | "SUBMITTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "CANCELLED";

export type ApprovalStage = "TEAM_LEAD" | "MANAGER" | "DIRECTOR";
export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UserPublic {
  id: number;
  username: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  role?: Role | string;
  is_staff?: boolean;
  avatar_url?: string | null;
  department?: number | null;
  department_name?: string | null;
}

export interface UserPermissions {
  is_admin: boolean;
  is_approver: boolean;
  is_management: boolean;
}

export interface UserProfile extends UserPublic {
  email?: string;
  gender?: string;
  is_superuser?: boolean;
  date_joined?: string;
  stats?: {
    ideas: number;
    implemented: number;
    likes_received: number;
    savings: number | string;
  };
  gamification?: {
    total_points: number;
    level: { id: number; name: string; color?: string; icon?: string } | null;
    badges: { id: number; code?: string; name: string; description?: string; icon?: string; tier?: string; awarded_at?: string | null }[];
  };
}

export interface Category {
  id: number;
  name: string;
  is_active?: boolean;
}

export interface Department {
  id: number;
  name: string;
}

export interface PostApproval {
  id: number;
  stage: ApprovalStage;
  order: number;
  approver: UserPublic | null;
  decision: ApprovalDecision;
  comment: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface PostSurvey {
  frequency_value: number;
  frequency_unit: "DAY" | "WEEK" | "MONTH";
  affected_people: number;
  time_lost_minutes: number;
  estimated_time_savings_hours: number;
  estimated_financial_savings: string | number;
}

export interface PostImageItem {
  id: number;
  url: string;
  type?: "GENERAL" | "BEFORE" | "AFTER";
}

export interface Post {
  id: number;
  author: UserPublic;
  title: string;
  content: string;
  category: number;
  category_name: string;
  status: PostStatus;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked_by_me: boolean;
  is_bookmarked_by_me: boolean;
  image_items: PostImageItem[];
  image_urls: string[];
  survey: PostSurvey | null;
  assigned_manager: number | null;
  assigned_team_lead?: number | null;
  assigned_manager_detail: UserPublic | null;
  assigned_team_lead_detail?: UserPublic | null;
  assigned_director_detail?: UserPublic | null;
  estimated_cost: string | number | null;
  deadline: string | null;
  progress_percent: number;
  approvals: PostApproval[];
  current_stage: PostApproval | null;
  rejection_reason: string | null;
  /** Czy zalogowany może aktualizować postęp (wyliczane przez backend). */
  can_update_progress?: boolean;
}

/** Lekka reprezentacja z /posts/pipeline/ i /posts/trending/. */
export interface PostLite {
  id: number;
  title: string;
  author?: UserPublic;
  category?: number;
  category_name?: string;
  status?: PostStatus;
  progress_percent?: number;
  deadline?: string | null;
  estimated_cost?: string | number | null;
  savings?: string | number | null;
  likes_count?: number;
  comments_count?: number;
  created_at?: string;
  assigned_manager?: number | null;
  thumbnail_url?: string | null;
  /** Czy zalogowany może zmieniać postęp (pipeline). */
  can_update_progress?: boolean;
  /** Tylko /posts/trending/. */
  score?: number;
}

export interface Comment {
  id: number;
  post: number;
  author: UserPublic;
  parent: number | null;
  text: string;
  created_at: string;
}

export type NotificationType =
  | "LIKE"
  | "COMMENT"
  | "REPLY"
  | "MENTION"
  | "APPROVED"
  | "REJECTED"
  | "ASSIGNED";

export interface Notification {
  id: number;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
  actor: UserPublic;
  post_id: number;
  post_title: string;
  comment_id: number | null;
  comment_text: string | null;
}

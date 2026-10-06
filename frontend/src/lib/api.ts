const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type HealthResponse = {
  status: "ok";
  database: "connected" | "disconnected";
};

export type UserRole = "owner" | "staff" | "trainer" | "member";

export type User = {
  id: number;
  email: string;
  role: UserRole;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
};

export type AuthResponse = {
  user: User;
};

export type MemberInvite = {
  id: number;
  memberId: number | null;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export type Member = {
  id: number;
  userId: number | null;
  fullName: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  address: string | null;
  emergencyContact: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  joinDate: string | null;
  status: string;
  hasPortalAccount: boolean;
  currentSubscription: MemberSubscription | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MembershipPlan = {
  id: number;
  name: string;
  priceCents: number;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MemberSubscription = {
  id: number;
  memberId: number;
  planId: number;
  plan: MembershipPlan | null;
  startDate: string;
  endDate: string;
  status: string;
  computedStatus: string;
  daysRemaining: number;
  isExpiringSoon: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateMemberInput = {
  fullName: string;
  dni?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  medicalNotes?: string;
  joinDate?: string;
  status?: string;
  sendInvite?: boolean;
};

export type WhatsAppDelivery = {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  chatId?: string;
  statusCode?: number;
  response?: unknown;
};

export type CreateMemberResponse = {
  member: Member;
  invite: unknown | null;
  inviteUrl: string | null;
  whatsappDelivery: WhatsAppDelivery | null;
};

export type PortalInviteResponse = {
  invite: unknown;
  inviteUrl: string;
  whatsappDelivery: WhatsAppDelivery | null;
};

export type SendWhatsAppTestInput = {
  phone: string;
  text: string;
};

export type SendWhatsAppTestResponse = {
  delivery: WhatsAppDelivery;
};

export type CreateMembershipPlanInput = {
  name: string;
  priceCents: number;
  durationDays: number;
  isActive?: boolean;
};

export type AssignSubscriptionInput = {
  memberId: number;
  planId: number;
  startDate?: string;
  endDate?: string;
  status?: string;
};

export type MembershipReminder = {
  member: Member;
  subscription: MemberSubscription;
  message: string;
};

export type SentMembershipReminder = MembershipReminder & {
  delivery: WhatsAppDelivery;
};

export type ExerciseMedia = {
  id: number;
  sourceType: string;
  sourceUrl: string | null;
  localPath: string | null;
  thumbnailPath: string | null;
  durationSeconds: number | null;
  status: string;
};

export type Exercise = {
  id: number;
  name: string;
  slug: string;
  youtubeUrl: string | null;
  description: string | null;
  primaryMuscleGroup: string | null;
  secondaryMuscleGroups: string[];
  equipment: string | null;
  movementPattern: string | null;
  media?: ExerciseMedia[];
};

export type TrainingDayExerciseSubstitution = {
  id: number;
  substitutionOrder: number;
  exercise: Exercise;
};

export type TrainingDayExercise = {
  id: number;
  exerciseOrder: number;
  exercise: Exercise;
  lastSetIntensityTechnique: string | null;
  warmupSets: string | null;
  workingSets: string | null;
  reps: string | null;
  earlySetRpe: string | null;
  lastSetRpe: string | null;
  rest: string | null;
  notes: string | null;
  substitutions: TrainingDayExerciseSubstitution[];
};

export type TrainingDay = {
  id: number;
  dayNumber: number;
  dayLabel: string;
  exercises?: TrainingDayExercise[];
};

export type TrainingWeek = {
  id: number;
  weekNumber: number;
  blockName: string | null;
  days?: TrainingDay[];
};

export type TrainingProgram = {
  id: number;
  name: string;
  description: string | null;
  level: string | null;
  sourceName: string | null;
  weeks?: TrainingWeek[];
};

export type MuscleImage = {
  name: string;
  matchedName: string;
  matchType: string;
  title: string | null;
  description: string | null;
  extract: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
  source: "wikipedia";
};

type ApiErrorResponse = {
  error?: string;
};

export class ApiRequestError extends Error {
  status: number;
  statusText: string;
  path: string;

  constructor({
    message,
    path,
    status,
    statusText,
  }: {
    message: string;
    path: string;
    status: number;
    statusText: string;
  }) {
    super(message);
    this.name = "ApiRequestError";
    this.path = path;
    this.status = status;
    this.statusText = statusText;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & ApiErrorResponse;

  if (!response.ok) {
    throw new ApiRequestError({
      message: data.error ?? "API request failed.",
      path,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return data;
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`, {
    headers: {
      Accept: "application/json",
    },
  });

  const data = (await response.json()) as HealthResponse;

  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ status: "ok" }> {
  return apiRequest<{ status: "ok" }>("/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/me");
}

export async function acceptMemberInvite(
  token: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/member-invites/accept", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function lookupMemberInvite(
  token: string,
): Promise<{ invite: MemberInvite }> {
  return apiRequest<{ invite: MemberInvite }>(
    `/auth/member-invites/lookup?token=${encodeURIComponent(token)}`,
  );
}

export async function getMembers(): Promise<{ members: Member[] }> {
  return apiRequest<{ members: Member[] }>("/members");
}

export async function createMember(
  input: CreateMemberInput,
): Promise<CreateMemberResponse> {
  return apiRequest<CreateMemberResponse>("/members", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resendMemberPortalInvite(
  memberId: number,
): Promise<PortalInviteResponse> {
  return apiRequest<PortalInviteResponse>(`/members/${memberId}/portal-invite`, {
    method: "POST",
  });
}

export async function getMembershipPlans(): Promise<{ plans: MembershipPlan[] }> {
  return apiRequest<{ plans: MembershipPlan[] }>("/membership-plans");
}

export async function createMembershipPlan(
  input: CreateMembershipPlanInput,
): Promise<{ plan: MembershipPlan }> {
  return apiRequest<{ plan: MembershipPlan }>("/membership-plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function assignMemberSubscription(
  input: AssignSubscriptionInput,
): Promise<{ subscription: MemberSubscription }> {
  return apiRequest<{ subscription: MemberSubscription }>(
    `/members/${input.memberId}/subscriptions`,
    {
      method: "POST",
      body: JSON.stringify({
        planId: input.planId,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
      }),
    },
  );
}

export async function getMySubscription(): Promise<{
  member: Member;
  subscription: MemberSubscription | null;
}> {
  return apiRequest<{
    member: Member;
    subscription: MemberSubscription | null;
  }>("/member/subscription");
}

export async function sendWhatsAppTest(
  input: SendWhatsAppTestInput,
): Promise<SendWhatsAppTestResponse> {
  return apiRequest<SendWhatsAppTestResponse>("/notifications/whatsapp/test", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function previewMembershipReminders(): Promise<{
  reminders: MembershipReminder[];
}> {
  return apiRequest<{ reminders: MembershipReminder[] }>(
    "/notifications/membership-reminders/preview",
  );
}

export async function sendMembershipReminders(): Promise<{
  results: SentMembershipReminder[];
}> {
  return apiRequest<{ results: SentMembershipReminder[] }>(
    "/notifications/membership-reminders/send",
    {
      method: "POST",
    },
  );
}

export async function getTrainingPrograms(): Promise<{
  programs: TrainingProgram[];
}> {
  return apiRequest<{ programs: TrainingProgram[] }>("/training-programs");
}

export async function getTrainingProgram(
  programId: number,
): Promise<{ program: TrainingProgram }> {
  return apiRequest<{ program: TrainingProgram }>(
    `/training-programs/${programId}`,
  );
}

export async function getMuscleImage(
  muscleName: string,
): Promise<{ muscle: MuscleImage }> {
  return apiRequest<{ muscle: MuscleImage }>(
    `/muscles/image?name=${encodeURIComponent(muscleName)}`,
  );
}

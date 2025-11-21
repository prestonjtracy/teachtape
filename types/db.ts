// Database types for TeachTape
// Generated types based on Supabase schema

// ==========================================
// CORE ENTITIES
// ==========================================

export interface Profile {
  id: string;
  auth_user_id: string;
  role: 'coach' | 'athlete' | 'admin';
  full_name: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  sport: string | null;
  created_at: string;
}

export interface Coach {
  id: string;
  profile_id: string;
  sport: string | null;
  is_public: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  active: boolean;
  created_at: string;
}

export interface Listing {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  // Film review fields
  listing_type: 'live_lesson' | 'film_review';
  turnaround_hours: number | null; // For film reviews (default 48)
  review_format: string | null; // Optional format description
}

export interface Availability {
  id: string;
  coach_id: string;
  starts_at: string; // timestamptz
  ends_at: string;   // timestamptz  
  capacity: number;
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string | null;
  service_id: string | null;
  coach_id: string;
  customer_email: string | null;
  athlete_email: string | null;
  athlete_name: string | null;
  amount_paid_cents: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'paid';
  stripe_session_id: string;
  stripe_payment_intent: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  zoom_meeting_id: string | null;
  starts_at: string | null; // timestamptz
  ends_at: string | null;   // timestamptz
  created_at: string;
  // Film review fields
  booking_type: 'live_lesson' | 'film_review';
  film_url: string | null; // Video link (Hudl, YouTube, Vimeo)
  athlete_notes: string | null; // Optional notes from athlete
  review_status: FilmReviewStatus | null; // Film review workflow status
  review_document_url: string | null; // Coach's written review (Google Docs, PDF)
  coach_accepted_at: string | null; // When coach accepted the request
  review_completed_at: string | null; // When coach submitted review
  deadline_at: string | null; // Deadline for coach to submit review
}

export interface Review {
  id: string;
  booking_id: string;
  coach_id: string;
  athlete_id: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: string;
}

// ==========================================
// CHAT & MESSAGING
// ==========================================

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: 'athlete' | 'coach';
  created_at: string;
}

export interface Message {
  id: string;
  // For conversation messages
  conversation_id: string | null;
  // For legacy booking messages
  booking_id: string | null;
  sender_id: string | null;
  body: string;
  kind: string; // 'text', 'image', 'system', etc.
  metadata?: any; // Optional metadata for system messages
  created_at: string;
}

// ==========================================
// SCHEDULING & BOOKING REQUESTS
// ==========================================

export interface BookingRequest {
  id: string;
  listing_id: string;
  coach_id: string;
  athlete_id: string;
  proposed_start: string; // timestamptz
  proposed_end: string;   // timestamptz
  timezone: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  conversation_id: string | null;
  setup_intent_id: string | null;
  payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// EXTENDED TYPES (WITH RELATIONS)
// ==========================================

export interface CoachWithProfile extends Coach {
  profile: Profile;
}

export interface CoachWithServices extends CoachWithProfile {
  services: Service[];
}

export interface ConversationWithParticipants extends Conversation {
  participants: (ConversationParticipant & {
    profile: Profile;
  })[];
}

export interface ConversationWithMessages extends ConversationWithParticipants {
  messages: (Message & {
    sender: Profile | null;
  })[];
}

export interface BookingRequestWithDetails extends BookingRequest {
  listing: Listing;
  coach: Profile;
  athlete: Profile;
  conversation: Conversation | null;
}

export interface MessageWithSender extends Message {
  sender: Profile | null;
}

export interface ReviewWithAthlete extends Review {
  athlete: {
    full_name: string | null;
  };
}

// ==========================================
// DATABASE RESULT TYPES
// ==========================================

export interface DbSuccess<T> {
  success: true;
  data: T;
}

export interface DbError {
  success: false;
  error: string;
  details?: unknown;
}

export type DbResult<T> = DbSuccess<T> | DbError;

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface CreateBookingRequestInput {
  listing_id: string;
  coach_id: string;
  proposed_start: string;
  proposed_end: string;
  timezone: string;
}

export interface UpdateBookingRequestInput {
  status?: 'pending' | 'accepted' | 'declined' | 'cancelled';
  proposed_start?: string;
  proposed_end?: string;
  timezone?: string;
}

export interface CreateConversationInput {
  participant_ids: string[];
  participant_roles: ('athlete' | 'coach')[];
}

export interface SendMessageInput {
  conversation_id?: string;
  booking_id?: string;
  body: string;
  kind?: string;
}

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewsResponse {
  reviews: ReviewWithAthlete[];
  averageRating: number;
  totalReviews: number;
}

// ==========================================
// UTILITY TYPES
// ==========================================

// Film review workflow status
export type FilmReviewStatus =
  | 'pending_acceptance' // Waiting for coach to accept/decline
  | 'accepted'           // Coach accepted, working on review
  | 'declined'           // Coach declined, refund issued
  | 'completed'          // Review delivered
  | 'expired';           // Coach didn't respond in time

export type ListingType = 'live_lesson' | 'film_review';
export type BookingType = 'live_lesson' | 'film_review';

export type UserRole = Profile['role'];
export type BookingStatus = Booking['status'];
export type BookingRequestStatus = BookingRequest['status'];
export type MessageKind = Message['kind'];

// Database table names (for type-safe queries)
export const TABLE_NAMES = {
  PROFILES: 'profiles',
  COACHES: 'coaches',
  SERVICES: 'services',
  LISTINGS: 'listings',
  AVAILABILITIES: 'availabilities',
  BOOKINGS: 'bookings',
  CONVERSATIONS: 'conversations',
  CONVERSATION_PARTICIPANTS: 'conversation_participants',
  MESSAGES: 'messages',
  BOOKING_REQUESTS: 'booking_requests',
  REVIEWS: 'reviews',
} as const;

// Type guard functions
export const isCoach = (profile: Profile): boolean => profile.role === 'coach';
export const isAthlete = (profile: Profile): boolean => profile.role === 'athlete';
export const isAdmin = (profile: Profile): boolean => profile.role === 'admin';

export const isBookingRequestPending = (request: BookingRequest): boolean => 
  request.status === 'pending';

export const isBookingRequestAccepted = (request: BookingRequest): boolean => 
  request.status === 'accepted';

export const isConversationMessage = (message: Message): boolean =>
  message.conversation_id !== null;

export const isBookingMessage = (message: Message): boolean =>
  message.booking_id !== null;

// ==========================================
// ZOOM WEBHOOK EVENTS
// ==========================================

export interface ZoomWebhookEvent {
  id: string;
  zoom_meeting_id: string;
  booking_id: string | null;
  event_type: 'meeting.started' | 'meeting.ended' | 'meeting.participant_joined' | 'meeting.participant_left';
  participant_name: string | null;
  participant_email: string | null;
  participant_user_id: string | null;
  occurred_at: string; // timestamptz
  created_at: string;
  raw_data: any; // JSONB
}
// Manually-authored types matching the Supabase v2 expected Database generic format.
// Replace with auto-generated types after running:
//   npx supabase gen types typescript --linked > src/lib/supabase/types.ts

export type UserRole = "candidate" | "employer";
export type ChallengeType = "multiple_choice" | "coding" | "written";
export type MatchStatus = "pending" | "accepted" | "declined" | "expired" | "ghosted";
export type Vertical =
  | "tech"
  | "finance"
  | "marketing"
  | "design"
  | "ops"
  | "legal"
  | "healthcare"
  | "education"
  | "sales"
  | "hr"
  | "consulting"
  | "property"
  | "media";
export type WorkMode = "full_time" | "part_time" | "remote" | "internship";
export type PostingStatus = "open" | "closed";
export type OfferStatus = "pending" | "accepted" | "declined";
export type MessageType = "text" | "offer" | "offer_accepted" | "offer_declined" | "file";
export type SubscriptionTier = "none" | "starter" | "pro";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          display_name: string;
          email: string;
          vertical: Vertical | null;
          avatar_url: string | null;
          email_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          display_name: string;
          email: string;
          vertical?: Vertical | null;
          avatar_url?: string | null;
          email_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          vertical?: Vertical | null;
          avatar_url?: string | null;
          email_notifications?: boolean;
          email?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      candidates: {
        Row: {
          id: string;
          composite_score: number;
          percentile_rank: number;
          years_exp_claimed: number | null;
          desired_salary_min: number | null;
          desired_salary_max: number | null;
          location: string | null;
          remote_only: boolean;
          is_visible: boolean;
          reputation_score: number;
          last_active_at: string;
          is_founder_verified: boolean;
          date_of_birth: string | null;
          sex: string | null;
          languages: string[];
          citizenship: string | null;
        };
        Insert: {
          id: string;
          composite_score?: number;
          percentile_rank?: number;
          years_exp_claimed?: number | null;
          desired_salary_min?: number | null;
          desired_salary_max?: number | null;
          location?: string | null;
          remote_only?: boolean;
          is_visible?: boolean;
          reputation_score?: number;
          last_active_at?: string;
          is_founder_verified?: boolean;
          date_of_birth?: string | null;
          sex?: string | null;
          languages?: string[];
          citizenship?: string | null;
        };
        Update: {
          composite_score?: number;
          percentile_rank?: number;
          years_exp_claimed?: number | null;
          desired_salary_min?: number | null;
          desired_salary_max?: number | null;
          location?: string | null;
          remote_only?: boolean;
          is_visible?: boolean;
          reputation_score?: number;
          last_active_at?: string;
          date_of_birth?: string | null;
          sex?: string | null;
          languages?: string[];
          citizenship?: string | null;
          is_founder_verified?: boolean;
        };
        Relationships: Relationship[];
      };
      employers: {
        Row: {
          id: string;
          company_name: string;
          company_size: string | null;
          industry: string | null;
          website: string | null;
          headquarters: string | null;
          description: string | null;
          verified: boolean;
          reputation_score: number;
          subscription_tier: SubscriptionTier;
          subscription_status: SubscriptionStatus;
          subscription_period_end: string | null;
        };
        Insert: {
          id: string;
          company_name: string;
          company_size?: string | null;
          industry?: string | null;
          website?: string | null;
          headquarters?: string | null;
          description?: string | null;
          verified?: boolean;
          reputation_score?: number;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus;
          subscription_period_end?: string | null;
        };
        Update: {
          company_name?: string;
          company_size?: string | null;
          industry?: string | null;
          website?: string | null;
          headquarters?: string | null;
          description?: string | null;
          reputation_score?: number;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus;
          subscription_period_end?: string | null;
        };
        Relationships: Relationship[];
      };
      challenges: {
        Row: {
          id: string;
          vertical: Vertical;
          title: string;
          description: string | null;
          time_limit_sec: number;
          max_score: number;
          is_active: boolean;
          version: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical: Vertical;
          title: string;
          description?: string | null;
          time_limit_sec?: number;
          max_score?: number;
          is_active?: boolean;
          version?: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: Relationship[];
      };
      questions: {
        Row: {
          id: string;
          challenge_id: string;
          type: ChallengeType;
          prompt: string;
          options: { id: string; text: string }[] | null;
          correct_answer: string | null;
          weight: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          type: ChallengeType;
          prompt: string;
          options?: { id: string; text: string }[] | null;
          correct_answer?: string | null;
          weight?: number;
          order_index: number;
          created_at?: string;
        };
        Update: {
          prompt?: string;
          weight?: number;
        };
        Relationships: Relationship[];
      };
      challenge_results: {
        Row: {
          id: string;
          candidate_id: string;
          challenge_id: string;
          raw_score: number | null;
          normalised_score: number | null;
          time_taken_sec: number | null;
          answers: Record<string, string> | null;
          scored_at: string;
          attempt_number: number;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          challenge_id: string;
          raw_score?: number | null;
          normalised_score?: number | null;
          time_taken_sec?: number | null;
          answers?: Record<string, string> | null;
          scored_at?: string;
          attempt_number?: number;
        };
        Update: {
          normalised_score?: number | null;
        };
        Relationships: Relationship[];
      };
      salary_data_points: {
        Row: {
          id: string;
          vertical: Vertical;
          role_label: string | null;
          years_exp: number;
          location: string | null;
          remote: boolean;
          monthly_salary: number;
          source: string;
          match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical: Vertical;
          role_label?: string | null;
          years_exp: number;
          location?: string | null;
          remote?: boolean;
          monthly_salary: number;
          source?: string;
          match_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
      matches: {
        Row: {
          id: string;
          employer_id: string;
          candidate_id: string;
          posting_id: string | null;
          status: MatchStatus;
          pitch_message: string | null;
          offered_salary: number | null;
          responded_at: string | null;
          expires_at: string;
          created_at: string;
          offer_status: OfferStatus | null;
          offer_salary: number | null;
          offer_sent_at: string | null;
          hired_at: string | null;
          last_message_at: string | null;
          candidate_last_read_at: string | null;
          employer_last_read_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          candidate_id: string;
          posting_id?: string | null;
          status?: MatchStatus;
          pitch_message?: string | null;
          offered_salary?: number | null;
          responded_at?: string | null;
          expires_at?: string;
          created_at?: string;
          offer_status?: OfferStatus | null;
          offer_salary?: number | null;
          offer_sent_at?: string | null;
          hired_at?: string | null;
          last_message_at?: string | null;
          candidate_last_read_at?: string | null;
          employer_last_read_at?: string;
        };
        Update: {
          status?: MatchStatus;
          responded_at?: string | null;
          offer_status?: OfferStatus | null;
          offer_salary?: number | null;
          offer_sent_at?: string | null;
          hired_at?: string | null;
          last_message_at?: string | null;
          candidate_last_read_at?: string | null;
          employer_last_read_at?: string;
        };
        Relationships: Relationship[];
      };
      match_ticker_events: {
        Row: {
          id: string;
          vertical: Vertical;
          salary_band: string | null;
          role_label: string | null;
          salary: number | null;
          delta_pct: number | null;
          match_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical: Vertical;
          salary_band?: string | null;
          role_label?: string | null;
          salary?: number | null;
          delta_pct?: number | null;
          match_type?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
      reputation_events: {
        Row: {
          id: string;
          subject_id: string;
          actor_id: string | null;
          event_type: string;
          weight: number;
          match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          actor_id?: string | null;
          event_type: string;
          weight?: number;
          match_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
      score_history: {
        Row: {
          id: string;
          candidate_id: string;
          composite_score: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          composite_score: number;
          recorded_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
      candidate_job_postings: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          location: string | null;
          work_modes: WorkMode[];
          desired_salary_min: number | null;
          desired_salary_max: number | null;
          skills: string[];
          notice_period_days: number | null;
          available_from: string | null;
          years_exp: number | null;
          work_eligible: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          location?: string | null;
          work_modes?: WorkMode[];
          desired_salary_min?: number | null;
          desired_salary_max?: number | null;
          skills?: string[];
          notice_period_days?: number | null;
          available_from?: string | null;
          years_exp?: number | null;
          work_eligible?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          location?: string | null;
          work_modes?: WorkMode[];
          desired_salary_min?: number | null;
          desired_salary_max?: number | null;
          skills?: string[];
          notice_period_days?: number | null;
          available_from?: string | null;
          years_exp?: number | null;
          work_eligible?: boolean | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      candidate_portfolio_projects: {
        Row: {
          id: string;
          candidate_id: string;
          title: string;
          description: string | null;
          link_url: string | null;
          file_path: string | null;
          file_name: string | null;
          skills: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          title: string;
          description?: string | null;
          link_url?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          skills?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          link_url?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          skills?: string[];
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      employer_job_postings: {
        Row: {
          id: string;
          employer_id: string;
          title: string;
          description: string | null;
          vertical: Vertical;
          years_exp_min: number | null;
          years_exp_max: number | null;
          location: string | null;
          work_modes: WorkMode[];
          salary_min: number | null;
          salary_max: number | null;
          skills: string[];
          max_candidates: number;
          status: PostingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          title: string;
          description?: string | null;
          vertical?: Vertical;
          years_exp_min?: number | null;
          years_exp_max?: number | null;
          location?: string | null;
          work_modes?: WorkMode[];
          salary_min?: number | null;
          salary_max?: number | null;
          skills?: string[];
          max_candidates?: number;
          status?: PostingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          vertical?: Vertical;
          years_exp_min?: number | null;
          years_exp_max?: number | null;
          location?: string | null;
          work_modes?: WorkMode[];
          salary_min?: number | null;
          salary_max?: number | null;
          skills?: string[];
          max_candidates?: number;
          status?: PostingStatus;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      match_messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          body: string;
          message_type: MessageType;
          file_path: string | null;
          file_name: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          body: string;
          message_type?: MessageType;
          file_path?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          file_path?: string | null;
          file_name?: string | null;
          file_size?: number | null;
        };
        Relationships: Relationship[];
      };
      portfolio_feedback: {
        Row: {
          id: string;
          match_id: string;
          employer_id: string;
          candidate_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          employer_id: string;
          candidate_id: string;
          rating: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: Relationship[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      challenge_type: ChallengeType;
      match_status: MatchStatus;
      vertical: Vertical;
      work_mode: WorkMode;
    };
    CompositeTypes: Record<string, never>;
  };
}

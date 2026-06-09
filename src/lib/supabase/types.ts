// Manually-authored types matching the Supabase v2 expected Database generic format.
// Replace with auto-generated types after running:
//   npx supabase gen types typescript --linked > src/lib/supabase/types.ts

export type UserRole = "candidate" | "employer";
export type ChallengeType = "multiple_choice" | "coding" | "written";
export type MatchStatus = "pending" | "accepted" | "declined" | "expired" | "ghosted";
export type Vertical = "tech" | "finance" | "marketing" | "design" | "ops";

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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          vertical?: Vertical | null;
          avatar_url?: string | null;
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
          credits: number;
          verified: boolean;
          reputation_score: number;
        };
        Insert: {
          id: string;
          company_name: string;
          company_size?: string | null;
          industry?: string | null;
          website?: string | null;
          credits?: number;
          verified?: boolean;
          reputation_score?: number;
        };
        Update: {
          company_name?: string;
          company_size?: string | null;
          industry?: string | null;
          website?: string | null;
          credits?: number;
          reputation_score?: number;
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
          years_exp: number;
          location: string | null;
          remote: boolean;
          annual_salary: number;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical: Vertical;
          years_exp: number;
          location?: string | null;
          remote?: boolean;
          annual_salary: number;
          source?: string;
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
          status: MatchStatus;
          pitch_message: string | null;
          offered_salary: number | null;
          responded_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          employer_id: string;
          candidate_id: string;
          status?: MatchStatus;
          pitch_message?: string | null;
          offered_salary?: number | null;
          responded_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          status?: MatchStatus;
          responded_at?: string | null;
        };
        Relationships: Relationship[];
      };
      match_ticker_events: {
        Row: {
          id: string;
          vertical: Vertical;
          salary_band: string | null;
          role_label: string | null;
          match_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical: Vertical;
          salary_band?: string | null;
          role_label?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      challenge_type: ChallengeType;
      match_status: MatchStatus;
      vertical: Vertical;
    };
    CompositeTypes: Record<string, never>;
  };
}

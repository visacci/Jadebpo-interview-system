export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          id?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          age: number
          applicant_name: string
          aptitude_score: number | null
          aptitude_started_at: string | null
          aptitude_status: string
          created_at: string
          email: string
          id: string
          interview_date: string | null
          interview_time: string | null
          job_id: string
          phone: string
          salary_expectation: string | null
          status: string
        }
        Insert: {
          age: number
          applicant_name: string
          aptitude_score?: number | null
          aptitude_started_at?: string | null
          aptitude_status?: string
          created_at?: string
          email: string
          id?: string
          interview_date?: string | null
          interview_time?: string | null
          job_id: string
          phone: string
          salary_expectation?: string | null
          status?: string
        }
        Update: {
          age?: number
          applicant_name?: string
          aptitude_score?: number | null
          aptitude_started_at?: string | null
          aptitude_status?: string
          created_at?: string
          email?: string
          id?: string
          interview_date?: string | null
          interview_time?: string | null
          job_id?: string
          phone?: string
          salary_expectation?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      aptitude_answers: {
        Row: {
          application_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_answer: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "aptitude_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aptitude_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "aptitude_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      aptitude_questions: {
        Row: {
          category: string | null
          correct_answer: string
          created_at: string
          id: string
          image_url: string | null
          job_id: string | null
          max_marks: number
          options: Json
          order_index: number
          question_text: string
        }
        Insert: {
          category?: string | null
          correct_answer: string
          created_at?: string
          id?: string
          image_url?: string | null
          job_id?: string | null
          max_marks?: number
          options?: Json
          order_index?: number
          question_text: string
        }
        Update: {
          category?: string | null
          correct_answer?: string
          created_at?: string
          id?: string
          image_url?: string | null
          job_id?: string | null
          max_marks?: number
          options?: Json
          order_index?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "aptitude_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          age: number
          application_id: string | null
          created_at: string
          department_id: string
          final_score: number | null
          id: string
          name: string
        }
        Insert: {
          age: number
          application_id?: string | null
          created_at?: string
          department_id: string
          final_score?: number | null
          id?: string
          name: string
        }
        Update: {
          age?: number
          application_id?: string | null
          created_at?: string
          department_id?: string
          final_score?: number | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      category_scores: {
        Row: {
          candidate_id: string
          communication: number
          created_at: string
          id: string
          interviewer_number: number
          oral: number
          skillset: number
          technical: number
          weighted_score: number | null
        }
        Insert: {
          candidate_id: string
          communication?: number
          created_at?: string
          id?: string
          interviewer_number: number
          oral?: number
          skillset?: number
          technical?: number
          weighted_score?: number | null
        }
        Update: {
          candidate_id?: string
          communication?: number
          created_at?: string
          id?: string
          interviewer_number?: number
          oral?: number
          skillset?: number
          technical?: number
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      interview_participants: {
        Row: {
          created_at: string
          current_question_index: number
          id: string
          notes: string
          session_id: string
          status: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          current_question_index?: number
          id?: string
          notes?: string
          session_id: string
          status?: string
          user_id: string
          user_name?: string
        }
        Update: {
          created_at?: string
          current_question_index?: number
          id?: string
          notes?: string
          session_id?: string
          status?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          started_by: string
          status: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          started_by: string
          status?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          started_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      interviewer_category_scores: {
        Row: {
          communication: number
          created_at: string
          id: string
          oral: number
          session_id: string
          skillset: number
          technical: number
          user_id: string
          weighted_score: number | null
        }
        Insert: {
          communication?: number
          created_at?: string
          id?: string
          oral?: number
          session_id: string
          skillset?: number
          technical?: number
          user_id: string
          weighted_score?: number | null
        }
        Update: {
          communication?: number
          created_at?: string
          id?: string
          oral?: number
          session_id?: string
          skillset?: number
          technical?: number
          user_id?: string
          weighted_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interviewer_category_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interviewer_names: {
        Row: {
          candidate_id: string
          id: string
          interviewer_1_name: string
          interviewer_2_name: string
          interviewer_3_name: string
        }
        Insert: {
          candidate_id: string
          id?: string
          interviewer_1_name?: string
          interviewer_2_name?: string
          interviewer_3_name?: string
        }
        Update: {
          candidate_id?: string
          id?: string
          interviewer_1_name?: string
          interviewer_2_name?: string
          interviewer_3_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviewer_names_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      interviewer_question_scores: {
        Row: {
          created_at: string
          id: string
          question_id: string
          score: number
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          score?: number
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          score?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviewer_question_scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviewer_question_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string
          department_id: string
          id: string
          max_marks: number
          order_index: number
          question_text: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          max_marks?: number
          order_index?: number
          question_text: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          max_marks?: number
          order_index?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      score_weights: {
        Row: {
          communication_weight: number
          id: string
          oral_weight: number
          skillset_weight: number
          technical_weight: number
          updated_at: string
        }
        Insert: {
          communication_weight?: number
          id?: string
          oral_weight?: number
          skillset_weight?: number
          technical_weight?: number
          updated_at?: string
        }
        Update: {
          communication_weight?: number
          id?: string
          oral_weight?: number
          skillset_weight?: number
          technical_weight?: number
          updated_at?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          candidate_id: string
          created_at: string
          final_question_score: number | null
          id: string
          interviewer_1_score: number | null
          interviewer_2_score: number | null
          interviewer_3_score: number | null
          question_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          final_question_score?: number | null
          id?: string
          interviewer_1_score?: number | null
          interviewer_2_score?: number | null
          interviewer_3_score?: number | null
          question_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          final_question_score?: number | null
          id?: string
          interviewer_1_score?: number | null
          interviewer_2_score?: number | null
          interviewer_3_score?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "hr" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr", "user"],
    },
  },
} as const

/** 登录后从计划快照 `_demo.persona` 灌入的个人学习画像 */
export interface PersonaMastery {
  label: string;
  value: number;
}

export interface PersonaActivity {
  when: string;
  text: string;
}

export interface PersonaQuestionNote {
  question_id: string;
  title: string;
}

export interface StudentPersona {
  real_name: string;
  major: string;
  course: string;
  semester: string;
  focus: string;
  weak_points: string[];
  next_action: string;
  next_path: string;
  chat_greeting: string;
  quick_asks: string[];
  recent_days: PersonaActivity[];
  mastery: PersonaMastery[];
  question_notes: PersonaQuestionNote[];
  materials_focus: string;
}

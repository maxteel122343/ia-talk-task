export interface GoalCardData extends Record<string, unknown> {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  dueDate?: Date;
  subtasks?: { id: string; text: string; done: boolean }[];
  notes?: string[];
  timer?: {
    active: boolean;
    timeLeft: number; // in seconds
    totalTime: number;
  };
  priority?: 'low' | 'medium' | 'high';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Area {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

export interface AreaWithStats extends Area {
  goalCount: number;
  taskCount: number;
  habitCount: number;
}

export interface AreaDetail extends Area {
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
}

export interface Goal {
  id: string;
  areaId: string | null;
  title: string;
  description: string | null;
  status: 'active' | 'done' | 'archived';
  progress: number;
  targetDate: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface GoalDetail extends Goal {
  area: Area | null;
  milestones: Milestone[];
  tasks: Task[];
  habits: Habit[];
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Task {
  id: string;
  areaId: string | null;
  goalId: string | null;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string | null;
  completedAt: string | null;
}

export interface Habit {
  id: string;
  areaId: string | null;
  goalId: string | null;
  title: string;
  frequency: 'daily' | 'weekly' | 'specific_days';
  days: string | null;
  active: boolean;
  currentStreak: number;
  bestStreak: number;
  lastCompletedAt: string | null;
}

export interface HabitWithDone extends Habit {
  done: boolean;
}

export interface StatusData {
  date: string;
  dateFormatted: string;
  tasksDueToday: Task[];
  tasksOverdue: Task[];
  habitsDueToday: HabitWithDone[];
  summary: {
    tasksDue: number;
    tasksOverdue: number;
    habitsDue: number;
    habitsDone: number;
    bestActiveStreak: { habit: string; streak: number } | null;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCallId: string | null;
  toolCalls: string | null;
  createdAt: string;
  position: number;
}

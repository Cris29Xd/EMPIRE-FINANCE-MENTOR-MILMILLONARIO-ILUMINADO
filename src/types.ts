export type AccountType = 'checking' | 'savings' | 'credit_card' | 'debt' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  limit?: number;
  interestRate?: number;
  ownerId: string;
}

export const INCOME_CATEGORIES = [
  'Honorarios / Servicios',
  'Proyecto de Cliente',
  'Consultoría',
  'Comisiones',
  'Dividendos / Inversiones',
  'Arriendo Recibido',
  'Bono / Extra',
  'Otros Ingresos',
] as const;

export const EXPENSE_CATEGORIES = [
  'Herramientas Digitales',
  'Publicidad & Marketing',
  'Transporte / Movilidad',
  'Alimentación',
  'Salud & Bienestar',
  'Educación & Cursos',
  'Servicios Públicos',
  'Arriendo / Coworking',
  'Equipos & Tecnología',
  'Impuestos & Retención',
  'Nómina / Colaboradores',
  'Banco & Comisiones',
  'Entretenimiento',
  'Ropa & Personal',
  'Viajes & Alojamiento',
  'Seguros',
  'Otros Gastos',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: any;
  accountId: string;
  notes?: string;
  ownerId: string;
}

export type ClientStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface Client {
  id: string;
  name: string;
  projectDescription: string;
  totalValue: number;
  amountPaid: number;
  status: ClientStatus;
  dueDate: any;
  ownerId: string;
  createdAt: any;
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: any;
}

export interface MentorSession {
  id: string;
  ownerId: string;
  messages: Message[];
  lastInteraction: any;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  totalNetWorth: number;
}

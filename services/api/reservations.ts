import { fetchWithAuth } from '@/lib/api';

export interface ReservationUser {
  id: number;
  name: string;
}

export interface ReservationConversation {
  id: number;
  voyager_id: number;
  local_id: number;
  Voyager?: ReservationUser;
  Local?: ReservationUser;
}

export interface Reservation {
  id: number;
  title: string;
  status: 'pending' | 'accepted' | 'declined';
  creator_id: number;
  conversation_id: number;
  price: number | string; // Sequelize DECIMAL serializes as string
  date: string;
  end_date: string;
  createdAt: string;
  Conversation?: ReservationConversation;
}

export async function getMyReservations(): Promise<Reservation[]> {
  const data = await fetchWithAuth('/reservations/me');
  // API may return array directly or wrapped in { reservations: [] }
  if (Array.isArray(data)) return data;
  return data.reservations ?? data.data ?? [];
}

export async function acceptReservation(id: number): Promise<void> {
  await fetchWithAuth(`/reservations/${id}/accept`, { method: 'PATCH' });
}

export async function declineReservation(id: number): Promise<void> {
  await fetchWithAuth(`/reservations/${id}/decline`, { method: 'PATCH' });
}

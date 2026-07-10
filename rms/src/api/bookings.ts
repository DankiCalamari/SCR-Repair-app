import apiClient from "./client";
import type { Booking, BookingDetail, CreateBookingRequest, UpdateBookingRequest, TimeSlot, PaginatedResponse } from "../types";


export async function listBookings(
  skip?: number,
  limit?: number,
  bookingType?: string,
  status?: string,
  startDate?: string,
  endDate?: string,
): Promise<PaginatedResponse<Booking>> {
  const params: Record<string, string | number> = {};
  if (skip !== undefined) params.skip = skip;
  if (limit !== undefined) params.limit = limit;
  if (bookingType !== undefined) params.booking_type = bookingType;
  if (status !== undefined) params.status = status;
  if (startDate !== undefined) params.start_date = startDate;
  if (endDate !== undefined) params.end_date = endDate;
  const { data } = await apiClient.get("/bookings", { params });
  return data;
}


export async function getBooking(id: string): Promise<Booking> {
  const { data } = await apiClient.get(`/bookings/${id}`);
  return data;
}


export async function createBooking(bookingData: CreateBookingRequest): Promise<Booking> {
  const { data } = await apiClient.post("/bookings", bookingData);
  return data;
}


export async function updateBooking(id: string, bookingData: UpdateBookingRequest): Promise<Booking> {
  const { data } = await apiClient.put(`/bookings/${id}`, bookingData);
  return data;
}


export async function deleteBooking(id: string): Promise<void> {
  await apiClient.delete(`/bookings/${id}`);
}


export async function getAvailableSlots(
  date: string,
  bookingType?: string,
): Promise<TimeSlot[]> {
  const { data } = await apiClient.get("/bookings/available-slots", {
    params: { date: date, booking_type: bookingType },
  });
  return data;
}
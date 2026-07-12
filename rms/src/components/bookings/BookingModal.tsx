import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay } from "date-fns";
import { X, Calendar, Clock, MapPin, User, Save, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { createBooking, updateBooking, getAvailableSlots, listBookings } from "../../api/bookings";
import { listCustomers } from "../../api/customers";
import { listRepairs } from "../../api/repairs";
import type { Booking, CreateBookingRequest, UpdateBookingRequest, BookingType, BookingStatus } from "../../types";


interface BookingModalProps {
  booking?: Booking | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingModal({ booking, onClose, onSuccess }: BookingModalProps) {
  const isEditing = !!booking;
  const [selectedDate, setSelectedDate] = useState(
    booking ? format(parseISO(booking.scheduled_at), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [selectedTime, setSelectedTime] = useState(
    booking ? format(parseISO(booking.scheduled_at), "HH:mm") : "09:00"
  );
  const [bookingType, setBookingType] = useState<BookingType>(
    (booking?.booking_type as BookingType) || "pickup"
  );
  const [customerId, setCustomerId] = useState(booking?.customer_id || "");
  const [repairId, setRepairId] = useState(booking?.repair_id || "");
  const [duration, setDuration] = useState(booking?.duration_minutes || 30);
  const [address, setAddress] = useState(booking?.address || "");
  const [notes, setNotes] = useState(booking?.notes || "");
  const [status, setStatus] = useState<BookingStatus>(
    (booking?.status as BookingStatus) || "scheduled"
  );

  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers", 0, 100],
    queryFn: () => listCustomers(0, 100),
  });

  const { data: repairs } = useQuery({
    queryKey: ["repairs", 0, 100],
    queryFn: () => listRepairs(0, 100),
  });

  const { data: availableSlots } = useQuery({
    queryKey: ["available-slots", selectedDate, bookingType],
    queryFn: () => getAvailableSlots(selectedDate, bookingType),
    enabled: !!selectedDate,
  });

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onSuccess?.();
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBookingRequest }) => 
      updateBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);
    
    if (isEditing && booking) {
      updateMutation.mutate({
        id: booking.id,
        data: {
          booking_type: bookingType,
          status,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: duration,
          address: address || null,
          notes: notes || null,
        },
      });
    } else {
      createMutation.mutate({
        customer_id: customerId,
        booking_type: bookingType,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: duration,
        address: address || null,
        notes: notes || null,
      } as CreateBookingRequest);
    }
  };

  const selectedCustomer = customers?.data?.find((c) => c.id === customerId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20">
      <div className="w-full max-w-lg rounded-lg border border-rms-border bg-rms-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-rms-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-rms-text">
            {isEditing ? "Edit Booking" : "New Booking"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-rms-text-secondary hover:bg-rms-raised hover:text-rms-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Booking Type */}
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Booking Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setBookingType("pickup")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  bookingType === "pickup"
                    ? "border-brand-500 bg-brand-500/20 text-brand-500"
                    : "border-rms-border bg-rms-raised text-rms-text-secondary hover:bg-rms-border"
                )}
              >
                Pickup
              </button>
              <button
                onClick={() => setBookingType("dropoff")}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  bookingType === "dropoff"
                    ? "border-teal-500 bg-teal-500/20 text-teal-400"
                    : "border-rms-border bg-rms-raised text-rms-text-secondary hover:bg-rms-border"
                )}
              >
                Dropoff
              </button>
            </div>
          </div>

          {/* Customer Selection */}
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={isEditing}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">Select a customer</option>
              {customers?.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `- ${c.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Repair Selection (optional) */}
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">
              Repair (optional)
            </label>
            <select
              value={repairId}
              onChange={(e) => setRepairId(e.target.value)}
              disabled={isEditing}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">Link to a repair (optional)</option>
              {repairs?.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ticket_number} - {r.customer?.name || "Unknown"}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
              >
                {availableSlots?.map((slot) => (
                  <option 
                    key={slot.time} 
                    value={slot.time}
                    disabled={!slot.available}
                  >
                    {slot.time} {!slot.available && "(Booked)"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Duration (minutes)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">
              Address (for pickup/dropoff)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter address for pickup/dropoff..."
              rows={2}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text placeholder-rms-text-secondary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Status (editing only) */}
          {isEditing && (
            <div>
              <label className="mb-2 block text-xs font-medium text-rms-text-secondary">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookingStatus)}
                className="w-full rounded-lg border border-rms-border bg-rms-raised px-3 py-2 text-sm text-rms-text focus:border-brand-500 focus:outline-none"
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-rms-border p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-rms-border py-2.5 text-sm font-medium text-rms-text-secondary hover:bg-rms-raised"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || !customerId}
            className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-rms-text hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isEditing ? "Update" : "Create"} Booking
          </button>
        </div>
      </div>
    </div>
  );
}
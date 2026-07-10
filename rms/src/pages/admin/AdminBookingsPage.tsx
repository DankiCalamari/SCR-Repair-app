import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Calendar, Filter, Truck, Package } from "lucide-react";
import { cn, getStatusLabel } from "../../lib/utils";
import { listBookings, deleteBooking, updateBooking } from "../../api/bookings";
import CalendarView from "../../components/bookings/BookingCalendar";
import BookingModal from "../../components/bookings/BookingModal";
import type { Booking, BookingStatus } from "../../types";


export default function AdminBookingsPage() {
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "pickup" | "dropoff">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "scheduled" | "completed" | "cancelled" | "no_show">("all");
  const [dateFilter, setDateFilter] = useState<"week" | "month" | "all">("week");

  const queryClient = useQueryClient();

  const dateRange = dateFilter === "week" 
    ? { start: startOfWeek(new Date()), end: endOfWeek(new Date()) }
    : dateFilter === "month"
    ? { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }
    : null;

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ["bookings", filterType, filterStatus, dateFilter],
    queryFn: () => listBookings(
      0, 100, 
      filterType === "all" ? undefined : filterType,
      filterStatus === "all" ? undefined : filterStatus,
      dateRange?.start.toISOString(),
      dateRange?.end.toISOString()
    ),
  });

  const bookings = bookingsData?.data || [];

  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const handleStatusChange = (booking: Booking, status: BookingStatus) => {
    updateBooking(booking.id, { status });
  };

  const getBookingTypeIcon = (type: string) => {
    return type === "pickup" ? <Truck className="h-4 w-4" /> : <Package className="h-4 w-4" />;
  };

  const getBookingTypeColor = (type: string) => {
    return type === "pickup" 
      ? "text-copper-400 bg-copper-500/15" 
      : "text-teal-400 bg-teal-500/15";
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-warm-50">Bookings</h1>
          <p className="text-sm text-warm-400 mt-1">Manage pickup and dropoff appointments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-copper-500 px-4 py-2.5 text-sm font-medium text-warm-50 hover:bg-copper-600"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-warm-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="rounded-lg border border-warm-600 bg-warm-700 px-3 py-1.5 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="pickup">Pickup Only</option>
            <option value="dropoff">Dropoff Only</option>
          </select>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-lg border border-warm-600 bg-warm-700 px-3 py-1.5 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          className="rounded-lg border border-warm-600 bg-warm-700 px-3 py-1.5 text-sm text-warm-50 focus:border-copper-500 focus:outline-none"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>

        <div className="ml-auto flex gap-1 rounded-lg border border-warm-600 p-1">
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium",
              viewMode === "calendar"
                ? "bg-copper-500 text-warm-50"
                : "text-warm-400 hover:bg-warm-700"
            )}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium",
              viewMode === "list"
                ? "bg-copper-500 text-warm-50"
                : "text-warm-400 hover:bg-warm-700"
            )}
          >
            List
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-copper-500 border-t-transparent" />
        </div>
      ) : viewMode === "calendar" ? (
        <CalendarView
          bookings={bookings}
          onBookingClick={(booking) => {
            setSelectedBooking(booking);
            setShowModal(true);
          }}
          onDateClick={(date) => {
            // Open modal for new booking on that date
            setSelectedBooking({
              id: "",
              customer_id: "",
              booking_type: "pickup",
              status: "scheduled",
              scheduled_at: date.toISOString(),
              duration_minutes: 30,
              address: null,
              notes: null,
              created_by: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Booking);
            setShowModal(true);
          }}
        />
      ) : (
        <div className="rounded-lg border border-warm-700 bg-warm-800 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-warm-700">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-medium text-warm-400">Date & Time</th>
                <th className="px-4 py-3 text-xs font-medium text-warm-400">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-warm-400">Customer</th>
                <th className="px-4 py-3 text-xs font-medium text-warm-400">Repair</th>
                <th className="px-4 py-3 text-xs font-medium text-warm-400">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-warm-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-warm-700/50">
                  <td className="px-4 py-3 text-sm text-warm-50">
                    {format(parseISO(booking.scheduled_at), "MMM d, h:mm a")}
                  </td>
                  <td className="px-4 py-3">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      getBookingTypeColor(booking.booking_type)
                    )}>
                      {getBookingTypeIcon(booking.booking_type)}
                      <span className="capitalize">{booking.booking_type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-warm-300">
                    {booking.customer_name || "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-sm text-warm-400">
                    {booking.ticket_number || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={booking.status}
                      onChange={(e) => handleStatusChange(booking, e.target.value as BookingStatus)}
                      className="rounded-lg border border-warm-600 bg-warm-700 px-2 py-1 text-xs text-warm-50 focus:border-copper-500 focus:outline-none"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no_show">No Show</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowModal(true);
                        }}
                        className="rounded-lg border border-warm-600 px-2.5 py-1.5 text-xs text-warm-300 hover:bg-warm-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(booking.id)}
                        className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {bookings.length === 0 && (
            <div className="flex h-32 items-center justify-center text-warm-400">
              No bookings found for the selected filters
            </div>
          )}
        </div>
      )}

      {showModal && (
        <BookingModal
          booking={selectedBooking}
          onClose={() => {
            setShowModal(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}
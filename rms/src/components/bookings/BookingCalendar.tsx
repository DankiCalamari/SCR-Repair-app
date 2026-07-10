import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addDays, startOfWeek, endOfWeek, parseISO, startOfDay, endOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, Phone } from "lucide-react";
import { cn, formatDate, getStatusColor } from "../../lib/utils";
import type { Booking, BookingType, BookingStatus } from "../../types";


interface CalendarViewProps {
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
  onDateClick?: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView({ bookings, onBookingClick, onDateClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const dateStr = format(new Date(booking.scheduled_at), "yyyy-MM-dd");
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(booking);
    }
    return map;
  }, [bookings]);

  const previousMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const getBookingTypeColor = (type: BookingType) => {
    return type === "pickup" 
      ? "bg-copper-500/20 border-copper-500/30 text-copper-400" 
      : "bg-teal-500/20 border-teal-500/30 text-teal-400";
  };

  return (
    <div className="rounded-lg border border-warm-700 bg-warm-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-warm-700 px-4 py-3">
        <h2 className="font-heading text-lg font-semibold text-warm-50">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={previousMonth}
            className="rounded p-1.5 text-warm-400 hover:bg-warm-700 hover:text-warm-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="rounded p-1.5 text-warm-400 hover:bg-warm-700 hover:text-warm-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-warm-700">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-medium text-warm-400">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDate.get(dateStr) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateStr}
              className={cn(
                "min-h-[100px] border-r border-b border-warm-700/50 p-1 last:border-r-0",
                !isCurrentMonth && "bg-warm-850/30"
              )}
              onClick={() => onDateClick?.(day)}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                  isCurrentDay && "bg-copper-500 text-white",
                  !isCurrentMonth && "text-warm-600"
                )}
              >
                {format(day, "d")}
              </div>
              
              {/* Bookings for this day */}
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((booking) => (
                  <button
                    key={booking.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick?.(booking);
                    }}
                    className={cn(
                      "w-full rounded border px-1.5 py-1 text-left text-xs",
                      getBookingTypeColor(booking.booking_type as BookingType)
                    )}
                  >
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(booking.scheduled_at), "h:mm a")}</span>
                    </div>
                    <div className="truncate">
                      {booking.booking_type === "pickup" ? "Pickup" : "Dropoff"}
                    </div>
                  </button>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-warm-400">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
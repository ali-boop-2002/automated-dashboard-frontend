import { createFileRoute } from "@tanstack/react-router";
import { SimpleLayout } from "@/components/simple-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
});

import { env } from "@/env";

const API_BASE_URL = env.VITE_API_BASE_URL;

// ============= TYPES & INTERFACES =============
interface ApiEvent {
  id: number;
  event_type: string;
  property_id: number;
  ticket_id?: number;
  approval_id?: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: "maintenance" | "lease" | "inspection" | "rent" | "vendor";
  startDate: Date;
  endDate: Date;
  property: string;
  tenant?: string;
  technician?: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  description: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
}

// ============= EVENT TYPE MAPPING =============
const mapEventType = (eventType: string): CalendarEvent["type"] => {
  const mapping: Record<string, CalendarEvent["type"]> = {
    ticket_created: "maintenance",
    ticket_updated: "maintenance",
    approval_created: "rent",
    approval_updated: "rent",
    inspection: "inspection",
    lease: "lease",
    vendor: "vendor",
    maintenance: "maintenance",
    rent: "rent",
  };
  return mapping[eventType.toLowerCase()] || "maintenance";
};

// ============= HELPER FUNCTIONS =============
const getEventColor = (type: CalendarEvent["type"]) => {
  const colors: Record<CalendarEvent["type"], string> = {
    maintenance: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
    lease: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
    inspection: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
    rent: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700",
    vendor: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700",
  };
  return colors[type];
};

const getEventBgColor = (type: CalendarEvent["type"]) => {
  const colors: Record<CalendarEvent["type"], string> = {
    maintenance: "bg-blue-500",
    lease: "bg-green-500",
    inspection: "bg-yellow-500",
    rent: "bg-purple-500",
    vendor: "bg-pink-500",
  };
  return colors[type];
};

const getEventTypeLabel = (type: CalendarEvent["type"]) => {
  const labels: Record<CalendarEvent["type"], string> = {
    maintenance: "🔵 Maintenance",
    lease: "🟢 Lease",
    inspection: "🟡 Inspection",
    rent: "🟣 Rent",
    vendor: "🩷 Vendor",
  };
  return labels[type];
};

const getEventIcon = (type: CalendarEvent["type"]) => {
  switch (type) {
    case "maintenance":
      return "🔧";
    case "lease":
      return "📋";
    case "inspection":
      return "🔍";
    case "rent":
      return "💰";
    case "vendor":
      return "👷";
    default:
      return "📌";
  }
};

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    Low: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    Medium: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    High: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return colors[priority] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Pending":
      return <Clock className="w-4 h-4" />;
    case "In Progress":
      return <AlertCircle className="w-4 h-4" />;
    case "Completed":
      return <CheckCircle2 className="w-4 h-4" />;
    default:
      return null;
  }
};

// ============= CALENDAR GRID GENERATOR =============
const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// ============= AI INSIGHTS GENERATOR =============
const generateAIInsights = (events: CalendarEvent[]) => {
  const today = new Date();
  const insights = [];

  // Overdue tasks
  const overdueTasks = events.filter(
    (e) => e.status === "Pending" && e.startDate < today,
  );
  if (overdueTasks.length > 0) {
    insights.push({
      type: "warning",
      message: `${overdueTasks.length} high priority task${overdueTasks.length > 1 ? "s" : ""} overdue`,
    });
  }

  // Leases expiring soon
  const leaseExpiringSoon = events.filter((e) => {
    if (e.type !== "lease") return false;
    const daysUntil = Math.ceil(
      (e.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntil <= 30 && daysUntil > 0;
  });
  if (leaseExpiringSoon.length > 0) {
    insights.push({
      type: "info",
      message: `${leaseExpiringSoon.length} lease${leaseExpiringSoon.length > 1 ? "s" : ""} expiring within 30 days`,
    });
  }

  // Technician workload
  const technicianEvents = events.reduce(
    (acc, e) => {
      if (e.technician) {
        acc[e.technician] = (acc[e.technician] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
  const overloadedTech = Object.entries(technicianEvents).find(
    ([_, count]) => count > 3,
  );
  if (overloadedTech) {
    insights.push({
      type: "warning",
      message: `${overloadedTech[0]} has ${overloadedTech[1]} tasks scheduled`,
    });
  }

  return insights;
};

// ============= MAIN CALENDAR COMPONENT =============
function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // February 2026
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [showEventModal, setShowEventModal] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [filterType, setFilterType] = useState<"all" | CalendarEvent["type"]>(
    "all",
  );
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterTechnician, setFilterTechnician] = useState("all");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [editEventForm, setEditEventForm] = useState({
    description: '',
    due_date: '',
  });
  const [propertyTickets, setPropertyTickets] = useState<any[]>([]);
  const [propertyApprovals, setPropertyApprovals] = useState<any[]>([]);
  const [loadingPropertyData, setLoadingPropertyData] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    event_type: 'ticket_created',
    property_id: '',
    ticket_id: '',
    approval_id: '',
    description: '',
    due_date: '',
  });

  // When property changes in form, fetch its tickets and approvals
  const handlePropertyChange = async (propertyId: string) => {
    setNewEventForm((prev) => ({ ...prev, property_id: propertyId, ticket_id: '', approval_id: '' }));
    setPropertyTickets([]);
    setPropertyApprovals([]);

    if (!propertyId) return;

    try {
      setLoadingPropertyData(true);
      const response = await fetch(`${API_BASE_URL}/properties/${propertyId}`);
      if (!response.ok) throw new Error('Failed to fetch property details');

      const data = await response.json();
      console.log('Fetched property details for event form:', data);

      setPropertyTickets(data.tickets || []);
      setPropertyApprovals(data.approvals || []);
    } catch (err) {
      console.error('Failed to fetch property tickets/approvals:', err);
    } finally {
      setLoadingPropertyData(false);
    }
  };

  // Fetch events and properties from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch events and properties in parallel
        const [eventsRes, propertiesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/events`),
          fetch(`${API_BASE_URL}/properties`),
        ]);

        let propertiesData: Property[] = [];
        if (propertiesRes.ok) {
          propertiesData = await propertiesRes.json();
          setProperties(propertiesData);
        }

        if (eventsRes.ok) {
          const eventsData: ApiEvent[] = await eventsRes.json();
          console.log("Fetched events:", eventsData);

          // Transform API events to CalendarEvent format
          const transformed: CalendarEvent[] = eventsData.map((event) => {
            const dueDate = new Date(event.due_date);
            const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000); // +1 hour

            // Find property name from properties list
            const property = propertiesData.find(
              (p) => p.id === event.property_id,
            );
            const propertyName = property ? property.name : "Unknown";

            return {
              id: event.id.toString(),
              title: event.description,
              type: mapEventType(event.event_type),
              startDate: dueDate,
              endDate: endDate,
              property: propertyName,
              priority: "Medium" as const,
              status: "Pending" as const,
              description: event.description,
            };
          });

          setEvents(transformed);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterType !== "all" && event.type !== filterType) return false;
      if (filterProperty !== "all" && event.property !== filterProperty)
        return false;
      if (filterTechnician !== "all" && event.technician !== filterTechnician)
        return false;
      return true;
    });
  }, [events, filterType, filterProperty, filterTechnician]);

  // Get unique properties and technicians for filters
  const uniqueProperties = useMemo(
    () => [...new Set(events.map((e) => e.property))],
    [events],
  );
  const uniqueTechnicians = useMemo(
    () => [
      ...new Set(
        events.filter((e) => e.technician).map((e) => e.technician),
      ),
    ],
    [events],
  );

  // Generate AI insights
  const aiInsights = useMemo(
    () => generateAIInsights(filteredEvents),
    [filteredEvents],
  );

  // Refresh events helper
  const refreshEvents = async () => {
    try {
      const eventsRes = await fetch(`${API_BASE_URL}/events`);
      if (eventsRes.ok) {
        const eventsData: ApiEvent[] = await eventsRes.json();
        const transformed: CalendarEvent[] = eventsData.map((event) => {
          const dueDate = new Date(event.due_date);
          const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000);
          const property = properties.find((p) => p.id === event.property_id);
          return {
            id: event.id.toString(),
            title: event.description,
            type: mapEventType(event.event_type),
            startDate: dueDate,
            endDate: endDate,
            property: property ? property.name : "Unknown",
            priority: "Medium" as const,
            status: "Pending" as const,
            description: event.description,
          };
        });
        setEvents(transformed);
      }
    } catch (err) {
      console.error('Failed to refresh events:', err);
    }
  };

  // Open edit modal
  const openEditEvent = () => {
    if (!selectedEvent) return;
    setEditEventForm({
      description: selectedEvent.description,
      due_date: selectedEvent.startDate.toISOString().slice(0, 16),
    });
    setShowEventModal(false);
    setShowEditEventModal(true);
  };

  // Update event function
  const updateEvent = async () => {
    if (!selectedEvent) return;

    try {
      setEditingEvent(true);

      const payload: Record<string, any> = {};
      if (editEventForm.description) payload.description = editEventForm.description;
      if (editEventForm.due_date) payload.due_date = new Date(editEventForm.due_date).toISOString();

      const response = await fetch(`${API_BASE_URL}/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status}`);
      }

      console.log('Event updated successfully');

      await refreshEvents();
      setShowEditEventModal(false);
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to update event:', err);
    } finally {
      setEditingEvent(false);
    }
  };

  // Create event function
  const createEvent = async () => {
    if (!newEventForm.description || !newEventForm.property_id || !newEventForm.due_date) {
      return;
    }

    try {
      setCreatingEvent(true);

      const payload: Record<string, any> = {
        event_type: newEventForm.event_type,
        property_id: parseInt(newEventForm.property_id),
        description: newEventForm.description,
        due_date: new Date(newEventForm.due_date).toISOString(),
      };

      if (newEventForm.ticket_id) payload.ticket_id = parseInt(newEventForm.ticket_id);
      if (newEventForm.approval_id) payload.approval_id = newEventForm.approval_id;

      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.status}`);
      }

      console.log('Event created successfully');

      // Refresh events
      await refreshEvents();

      // Reset form and close modal
      setNewEventForm({
        event_type: 'ticket_created',
        property_id: '',
        ticket_id: '',
        approval_id: '',
        description: '',
        due_date: '',
      });
      setShowNewEventModal(false);
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setCreatingEvent(false);
    }
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
    );
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToPrevious = () => {
    switch (viewMode) {
      case 'month':
        goToPreviousMonth();
        break;
      case 'week':
        goToPreviousWeek();
        break;
      case 'day':
        goToPreviousDay();
        break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case 'month':
        goToNextMonth();
        break;
      case 'week':
        goToNextWeek();
        break;
      case 'day':
        goToNextDay();
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    return filteredEvents.filter((event) => isSameDay(event.startDate, date));
  };

  // ============= RENDER MONTH VIEW =============
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="bg-gray-50 dark:bg-gray-800/50 min-h-24 p-2 border border-gray-200 dark:border-gray-700"
        ></div>,
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday = isSameDay(
        new Date(),
        new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      );

      days.push(
        <div
          key={day}
          className={`min-h-24 p-2 border border-gray-200 ${
            isToday ? "bg-blue-50 dark:bg-blue-950/50" : ""
          } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition`}
        >
          <div
            className={`font-semibold mb-1 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`text-xs p-1 rounded cursor-pointer border hover:shadow-md transition ${getEventColor(
                  event.type,
                )}`}
              >
                <div className="font-semibold truncate">
                  {getEventIcon(event.type)} {event.title}
                </div>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 px-1">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>,
      );
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="bg-gray-100 dark:bg-gray-800 p-3 text-center font-semibold text-sm"
          >
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  // ============= RENDER WEEK VIEW =============
  const renderWeekView = () => {
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date;
    });

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-100 dark:bg-gray-800">
          {weekDays.map((date) => (
            <div
              key={date.toISOString()}
              className="p-3 text-center border-r last:border-r-0"
            >
              <div className="font-semibold text-sm">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{date.getDate()}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weekDays.map((date) => {
            const dayEvents = filteredEvents.filter((e) =>
              isSameDay(e.startDate, date),
            );
            return (
              <div
                key={date.toISOString()}
                className="min-h-96 border-r last:border-r-0 p-2 space-y-1 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`text-xs p-2 rounded cursor-pointer border-l-4 ${getEventColor(event.type)} hover:shadow-md transition`}
                  >
                    <div className="font-semibold truncate">{event.title}</div>
                    {event.startDate.getHours() > 0 && (
                      <div className="text-xs opacity-75">
                        {event.startDate.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============= RENDER DAY VIEW =============
  const renderDayView = () => {
    const dayEvents = filteredEvents.filter((e) =>
      isSameDay(e.startDate, currentDate),
    );
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 border-b">
          <h3 className="font-semibold">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
        </div>

        <div className="space-y-px">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter(
              (e) => e.startDate.getHours() === hour,
            );
            return (
              <div key={hour} className="flex border-b last:border-b-0">
                <div className="w-20 bg-gray-50 dark:bg-gray-800/50 p-3 text-xs font-semibold text-gray-600 dark:text-gray-400 border-r">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div className="flex-1 p-3 space-y-1">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`p-2 rounded cursor-pointer border-l-4 ${getEventColor(event.type)} hover:shadow-md transition`}
                    >
                      <div className="font-semibold text-sm">{event.title}</div>
                      <div className="text-xs opacity-75">{event.property}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============= MAIN RENDER =============
  return (
    <SimpleLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Property management events & scheduling
            </p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setShowNewEventModal(true)}>
            <Plus className="size-4" />
            <span>New Event</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Section */}
          <div className="lg:col-span-3 space-y-4">
            {/* Controls */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Top Controls: Navigation and View Mode */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNext}>
                      <ChevronRight className="size-4" />
                    </Button>
                    <span className="font-semibold ml-4">
                      {viewMode === 'month' && 
                        currentDate.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      }
                      {viewMode === 'week' && (() => {
                        const startDate = new Date(currentDate);
                        startDate.setDate(startDate.getDate() - startDate.getDay());
                        const endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + 6);
                        
                        if (startDate.getMonth() === endDate.getMonth()) {
                          return `${startDate.toLocaleDateString("en-US", { month: "long" })} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
                        } else {
                          return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${endDate.getFullYear()}`;
                        }
                      })()}
                      {viewMode === 'day' && 
                        currentDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      }
                    </span>
                  </div>

                  {/* View Mode Buttons */}
                  <div className="flex gap-1">
                    {(["month", "week", "day"] as const).map((mode) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={viewMode === mode ? "default" : "outline"}
                        onClick={() => setViewMode(mode)}
                        className="capitalize"
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Event Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="all">All Types</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="lease">Lease</option>
                      <option value="inspection">Inspection</option>
                      <option value="rent">Rent</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Property
                    </label>
                    <select
                      value={filterProperty}
                      onChange={(e) => setFilterProperty(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="all">All Properties</option>
                      {uniqueProperties.map((prop) => (
                        <option key={prop} value={prop}>
                          {prop}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Technician
                    </label>
                    <select
                      value={filterTechnician}
                      onChange={(e) => setFilterTechnician(e.target.value)}
                      className="w-full h-8 px-2.5 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="all">All Technicians</option>
                      {uniqueTechnicians.map((tech) => (
                        <option key={tech} value={tech}>
                          {tech}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Display */}
            <Card>
              <CardContent className="p-4">
                {viewMode === "month" && renderMonthView()}
                {viewMode === "week" && renderWeekView()}
                {viewMode === "day" && renderDayView()}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar: AI Insights */}
          <div className="space-y-4">
            {/* Toggle Button */}
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm">AI Insights</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInsights(!showInsights)}
                className="text-xs"
              >
                {showInsights ? "✕" : "•••"}
              </Button>
            </div>

            {/* Insights Panel */}
            {showInsights && (
              <div className="space-y-3">
                {aiInsights.length > 0 ? (
                  aiInsights.map((insight, idx) => (
                    <Card
                      key={idx}
                      className={`${
                        insight.type === "warning"
                          ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50"
                          : "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50"
                      }`}
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-2">
                          {insight.type === "warning" ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          )}
                          <p className="text-xs text-gray-800 dark:text-gray-200">
                            {insight.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
                    <CardContent className="p-3">
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-800 dark:text-gray-200">
                          All systems running smoothly!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Legend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Event Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { type: "maintenance", icon: "🔵", label: "Maintenance" },
                  { type: "lease", icon: "🟢", label: "Lease" },
                  { type: "inspection", icon: "🟡", label: "Inspection" },
                  { type: "rent", icon: "🟣", label: "Rent" },
                  { type: "vendor", icon: "🩷", label: "Vendor" },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-gray-700">{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Total Events</span>
                  <span className="font-semibold">{filteredEvents.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold">
                    {
                      filteredEvents.filter((e) => e.status === "Pending")
                        .length
                    }
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">In Progress</span>
                  <span className="font-semibold">
                    {
                      filteredEvents.filter((e) => e.status === "In Progress")
                        .length
                    }
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold">
                    {
                      filteredEvents.filter((e) => e.status === "Completed")
                        .length
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-96 overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getEventIcon(selectedEvent.type)}
                  </span>
                  <div>
                    <CardTitle>{selectedEvent.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getEventTypeLabel(selectedEvent.type)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">
                    Status
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedEvent.status)}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                        selectedEvent.status === "Completed"
                          ? "Low"
                          : selectedEvent.priority,
                      )}`}
                    >
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">
                    Priority
                  </label>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                        selectedEvent.priority,
                      )}`}
                    >
                      {selectedEvent.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-gray-600">
                    Property
                  </label>
                  <p className="mt-1 text-gray-700">{selectedEvent.property}</p>
                </div>
                {selectedEvent.tenant && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Tenant
                    </label>
                    <p className="mt-1 text-gray-700">{selectedEvent.tenant}</p>
                  </div>
                )}
                {selectedEvent.technician && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Technician/Vendor
                    </label>
                    <p className="mt-1 text-gray-700">
                      {selectedEvent.technician}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-gray-600">
                    Date
                  </label>
                  <p className="mt-1 text-gray-700">
                    {selectedEvent.startDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {selectedEvent.startDate.getHours() > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600">
                      Time
                    </label>
                    <p className="mt-1 text-gray-700">
                      {selectedEvent.startDate.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {selectedEvent.endDate.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-600">
                  Description
                </label>
                <p className="mt-1 text-sm text-gray-700">
                  {selectedEvent.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button size="sm" className="flex-1" onClick={openEditEvent}>
                  Edit Event
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEventModal(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditEventModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Card className="w-full max-w-lg mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit Event #{selectedEvent.id}</h2>
                <button
                  onClick={() => setShowEditEventModal(false)}
                  disabled={editingEvent}
                  className="text-muted-foreground hover:text-foreground text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editEventForm.description}
                    onChange={(e) =>
                      setEditEventForm({ ...editEventForm, description: e.target.value })
                    }
                    disabled={editingEvent}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editEventForm.due_date}
                    onChange={(e) =>
                      setEditEventForm({ ...editEventForm, due_date: e.target.value })
                    }
                    disabled={editingEvent}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowEditEventModal(false)}
                  disabled={editingEvent}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateEvent}
                  disabled={editingEvent}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {editingEvent ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Event Modal */}
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <Card className="w-full max-w-2xl mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Create New Event</h2>
                <button
                  onClick={() => setShowNewEventModal(false)}
                  disabled={creatingEvent}
                  className="text-muted-foreground hover:text-foreground text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Event Type and Property */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Event Type *
                    </label>
                    <select
                      value={newEventForm.event_type}
                      onChange={(e) =>
                        setNewEventForm({ ...newEventForm, event_type: e.target.value })
                      }
                      disabled={creatingEvent}
                      className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="ticket_created">Ticket Created</option>
                      <option value="approval_created">Approval Created</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inspection">Inspection</option>
                      <option value="lease">Lease</option>
                      <option value="vendor">Vendor</option>
                      <option value="rent">Rent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      Property *
                    </label>
                    <select
                      value={newEventForm.property_id}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      disabled={creatingEvent}
                      className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">-- Select Property --</option>
                      {properties.map((prop) => (
                        <option key={prop.id} value={prop.id}>
                          {prop.name} ({prop.address})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., HVAC repair needed in unit 4A"
                    value={newEventForm.description}
                    onChange={(e) =>
                      setNewEventForm({ ...newEventForm, description: e.target.value })
                    }
                    disabled={creatingEvent}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={newEventForm.due_date}
                    onChange={(e) =>
                      setNewEventForm({ ...newEventForm, due_date: e.target.value })
                    }
                    disabled={creatingEvent}
                    className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                  />
                </div>

                {/* Ticket and Approval - shown after property is selected */}
                {newEventForm.property_id && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">
                        Related Ticket (optional)
                      </label>
                      {loadingPropertyData ? (
                        <p className="text-xs text-muted-foreground py-2">Loading tickets...</p>
                      ) : propertyTickets.length > 0 ? (
                        <select
                          value={newEventForm.ticket_id}
                          onChange={(e) =>
                            setNewEventForm({ ...newEventForm, ticket_id: e.target.value })
                          }
                          disabled={creatingEvent}
                          className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="">-- None --</option>
                          {propertyTickets.map((ticket: any) => (
                            <option key={ticket.id} value={ticket.id}>
                              #{ticket.id} - {ticket.issue} ({ticket.status})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">No tickets for this property</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">
                        Related Approval (optional)
                      </label>
                      {loadingPropertyData ? (
                        <p className="text-xs text-muted-foreground py-2">Loading approvals...</p>
                      ) : propertyApprovals.length > 0 ? (
                        <select
                          value={newEventForm.approval_id}
                          onChange={(e) =>
                            setNewEventForm({ ...newEventForm, approval_id: e.target.value })
                          }
                          disabled={creatingEvent}
                          className="w-full h-9 px-2.5 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="">-- None --</option>
                          {propertyApprovals.map((approval: any) => (
                            <option key={approval.id} value={approval.id}>
                              {approval.id} - {approval.type} (${approval.amount})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">No approvals for this property</p>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">* Required fields</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowNewEventModal(false)}
                  disabled={creatingEvent}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createEvent}
                  disabled={creatingEvent || !newEventForm.description || !newEventForm.property_id || !newEventForm.due_date}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {creatingEvent ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SimpleLayout>
  );
}

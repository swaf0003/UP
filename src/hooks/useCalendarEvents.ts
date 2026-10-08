import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  is_synced: boolean;
  ics_uid: string | null;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useCalendarEvents() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (!error && data) {
      setEvents(data as CalendarEvent[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (event: {
    title: string;
    description?: string;
    location?: string;
    start_time: string;
    end_time: string;
    color?: string;
  }) => {
    if (!user) return;
    const { error } = await (supabase as any).from("calendar_events").insert({
      user_id: user.id,
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      start_time: event.start_time,
      end_time: event.end_time,
      color: event.color || "primary",
      is_synced: false,
    });
    if (error) {
      toast.error("Erreur lors de l'ajout");
    } else {
      toast.success("Événement ajouté !");
      fetchEvents();
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    const { error } = await (supabase as any)
      .from("calendar_events")
      .update(updates)
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Événement mis à jour !");
      fetchEvents();
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await (supabase as any)
      .from("calendar_events")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Événement supprimé !");
      fetchEvents();
    }
  };

  const syncICS = async (icsUrl: string) => {
    if (!user) return;
    const { data, error } = await supabase.functions.invoke("sync-ics", {
      body: { ics_url: icsUrl },
    });
    if (error) {
      toast.error("Erreur de synchronisation ICS");
    } else {
      toast.success(`${data.count} événements importés !`);
      fetchEvents();
    }
  };

  const getNextEvent = (): CalendarEvent | null => {
    const now = new Date();
    return events.find((e) => new Date(e.start_time) > now) || null;
  };

  return { events, loading, addEvent, updateEvent, deleteEvent, syncICS, fetchEvents, getNextEvent };
}

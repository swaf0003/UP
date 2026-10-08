import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Trash2, Edit2, X,
  RefreshCw, Link as LinkIcon, Loader2,
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addDays, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useCalendarEvents";
import { Badge } from "@/components/ui/badge";

type ViewMode = "month" | "week" | "day";

const EVENT_COLORS: { id: string; label: string; class: string }[] = [
  { id: "primary", label: "Bleu", class: "bg-primary" },
  { id: "destructive", label: "Rouge", class: "bg-destructive" },
  { id: "success", label: "Vert", class: "bg-success" },
  { id: "warning", label: "Orange", class: "bg-warning" },
  { id: "info", label: "Cyan", class: "bg-info" },
];

const colorClass = (c: string) => EVENT_COLORS.find((e) => e.id === c)?.class || "bg-primary";

export default function AgendaPage() {
  const { events, loading, addEvent, updateEvent, deleteEvent, syncICS } = useCalendarEvents();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showICSDialog, setShowICSDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [icsUrl, setIcsUrl] = useState("");
  const [syncing, setSyncing] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    color: "primary",
  });

  // Calendar grid for month view
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_time), day));

  const navigatePrev = () => {
    if (viewMode === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateNext = () => {
    if (viewMode === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    await addEvent({
      title: newEvent.title,
      description: newEvent.description,
      location: newEvent.location,
      start_time: `${newEvent.date}T${newEvent.startTime}:00`,
      end_time: `${newEvent.date}T${newEvent.endTime}:00`,
      color: newEvent.color,
    });
    setShowAddDialog(false);
    setNewEvent({ title: "", description: "", location: "", date: "", startTime: "09:00", endTime: "10:00", color: "primary" });
  };

  const handleEditSave = async () => {
    if (!editingEvent) return;
    await updateEvent(editingEvent.id, {
      title: editingEvent.title,
      description: editingEvent.description,
      location: editingEvent.location,
      start_time: editingEvent.start_time,
      end_time: editingEvent.end_time,
      color: editingEvent.color,
    });
    setEditingEvent(null);
  };

  const handleSync = async () => {
    if (!icsUrl) return;
    setSyncing(true);
    await syncICS(icsUrl);
    setSyncing(false);
    setShowICSDialog(false);
  };

  const openAddForDate = (date: Date) => {
    setNewEvent((p) => ({ ...p, date: format(date, "yyyy-MM-dd") }));
    setShowAddDialog(true);
  };

  const dayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const headerLabel = viewMode === "month"
    ? format(currentDate, "MMMM yyyy", { locale: fr })
    : viewMode === "week"
    ? `Semaine du ${format(weekDays[0], "d MMM", { locale: fr })}`
    : format(currentDate, "EEEE d MMMM yyyy", { locale: fr });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-heading font-bold text-foreground">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setShowICSDialog(true)}>
            <LinkIcon className="w-3.5 h-3.5 mr-1" /> ICS
          </Button>
          <Button size="sm" className="rounded-xl gradient-primary border-0 text-xs" onClick={() => { setNewEvent((p) => ({ ...p, date: format(new Date(), "yyyy-MM-dd") })); setShowAddDialog(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 glass rounded-xl p-1">
        {(["month", "week", "day"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
              viewMode === mode ? "gradient-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === "month" ? "Mois" : mode === "week" ? "Semaine" : "Jour"}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={navigatePrev} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="text-base font-heading font-semibold text-foreground capitalize">{headerLabel}</h2>
        <button onClick={navigateNext} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Month View */}
      {viewMode === "month" && (
        <div className="glass rounded-2xl p-3 overflow-hidden">
          <div className="grid grid-cols-7 gap-px mb-1">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} className="text-center text-[0.6rem] font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {monthDays.map((day) => {
              const dayEvts = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  onDoubleClick={() => openAddForDate(day)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg transition-all text-xs",
                    !inMonth && "opacity-30",
                    today && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    selected && "bg-accent",
                    "hover:bg-accent/50"
                  )}
                >
                  <span className={cn("font-medium", today && "text-primary font-bold")}>{format(day, "d")}</span>
                  {dayEvts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayEvts.slice(0, 3).map((e) => (
                        <div key={e.id} className={cn("w-1.5 h-1.5 rounded-full", colorClass(e.color))} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <div className="glass rounded-2xl p-3 space-y-1">
          {weekDays.map((day) => {
            const dayEvts = getEventsForDay(day);
            const today = isToday(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => { setSelectedDate(day); setViewMode("day"); }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-accent/50 text-left",
                  today && "bg-accent/30 ring-1 ring-primary/20"
                )}
              >
                <div className="text-center w-10">
                  <p className="text-[0.6rem] text-muted-foreground uppercase">{format(day, "EEE", { locale: fr })}</p>
                  <p className={cn("text-lg font-bold", today ? "text-primary" : "text-foreground")}>{format(day, "d")}</p>
                </div>
                <div className="flex-1 min-w-0">
                  {dayEvts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Aucun événement</p>
                  ) : (
                    <div className="space-y-1">
                      {dayEvts.slice(0, 2).map((e) => (
                        <div key={e.id} className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full shrink-0", colorClass(e.color))} />
                          <span className="text-xs font-medium text-foreground truncate">{e.title}</span>
                          <span className="text-[0.6rem] text-muted-foreground">{format(new Date(e.start_time), "HH:mm")}</span>
                        </div>
                      ))}
                      {dayEvts.length > 2 && <span className="text-[0.6rem] text-muted-foreground">+{dayEvts.length - 2} autres</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <div className="glass rounded-2xl p-4 space-y-3">
          {(() => {
            const dayEvts = getEventsForDay(currentDate);
            if (dayEvts.length === 0) {
              return (
                <div className="text-center py-8">
                  <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Aucun événement ce jour</p>
                  <Button size="sm" variant="outline" className="mt-3 rounded-xl text-xs" onClick={() => openAddForDate(currentDate)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter un événement
                  </Button>
                </div>
              );
            }
            return dayEvts.map((e) => (
              <EventCard key={e.id} event={e} onEdit={() => setEditingEvent(e)} onDelete={() => deleteEvent(e.id)} />
            ));
          })()}
        </div>
      )}

      {/* Selected day events (month/week) */}
      {selectedDate && viewMode !== "day" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-semibold text-foreground capitalize">
              {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openAddForDate(selectedDate)}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => setSelectedDate(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {dayEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">Aucun événement</p>
          ) : (
            <div className="space-y-2">
              {dayEvents.map((e) => (
                <EventCard key={e.id} event={e} onEdit={() => setEditingEvent(e)} onDelete={() => deleteEvent(e.id)} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Nouvel événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Titre *</Label>
              <Input value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Cours de Physique" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Début</Label>
                <Input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent((p) => ({ ...p, startTime: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Fin</Label>
                <Input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent((p) => ({ ...p, endTime: e.target.value }))} className="rounded-xl" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Lieu</Label>
              <Input value={newEvent.location} onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))} placeholder="Ex: Salle B204" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={newEvent.description} onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} placeholder="Notes..." className="rounded-xl resize-none" rows={2} />
            </div>
            <div>
              <Label className="text-xs">Couleur</Label>
              <div className="flex gap-2 mt-1">
                {EVENT_COLORS.map((c) => (
                  <button key={c.id} onClick={() => setNewEvent((p) => ({ ...p, color: c.id }))} className={cn("w-7 h-7 rounded-full transition-all", c.class, newEvent.color === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "opacity-60 hover:opacity-100")} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddEvent} disabled={!newEvent.title || !newEvent.date} className="w-full rounded-xl gradient-primary border-0">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Modifier l'événement</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Titre</Label>
                <Input value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Lieu</Label>
                <Input value={editingEvent.location} onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} className="rounded-xl" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={editingEvent.description} onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })} className="rounded-xl resize-none" rows={2} />
              </div>
              <div>
                <Label className="text-xs">Couleur</Label>
                <div className="flex gap-2 mt-1">
                  {EVENT_COLORS.map((c) => (
                    <button key={c.id} onClick={() => setEditingEvent({ ...editingEvent, color: c.id })} className={cn("w-7 h-7 rounded-full transition-all", c.class, editingEvent.color === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110" : "opacity-60 hover:opacity-100")} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEditSave} className="w-full rounded-xl gradient-primary border-0">
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ICS Sync Dialog */}
      <Dialog open={showICSDialog} onOpenChange={setShowICSDialog}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Synchroniser un calendrier ICS</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Colle ici l'URL de ton calendrier TimeEdit ou tout autre lien .ics pour importer tes cours automatiquement.
            </p>
            <div>
              <Label className="text-xs">Lien ICS</Label>
              <Input value={icsUrl} onChange={(e) => setIcsUrl(e.target.value)} placeholder="https://cloud.timeedit.net/..." className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSync} disabled={!icsUrl || syncing} className="w-full rounded-xl gradient-primary border-0">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {syncing ? "Synchronisation..." : "Synchroniser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function EventCard({ event, onEdit, onDelete }: { event: CalendarEvent; onEdit: () => void; onDelete: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 p-3 rounded-xl bg-accent/20 hover:bg-accent/30 transition-colors group">
      <div className={cn("w-1 rounded-full shrink-0", colorClass(event.color))} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[0.65rem] text-muted-foreground">
                {format(new Date(event.start_time), "HH:mm")} — {format(new Date(event.end_time), "HH:mm")}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-[0.65rem] text-muted-foreground">{event.location}</span>
              </div>
            )}
            {event.is_synced && <Badge className="mt-1 text-[0.5rem] px-1.5 py-0 h-4" variant="secondary">ICS</Badge>}
          </div>
          {!event.is_synced && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <Edit2 className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

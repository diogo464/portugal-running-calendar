import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { CalendarIcon, Clock, Filter, Search, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getAllEventTypes, getEventTypeDisplayName } from "@/lib/app";
import { filterEvents, useEventFilters, useEvents, filterHelpers } from "@/lib/event-filters";
// Main component with centralized filter management
export default function RunningEventsPage() {
    // Load events from public/events.json
    const { events: allEvents, loading, error } = useEvents();
    // Centralized filter management
    const { filters, updateFilters, toggleEventType, setMaxDistance, setSearchQuery, clearAllFilters } = useEventFilters({
        selectedDate: new Date() // Set default selected date
    });
    // Compute filtered events based on current filters
    const filteredEvents = useMemo(() => {
        return filterEvents(allEvents, filters);
    }, [allEvents, filters]);
    // Get events for the selected date
    const eventsOnSelectedDate = useMemo(() => {
        if (!filters.selectedDate)
            return [];
        return filterHelpers.getEventsForDate(filteredEvents, filters.selectedDate);
    }, [filteredEvents, filters.selectedDate]);
    // Get event dates for calendar highlighting
    const eventDates = useMemo(() => {
        return filteredEvents
            .map(event => event.event_start_date ? new Date(event.event_start_date) : null)
            .filter(Boolean);
    }, [filteredEvents]);
    // Handler for date selection
    const handleDateSelect = (date) => {
        updateFilters({ selectedDate: date });
    };
    // Loading state
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin" }), _jsx("span", { children: "A carregar eventos..." })] }) }));
    }
    // Error state
    if (error) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-bold text-red-600 mb-2", children: "Erro ao carregar eventos" }), _jsx("p", { className: "text-gray-600", children: error })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen", children: _jsxs("div", { className: "container mx-auto px-3 md:px-4 py-4 md:py-8", children: [_jsxs("div", { className: "mb-6 md:mb-8", children: [_jsx("h1", { className: "text-2xl md:text-4xl font-bold text-gray-900 mb-2", children: "Calend\u00E1rio de Corridas" }), _jsx("p", { className: "text-sm md:text-base text-gray-600", children: "Descobre eventos de corrida em Portugal" })] }), _jsx("div", { className: "mb-6", children: _jsxs("div", { className: "relative w-full", children: [_jsx(Search, { className: "absolute left-3 top-3 h-4 w-4 text-gray-400" }), _jsx(Input, { type: "text", placeholder: "Procurar eventos...", value: filters.searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "pl-10 w-full" })] }) }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6", children: [_jsx("div", { className: "xl:hidden", children: _jsxs(Sheet, { children: [_jsx(SheetTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full", children: [_jsx(Filter, { className: "w-4 h-4 mr-2" }), "Filtros", filterHelpers.getActiveFilterCount(filters) > 0 && (_jsx(Badge, { variant: "secondary", className: "ml-2 text-xs", children: filterHelpers.getActiveFilterCount(filters) }))] }) }), _jsxs(SheetContent, { side: "left", className: "w-80 overflow-y-auto", children: [_jsxs(SheetHeader, { children: [_jsx(SheetTitle, { children: "Filtros" }), _jsx(SheetDescription, { children: "Filtrar eventos por tipo, dist\u00E2ncia e data" })] }), _jsx("div", { className: "mt-6", children: _jsx(FilterPanel, { filters: filters, availableEventTypes: getAllEventTypes(), onToggleEventType: toggleEventType, onSetMaxDistance: setMaxDistance, onUpdateFilters: updateFilters, onClearAllFilters: clearAllFilters, isMobile: true }) })] })] }) }), _jsx("div", { className: "hidden xl:block xl:col-span-1", children: _jsx(FilterPanel, { filters: filters, availableEventTypes: getAllEventTypes(), onToggleEventType: toggleEventType, onSetMaxDistance: setMaxDistance, onUpdateFilters: updateFilters, onClearAllFilters: clearAllFilters, isMobile: false }) }), _jsxs("div", { className: "xl:col-span-3 space-y-4 md:space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6", children: [_jsx(EventsCalendar, { events: filteredEvents, eventDates: eventDates, selectedDate: filters.selectedDate, onDateSelect: handleDateSelect }), _jsx(SelectedDateEvents, { events: eventsOnSelectedDate, selectedDate: filters.selectedDate })] }), _jsx(EventsList, { events: filteredEvents, title: `Todos os Eventos (${filteredEvents.length})` })] })] })] }) }));
}
function FilterPanel({ filters, availableEventTypes, onToggleEventType, onSetMaxDistance, onUpdateFilters, onClearAllFilters, isMobile }) {
    const activeFilterCount = filterHelpers.getActiveFilterCount(filters);
    // Local state for slider to avoid continuous updates while dragging
    const [localMaxDistance, setLocalMaxDistance] = useState(filters.maxDistance);
    // Sync local state when filters change externally (e.g., clear all filters)
    useEffect(() => {
        setLocalMaxDistance(filters.maxDistance);
    }, [filters.maxDistance]);
    const FilterContent = () => (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Per\u00EDodo" }), _jsxs(Select, { value: filters.dateRange, onValueChange: (value) => onUpdateFilters({
                            dateRange: value
                        }), children: [_jsx(SelectTrigger, { className: "w-full", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "Todas as Datas" }), _jsx(SelectItem, { value: "week", children: "Pr\u00F3xima Semana" }), _jsx(SelectItem, { value: "month", children: "Pr\u00F3ximo M\u00EAs" }), _jsx(SelectItem, { value: "quarter", children: "Pr\u00F3ximos 3 Meses" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Tipo de Evento" }), _jsx("div", { className: "space-y-3", children: availableEventTypes.map((type) => (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Checkbox, { id: `${isMobile ? 'mobile' : 'desktop'}-type-${type}`, checked: filters.eventTypes.includes(type), onCheckedChange: () => onToggleEventType(type) }), _jsx(Label, { htmlFor: `${isMobile ? 'mobile' : 'desktop'}-type-${type}`, className: "text-sm font-normal", children: getEventTypeDisplayName(type) })] }, type))) })] }), _jsxs("div", { children: [_jsxs(Label, { className: "text-sm font-medium mb-3 block", children: ["Dist\u00E2ncia M\u00E1xima: ", localMaxDistance >= 30 ? 'Sem limite' : `${localMaxDistance}km`] }), _jsxs("div", { className: "px-2", children: [_jsx(Slider, { value: [localMaxDistance], onValueChange: (value) => setLocalMaxDistance(value[0]), onValueCommit: (value) => onSetMaxDistance(value[0]), max: 30, min: 0, step: 1, className: "w-full" }), _jsxs("div", { className: "flex justify-between text-xs text-gray-500 mt-1", children: [_jsx("span", { children: "0km" }), _jsx("span", { children: "30km+" })] })] })] }), activeFilterCount > 0 && (_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Filtros Ativos" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [filters.eventTypes.map((type) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: getEventTypeDisplayName(type) }, type))), filters.maxDistance < 30 && (_jsxs(Badge, { variant: "secondary", className: "text-xs", children: ["Max ", filters.maxDistance, "km"] }))] })] })), activeFilterCount > 0 && (_jsx(Button, { variant: "outline", onClick: onClearAllFilters, className: "w-full", children: "Limpar Filtros" }))] }));
    if (isMobile) {
        return _jsx(FilterContent, {});
    }
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: ["Filtros", activeFilterCount > 0 && (_jsx(Badge, { variant: "secondary", className: "text-xs", children: activeFilterCount }))] }) }), _jsx(CardContent, { children: _jsx(FilterContent, {}) })] }));
}
function EventsList({ events, title }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg md:text-xl", children: title }) }), _jsx(CardContent, { children: events.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: _jsx("p", { children: "Nenhum evento encontrado com os filtros selecionados" }) })) : (_jsx("div", { className: "grid gap-3 md:gap-4", children: events.map((event) => (_jsxs("div", { className: "border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors", children: [_jsx("div", { className: "text-center mb-3", children: _jsx("h3", { className: "font-semibold text-base md:text-lg", children: event.event_name }) }), _jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-1 text-sm text-gray-500", children: [_jsx(CalendarIcon, { className: "w-4 h-4 shrink-0" }), event.event_start_date ? new Date(event.event_start_date).toLocaleDateString('pt-PT') : 'Data por definir'] }), _jsx("div", { className: "flex gap-1", children: event.event_types.map((type, index) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: getEventTypeDisplayName(type) }, index))) }), _jsxs("div", { className: "flex items-center gap-1 text-sm text-gray-500", children: [_jsx(Clock, { className: "w-4 h-4 shrink-0" }), event.event_distances.map(d => Math.round(d / 100) / 10).join(', '), "km"] })] }), _jsx("div", { className: "text-center mb-3", children: _jsx("p", { className: "text-gray-600 text-sm", children: event.description_short || event.event_description }) }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-left text-sm text-gray-500", children: ["\uD83D\uDCCD ", event.event_location] }), _jsxs("div", { className: "text-right text-xs text-gray-400", children: ["ID: ", event.event_id] })] })] }, event.event_id))) })) })] }));
}
function EventsCalendar({ events, eventDates, selectedDate, onDateSelect }) {
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg md:text-xl", children: "Calend\u00E1rio" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Mostrando ", events.length, " eventos"] })] }), _jsx(CardContent, { children: _jsx(Calendar, { mode: "single", selected: selectedDate, onSelect: onDateSelect, modifiers: {
                        hasEvent: eventDates,
                    }, modifiersStyles: {
                        hasEvent: {
                            backgroundColor: "#3b82f6",
                            color: "white",
                            fontWeight: "bold",
                            borderRadius: "0.375rem",
                            margin: "2px",
                            transform: "scale(0.9)",
                        },
                    }, className: "rounded-md border w-full" }) })] }));
}
function SelectedDateEvents({ events, selectedDate }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-lg md:text-xl", children: [_jsx(CalendarIcon, { className: "w-5 h-5" }), _jsx("span", { className: "truncate", children: selectedDate ? selectedDate.toLocaleDateString('pt-PT') : "Selecione uma Data" })] }) }), _jsx(CardContent, { children: events.length > 0 ? (_jsx("div", { className: "space-y-4", children: events.map((event) => (_jsxs("div", { className: "border rounded-lg p-3 hover:bg-gray-50 transition-colors", children: [_jsx("div", { className: "text-center mb-3", children: _jsx("h4", { className: "font-semibold", children: event.event_name }) }), _jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("div", { className: "w-16" }), _jsx("div", { className: "flex gap-1", children: event.event_types.map((type, index) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: getEventTypeDisplayName(type) }, index))) }), _jsxs("div", { className: "flex items-center gap-1 text-sm text-gray-500", children: [_jsx(Clock, { className: "w-4 h-4 shrink-0" }), event.event_distances.map(d => Math.round(d / 100) / 10).join(', '), "km"] })] }), _jsx("div", { className: "text-center mb-3", children: _jsx("p", { className: "text-gray-600 text-sm", children: event.description_short || event.event_description }) }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-left text-sm text-gray-500", children: ["\uD83D\uDCCD ", event.event_location] }), _jsxs("div", { className: "text-right text-xs text-gray-400", children: ["ID: ", event.event_id] })] })] }, event.event_id))) })) : (_jsxs("div", { className: "text-center py-6 md:py-8 text-gray-500", children: [_jsx(CalendarIcon, { className: "w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm md:text-base", children: "Nenhum evento nesta data" }), _jsx("p", { className: "text-xs md:text-sm", children: "Selecione uma data com eventos (destacada em azul)" })] })) })] }));
}

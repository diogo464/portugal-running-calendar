import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAllEventTypes, getEventTypeDisplayName } from "@/lib/app";
import { filterEvents, useEventFilters, filterHelpers } from "@/lib/event-filters";
// Sample events data (same as before)
const runningEvents = [
// ... same sample data as current component
];
// Main component with centralized filter management
export default function RunningEventsPage() {
    // All events (could come from API/props in real app)
    const [allEvents] = useState(runningEvents);
    // Centralized filter management
    const { filters, updateFilters, toggleEventType, toggleDistance, toggleRegion, setSearchQuery, clearAllFilters } = useEventFilters({
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
    // Get available filter options from current data
    const availableRegions = useMemo(() => filterHelpers.getUniqueRegions(allEvents), [allEvents]);
    const availableDistances = useMemo(() => filterHelpers.getUniqueDistances(allEvents), [allEvents]);
    // Handler for date selection
    const handleDateSelect = (date) => {
        updateFilters({ selectedDate: date });
    };
    return (_jsx("div", { className: "min-h-screen", children: _jsxs("div", { className: "container mx-auto px-3 md:px-4 py-4 md:py-8", children: [_jsxs("div", { className: "mb-6 md:mb-8", children: [_jsx("h1", { className: "text-2xl md:text-4xl font-bold text-gray-900 mb-2", children: "Calend\u00E1rio de Corridas" }), _jsx("p", { className: "text-sm md:text-base text-gray-600", children: "Descobre eventos de corrida em Portugal" })] }), _jsx("div", { className: "mb-6", children: _jsx(Input, { type: "text", placeholder: "Procurar eventos...", value: filters.searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "max-w-md" }) }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6", children: [_jsx(FilterPanel, { filters: filters, availableEventTypes: getAllEventTypes(), availableDistances: availableDistances, availableRegions: availableRegions, onToggleEventType: toggleEventType, onToggleDistance: toggleDistance, onToggleRegion: toggleRegion, onUpdateFilters: updateFilters, onClearAllFilters: clearAllFilters }), _jsxs("div", { className: "xl:col-span-3 space-y-4 md:space-y-6", children: [_jsx(EventsMap, { events: filteredEvents, filters: filters, onToggleRegion: toggleRegion }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6", children: [_jsx(EventsCalendar, { events: filteredEvents, eventDates: eventDates, selectedDate: filters.selectedDate, onDateSelect: handleDateSelect }), _jsx(SelectedDateEvents, { events: eventsOnSelectedDate, selectedDate: filters.selectedDate })] }), _jsx(EventsList, { events: filteredEvents, title: `Todos os Eventos (${filteredEvents.length})` })] })] })] }) }));
}
function FilterPanel({ filters, availableEventTypes, availableDistances, availableRegions, onToggleEventType, onToggleDistance, onToggleRegion, onUpdateFilters, onClearAllFilters }) {
    const activeFilterCount = filterHelpers.getActiveFilterCount(filters);
    return (_jsx("div", { className: "xl:col-span-1", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: ["Filtros", activeFilterCount > 0 && (_jsx("span", { className: "text-sm bg-blue-100 px-2 py-1 rounded", children: activeFilterCount }))] }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-3 block", children: "Per\u00EDodo" }), _jsxs("select", { value: filters.dateRange, onChange: (e) => onUpdateFilters({
                                        dateRange: e.target.value
                                    }), className: "w-full p-2 border rounded", children: [_jsx("option", { value: "all", children: "Todas as Datas" }), _jsx("option", { value: "week", children: "Pr\u00F3xima Semana" }), _jsx("option", { value: "month", children: "Pr\u00F3ximo M\u00EAs" }), _jsx("option", { value: "quarter", children: "Pr\u00F3ximos 3 Meses" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-3 block", children: "Tipo de Evento" }), _jsx("div", { className: "space-y-2", children: availableEventTypes.map((type) => (_jsxs("label", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", checked: filters.eventTypes.includes(type), onChange: () => onToggleEventType(type) }), _jsx("span", { className: "text-sm", children: getEventTypeDisplayName(type) })] }, type))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-3 block", children: "Dist\u00E2ncia" }), _jsx("div", { className: "space-y-2", children: availableDistances.map((distance) => (_jsxs("label", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", checked: filters.distances.includes(distance), onChange: () => onToggleDistance(distance) }), _jsxs("span", { className: "text-sm", children: [distance, "km"] })] }, distance))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-medium mb-3 block", children: "Regi\u00E3o" }), _jsx("div", { className: "space-y-2", children: availableRegions.map((region) => (_jsxs("label", { className: "flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", checked: filters.regions.includes(region), onChange: () => onToggleRegion(region) }), _jsx("span", { className: "text-sm", children: region })] }, region))) })] }), activeFilterCount > 0 && (_jsx("button", { onClick: onClearAllFilters, className: "w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm", children: "Limpar Filtros" }))] })] }) }));
}
function EventsList({ events, title }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg md:text-xl", children: title }) }), _jsx(CardContent, { children: _jsx("div", { className: "grid gap-3 md:gap-4", children: events.map((event) => (_jsxs("div", { className: "border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors", children: [_jsx("h3", { className: "font-semibold text-base md:text-lg", children: event.event_name }), _jsx("p", { className: "text-gray-600 text-sm", children: event.description_short || event.event_description }), _jsxs("div", { className: "mt-2 space-y-1 text-sm text-gray-500", children: [_jsxs("div", { children: ["\uD83D\uDCCD ", event.event_location] }), _jsxs("div", { children: ["\uD83D\uDCCF ", event.event_distances.join(', '), "km"] }), _jsxs("div", { children: ["\uD83D\uDCC5 ", event.event_start_date ? new Date(event.event_start_date).toLocaleDateString('pt-PT') : 'Data por definir'] })] })] }, event.event_id))) }) })] }));
}
function EventsCalendar({ events, eventDates, selectedDate, onDateSelect }) {
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg md:text-xl", children: "Calend\u00E1rio" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Mostrando ", events.length, " eventos"] })] }), _jsx(CardContent, { children: _jsx(Calendar, { mode: "single", selected: selectedDate, onSelect: onDateSelect, modifiers: {
                        hasEvent: eventDates,
                    }, modifiersStyles: {
                        hasEvent: {
                            backgroundColor: "#3b82f6",
                            color: "white",
                            fontWeight: "bold",
                        },
                    }, className: "rounded-md border w-full" }) })] }));
}
function SelectedDateEvents({ events, selectedDate }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg md:text-xl", children: selectedDate ? selectedDate.toLocaleDateString('pt-PT') : "Selecione uma Data" }) }), _jsx(CardContent, { children: events.length > 0 ? (_jsx("div", { className: "space-y-4", children: events.map((event) => (_jsxs("div", { className: "border rounded-lg p-3 hover:bg-gray-50", children: [_jsx("h4", { className: "font-semibold", children: event.event_name }), _jsx("p", { className: "text-sm text-gray-600", children: event.event_location }), _jsxs("p", { className: "text-sm text-gray-500", children: [event.event_distances.join(', '), "km"] })] }, event.event_id))) })) : (_jsx("div", { className: "text-center py-8 text-gray-500", children: _jsx("p", { children: "Nenhum evento nesta data" }) })) })] }));
}
function EventsMap({ events, filters, onToggleRegion }) {
    // Simplified - would contain the SVG map logic
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg md:text-xl", children: "Mapa de Eventos" }), _jsx("p", { className: "text-sm text-gray-600", children: "Clica nas regi\u00F5es para filtrar" })] }), _jsx(CardContent, { children: _jsx("div", { className: "h-64 bg-gray-100 rounded flex items-center justify-center", children: _jsxs("p", { className: "text-gray-500", children: ["Mapa do Portugal (", events.length, " eventos)"] }) }) })] }));
}

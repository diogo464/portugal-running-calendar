import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, CalendarIcon, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { EventType, getAllEventTypes, getEventTypeDisplayName } from "@/lib/app";
// Sample running events data using proper Event structure
const runningEvents = [
    {
        event_id: 1,
        event_name: "Maratona do Porto",
        event_location: "Porto, Portugal",
        event_coordinates: { lat: 41.1579, lon: -8.6291 },
        event_country: "Portugal",
        event_locality: "Porto",
        event_distances: [42.2, 21.1, 10],
        event_types: [EventType.Marathon, EventType.HalfMarathon, EventType.TenK],
        event_images: [],
        event_start_date: "2024-10-06",
        event_end_date: "2024-10-06",
        event_circuit: [],
        event_description: "A maior prova de atletismo do Norte do país, passando pelos pontos mais emblemáticos da cidade do Porto.",
        description_short: "Maratona internacional do Porto com percurso urbano"
    },
    {
        event_id: 2,
        event_name: "Corrida de São Silvestre de Lisboa",
        event_location: "Lisboa, Portugal",
        event_coordinates: { lat: 38.7223, lon: -9.1393 },
        event_country: "Portugal",
        event_locality: "Lisboa",
        event_distances: [10],
        event_types: [EventType.TenK, EventType.SaintSilvester],
        event_images: [],
        event_start_date: "2024-12-31",
        event_end_date: "2024-12-31",
        event_circuit: [],
        event_description: "Tradicional prova de fim de ano pelas ruas de Lisboa, terminando na Praça do Comércio.",
        description_short: "Corrida tradicional de fim de ano em Lisboa"
    },
    {
        event_id: 3,
        event_name: "Trail do Gerês",
        event_location: "Gerês, Portugal",
        event_coordinates: { lat: 41.7297, lon: -8.1508 },
        event_country: "Portugal",
        event_locality: "Gerês",
        event_distances: [25, 15, 8],
        event_types: [EventType.Trail],
        event_images: [],
        event_start_date: "2024-09-15",
        event_end_date: "2024-09-15",
        event_circuit: [],
        event_description: "Trail running no Parque Nacional da Peneda-Gerês, com paisagens deslumbrantes da natureza minhota.",
        description_short: "Trail running no Parque Nacional da Peneda-Gerês"
    },
    {
        event_id: 4,
        event_name: "Meia Maratona de Coimbra",
        event_location: "Coimbra, Portugal",
        event_coordinates: { lat: 40.2033, lon: -8.4103 },
        event_country: "Portugal",
        event_locality: "Coimbra",
        event_distances: [21.1, 10],
        event_types: [EventType.HalfMarathon, EventType.TenK],
        event_images: [],
        event_start_date: "2024-11-17",
        event_end_date: "2024-11-17",
        event_circuit: [],
        event_description: "Percurso pela cidade universitária mais antiga do país, passando pela Universidade e pelo centro histórico.",
        description_short: "Meia maratona pela cidade universitária de Coimbra"
    },
    {
        event_id: 5,
        event_name: "Corrida das Pontes",
        event_location: "Vila Nova de Gaia, Portugal",
        event_coordinates: { lat: 41.1239, lon: -8.6118 },
        event_country: "Portugal",
        event_locality: "Vila Nova de Gaia",
        event_distances: [10, 5],
        event_types: [EventType.TenK, EventType.FiveK],
        event_images: [],
        event_start_date: "2024-08-25",
        event_end_date: "2024-08-25",
        event_circuit: [],
        event_description: "Corrida que atravessa as pontes icónicas sobre o Rio Douro, ligando Porto e Vila Nova de Gaia.",
        description_short: "Corrida pelas pontes do Douro entre Porto e Gaia"
    }
];
const eventTypes = getAllEventTypes();
const distances = [5, 10, 15, 21.1, 25, 42.2];
const regions = [
    { id: "northeast", name: "Northeast", color: "#3b82f6" },
    { id: "midwest", name: "Midwest", color: "#10b981" },
    { id: "south", name: "South", color: "#f59e0b" },
    { id: "west", name: "West", color: "#ef4444" },
];
export default function RunningEventsPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEventTypes, setSelectedEventTypes] = useState([]);
    const [selectedDistances, setSelectedDistances] = useState([]);
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [dateRange, setDateRange] = useState("all");
    const handleEventTypeChange = (eventType, checked) => {
        if (checked) {
            setSelectedEventTypes([...selectedEventTypes, eventType]);
        }
        else {
            setSelectedEventTypes(selectedEventTypes.filter((type) => type !== eventType));
        }
    };
    const handleDistanceChange = (distance, checked) => {
        if (checked) {
            setSelectedDistances([...selectedDistances, distance]);
        }
        else {
            setSelectedDistances(selectedDistances.filter((d) => d !== distance));
        }
    };
    const handleRegionClick = (regionId) => {
        if (selectedRegions.includes(regionId)) {
            setSelectedRegions(selectedRegions.filter((r) => r !== regionId));
        }
        else {
            setSelectedRegions([...selectedRegions, regionId]);
        }
    };
    const filteredEvents = useMemo(() => {
        return runningEvents.filter((event) => {
            // Filter by event type
            if (selectedEventTypes.length > 0 && !event.event_types.some(type => selectedEventTypes.includes(type))) {
                return false;
            }
            // Filter by distance
            if (selectedDistances.length > 0 && !event.event_distances.some(distance => selectedDistances.includes(distance))) {
                return false;
            }
            // Filter by region (using locality for now)
            if (selectedRegions.length > 0 && !selectedRegions.includes(event.event_locality || '')) {
                return false;
            }
            // Filter by date range
            const now = new Date();
            const eventDate = event.event_start_date ? new Date(event.event_start_date) : new Date();
            switch (dateRange) {
                case "week": {
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return eventDate >= now && eventDate <= weekFromNow;
                }
                case "month": {
                    const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                    return eventDate >= now && eventDate <= monthFromNow;
                }
                case "quarter": {
                    const quarterFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
                    return eventDate >= now && eventDate <= quarterFromNow;
                }
                default:
                    return true;
            }
        });
    }, [selectedEventTypes, selectedDistances, selectedRegions, dateRange]);
    const eventsOnSelectedDate = useMemo(() => {
        if (!selectedDate)
            return [];
        return filteredEvents.filter((event) => {
            const eventDate = event.event_start_date ? new Date(event.event_start_date) : new Date();
            return eventDate.toDateString() === selectedDate.toDateString();
        });
    }, [filteredEvents, selectedDate]);
    const eventDates = useMemo(() => {
        return filteredEvents.map((event) => event.event_start_date ? new Date(event.event_start_date) : new Date());
    }, [filteredEvents]);
    const clearAllFilters = () => {
        setSelectedEventTypes([]);
        setSelectedDistances([]);
        setSelectedRegions([]);
        setDateRange("all");
    };
    return (_jsx("div", { className: "min-h-screen", children: _jsxs("div", { className: "container mx-auto px-3 md:px-4 py-4 md:py-8", children: [_jsxs("div", { className: "mb-6 md:mb-8", children: [_jsx("h1", { className: "text-2xl md:text-4xl font-bold text-gray-900 mb-2", children: "Calend\u00E1rio de Corridas" }), _jsx("p", { className: "text-sm md:text-base text-gray-600", children: "Descobre eventos de corrida em Portugal" })] }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6", children: [_jsx("div", { className: "xl:hidden", children: _jsxs(Sheet, { children: [_jsx(SheetTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full", children: [_jsx(Filter, { className: "w-4 h-4 mr-2" }), "Filters", selectedEventTypes.length + selectedDistances.length + selectedRegions.length > 0 && (_jsx(Badge, { variant: "secondary", className: "ml-2 text-xs", children: selectedEventTypes.length + selectedDistances.length + selectedRegions.length }))] }) }), _jsxs(SheetContent, { side: "left", className: "w-80 overflow-y-auto", children: [_jsxs(SheetHeader, { children: [_jsx(SheetTitle, { children: "Filters" }), _jsx(SheetDescription, { children: "Filter events by type, distance, date, and location" })] }), _jsxs("div", { className: "mt-6 space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Date Range" }), _jsxs(Select, { value: dateRange, onValueChange: setDateRange, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Dates" }), _jsx(SelectItem, { value: "week", children: "Next Week" }), _jsx(SelectItem, { value: "month", children: "Next Month" }), _jsx(SelectItem, { value: "quarter", children: "Next 3 Months" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Event Type" }), _jsx("div", { className: "space-y-3", children: eventTypes.map((type) => (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Checkbox, { id: `mobile-${type}`, checked: selectedEventTypes.includes(type), onCheckedChange: (checked) => handleEventTypeChange(type, checked) }), _jsx(Label, { htmlFor: `mobile-${type}`, className: "text-sm font-normal", children: getEventTypeDisplayName(type) })] }, type))) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Distance" }), _jsx("div", { className: "space-y-3", children: distances.map((distance) => (_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Checkbox, { id: `mobile-${distance}`, checked: selectedDistances.includes(distance), onCheckedChange: (checked) => handleDistanceChange(distance, checked) }), _jsxs(Label, { htmlFor: `mobile-${distance}`, className: "text-sm font-normal", children: [distance, "km"] })] }, distance))) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Regions" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: regions.map((region) => (_jsxs(Button, { variant: selectedRegions.includes(region.id) ? "default" : "outline", size: "sm", onClick: () => handleRegionClick(region.id), className: "text-xs h-9", children: [_jsx(MapPin, { className: "w-3 h-3 mr-1" }), region.name] }, region.id))) })] }), (selectedEventTypes.length > 0 || selectedDistances.length > 0 || selectedRegions.length > 0) && (_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Active Filters" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [selectedEventTypes.map((type) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: type }, type))), selectedDistances.map((distance) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: distance }, distance))), selectedRegions.map((regionId) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: regions.find((r) => r.id === regionId)?.name }, regionId)))] })] })), _jsx(Button, { variant: "outline", onClick: clearAllFilters, className: "w-full", children: "Clear All Filters" })] })] })] }) }), _jsx("div", { className: "hidden xl:block xl:col-span-1", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: ["Filters", _jsx(Button, { variant: "outline", size: "sm", onClick: clearAllFilters, children: "Clear All" })] }) }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Date Range" }), _jsxs(Select, { value: dateRange, onValueChange: setDateRange, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Dates" }), _jsx(SelectItem, { value: "week", children: "Next Week" }), _jsx(SelectItem, { value: "month", children: "Next Month" }), _jsx(SelectItem, { value: "quarter", children: "Next 3 Months" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Event Type" }), _jsx("div", { className: "space-y-2", children: eventTypes.map((type) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: type, checked: selectedEventTypes.includes(type), onCheckedChange: (checked) => handleEventTypeChange(type, checked) }), _jsx(Label, { htmlFor: type, className: "text-sm font-normal", children: getEventTypeDisplayName(type) })] }, type))) })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Distance" }), _jsx("div", { className: "space-y-2", children: distances.map((distance) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: `desktop-${distance}`, checked: selectedDistances.includes(distance), onCheckedChange: (checked) => handleDistanceChange(distance, checked) }), _jsxs(Label, { htmlFor: `desktop-${distance}`, className: "text-sm font-normal", children: [distance, "km"] })] }, distance))) })] }), (selectedEventTypes.length > 0 || selectedDistances.length > 0 || selectedRegions.length > 0) && (_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium mb-3 block", children: "Active Filters" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [selectedEventTypes.map((type) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: getEventTypeDisplayName(type) }, type))), selectedDistances.map((distance) => (_jsxs(Badge, { variant: "secondary", className: "text-xs", children: [distance, "km"] }, distance))), selectedRegions.map((regionId) => (_jsx(Badge, { variant: "secondary", className: "text-xs", children: regions.find((r) => r.id === regionId)?.name }, regionId)))] })] }))] })] }) }), _jsxs("div", { className: "xl:col-span-3 space-y-4 md:space-y-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg md:text-xl", children: "Event Locations" }), _jsx("p", { className: "text-sm text-gray-600", children: "Tap regions to filter events by location" })] }), _jsxs(CardContent, { children: [_jsx("div", { className: "relative w-full h-48 md:h-64 bg-gray-100 rounded-lg overflow-hidden", children: _jsxs("svg", { viewBox: "0 0 800 400", className: "w-full h-full", children: [_jsx("path", { d: "M600 50 L750 50 L750 150 L650 150 L600 100 Z", fill: selectedRegions.includes("northeast") ? regions[0].color : "#e5e7eb", stroke: "#374151", strokeWidth: "2", className: "cursor-pointer hover:opacity-80 transition-opacity touch-manipulation", onClick: () => handleRegionClick("northeast") }), _jsx("text", { x: "675", y: "100", textAnchor: "middle", className: "text-xs font-medium fill-white pointer-events-none", children: "Northeast" }), _jsx("path", { d: "M400 80 L600 80 L600 200 L400 200 Z", fill: selectedRegions.includes("midwest") ? regions[1].color : "#e5e7eb", stroke: "#374151", strokeWidth: "2", className: "cursor-pointer hover:opacity-80 transition-opacity touch-manipulation", onClick: () => handleRegionClick("midwest") }), _jsx("text", { x: "500", y: "140", textAnchor: "middle", className: "text-xs font-medium fill-white pointer-events-none", children: "Midwest" }), _jsx("path", { d: "M300 200 L650 200 L650 350 L300 350 Z", fill: selectedRegions.includes("south") ? regions[2].color : "#e5e7eb", stroke: "#374151", strokeWidth: "2", className: "cursor-pointer hover:opacity-80 transition-opacity touch-manipulation", onClick: () => handleRegionClick("south") }), _jsx("text", { x: "475", y: "275", textAnchor: "middle", className: "text-xs font-medium fill-white pointer-events-none", children: "South" }), _jsx("path", { d: "M50 50 L400 50 L400 350 L50 350 Z", fill: selectedRegions.includes("west") ? regions[3].color : "#e5e7eb", stroke: "#374151", strokeWidth: "2", className: "cursor-pointer hover:opacity-80 transition-opacity touch-manipulation", onClick: () => handleRegionClick("west") }), _jsx("text", { x: "225", y: "200", textAnchor: "middle", className: "text-xs font-medium fill-white pointer-events-none", children: "West" })] }) }), _jsx("div", { className: "mt-4 grid grid-cols-2 md:flex md:flex-wrap gap-2", children: regions.map((region) => (_jsxs(Button, { variant: selectedRegions.includes(region.id) ? "default" : "outline", size: "sm", onClick: () => handleRegionClick(region.id), className: "text-xs h-9 touch-manipulation", children: [_jsx(MapPin, { className: "w-3 h-3 mr-1" }), region.name] }, region.id))) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg md:text-xl", children: "Event Calendar" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["Showing ", filteredEvents.length, " events"] })] }), _jsx(CardContent, { children: _jsx(Calendar, { mode: "single", selected: selectedDate, onSelect: setSelectedDate, modifiers: {
                                                            hasEvent: eventDates,
                                                        }, modifiersStyles: {
                                                            hasEvent: {
                                                                backgroundColor: "#3b82f6",
                                                                color: "white",
                                                                fontWeight: "bold",
                                                            },
                                                        }, className: "rounded-md border w-full" }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-lg md:text-xl", children: [_jsx(CalendarIcon, { className: "w-5 h-5" }), _jsx("span", { className: "truncate", children: selectedDate ? selectedDate.toLocaleDateString() : "Select a Date" })] }) }), _jsx(CardContent, { children: eventsOnSelectedDate.length > 0 ? (_jsx("div", { className: "space-y-4", children: eventsOnSelectedDate.map((event) => (_jsxs("div", { className: "border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("h3", { className: "font-semibold text-base md:text-lg pr-2", children: event.event_name }), _jsx("div", { className: "flex gap-1 shrink-0", children: event.event_types.map((type, index) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: getEventTypeDisplayName(type) }, index))) })] }), _jsx("p", { className: "text-gray-600 text-sm mb-3", children: event.description_short || event.event_description }), _jsxs("div", { className: "space-y-2 md:space-y-0 md:flex md:items-center md:gap-4 text-sm text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "w-4 h-4 shrink-0" }), _jsx("span", { className: "truncate", children: event.event_location })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-4 h-4 shrink-0" }), event.event_distances.join(', '), "km"] })] })] }, event.event_id))) })) : (_jsxs("div", { className: "text-center py-6 md:py-8 text-gray-500", children: [_jsx(CalendarIcon, { className: "w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 opacity-50" }), _jsx("p", { className: "text-sm md:text-base", children: "No events on this date" }), _jsx("p", { className: "text-xs md:text-sm", children: "Select a date with events (highlighted in blue)" })] })) })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-lg md:text-xl", children: ["All Events (", filteredEvents.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "grid gap-3 md:gap-4", children: filteredEvents.map((event) => (_jsxs("div", { className: "border rounded-lg p-3 md:p-4 hover:bg-gray-50 transition-colors", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex-1 pr-2", children: [_jsx("h3", { className: "font-semibold text-base md:text-lg", children: event.event_name }), _jsx("p", { className: "text-gray-600 text-sm", children: event.description_short || event.event_description })] }), _jsx("div", { className: "flex gap-1 shrink-0", children: event.event_types.map((type, index) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: getEventTypeDisplayName(type) }, index))) })] }), _jsxs("div", { className: "space-y-2 md:space-y-0 md:flex md:items-center md:gap-6 text-sm text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(CalendarIcon, { className: "w-4 h-4 shrink-0" }), event.event_start_date ? new Date(event.event_start_date).toLocaleDateString('pt-PT') : 'Data por definir'] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(MapPin, { className: "w-4 h-4 shrink-0" }), _jsx("span", { className: "truncate", children: event.event_location })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-4 h-4 shrink-0" }), event.event_distances.join(', '), "km"] })] })] }, event.event_id))) }) })] })] })] })] }) }));
}

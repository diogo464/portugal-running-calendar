import { z } from 'zod/v4';
// Native TypeScript enum for event types
export var EventType;
(function (EventType) {
    EventType["Marathon"] = "marathon";
    EventType["HalfMarathon"] = "half-marathon";
    EventType["TenK"] = "10k";
    EventType["FiveK"] = "5k";
    EventType["Run"] = "run";
    EventType["Trail"] = "trail";
    EventType["Walk"] = "walk";
    EventType["CrossCountry"] = "cross-country";
    EventType["SaintSilvester"] = "saint-silvester";
    EventType["Kids"] = "kids";
    EventType["Relay"] = "relay";
})(EventType || (EventType = {}));
// Zod v4 schema for event type enum - use z.enum() directly with native enum
export const EventTypeSchema = z.enum(EventType);
// Coordinates schema for lat/lon coordinates
const Coordinates = z.object({
    lat: z.number(),
    lon: z.number()
});
// Event schema matching the data structure from extract-events.py
export const Event = z.object({
    event_id: z.number(),
    event_name: z.string().min(1, "Event name is required"),
    event_location: z.string(),
    event_coordinates: Coordinates.nullable(),
    event_country: z.string().nullable(),
    event_locality: z.string().nullable(),
    event_distances: z.array(z.number().positive("Distance must be positive")),
    event_types: z.array(EventTypeSchema),
    event_images: z.array(z.string().min(1, "Image path cannot be empty")),
    event_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").nullable(),
    event_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").nullable(),
    event_circuit: z.array(z.string()),
    event_description: z.string(),
    description_short: z.string().nullable()
});
// Array of events schema
export const EventsArray = z.array(Event);
// Get all event types as an iterable array
export const getAllEventTypes = () => {
    return Object.values(EventType);
};
// Display name mappings for event types
const eventTypeDisplayNames = {
    [EventType.Marathon]: "Marathon",
    [EventType.HalfMarathon]: "Half Marathon",
    [EventType.TenK]: "10K",
    [EventType.FiveK]: "5K",
    [EventType.Run]: "Run",
    [EventType.Trail]: "Trail",
    [EventType.Walk]: "Walk",
    [EventType.CrossCountry]: "Cross Country",
    [EventType.SaintSilvester]: "São Silvestre",
    [EventType.Kids]: "Kids",
    [EventType.Relay]: "Relay"
};
// Get display name for an event type
export const getEventTypeDisplayName = (eventType) => {
    return eventTypeDisplayNames[eventType] || eventType;
};
// Get all event types with their display names for UI components
export const getEventTypesWithDisplayNames = () => {
    return getAllEventTypes().map(type => ({
        value: type,
        label: getEventTypeDisplayName(type)
    }));
};
// Utility function to validate event data
export function validateEvent(data) {
    return Event.parse(data);
}
// Utility function to validate array of events
export function validateEvents(data) {
    return EventsArray.parse(data);
}

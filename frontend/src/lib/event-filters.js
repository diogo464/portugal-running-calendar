// Default filter state
export const createDefaultFilters = () => ({
    eventTypes: [],
    maxDistance: 30, // 30km means no upper limit
    dateRange: 'all',
    selectedDate: new Date(),
    searchQuery: '',
    hasImages: undefined
});
// Core filtering logic
export function filterEvents(events, filters) {
    return events.filter(event => {
        // Event type filtering
        if (filters.eventTypes.length > 0) {
            const hasMatchingType = event.event_types.some(type => filters.eventTypes.includes(type));
            if (!hasMatchingType)
                return false;
        }
        // Distance filtering (convert event distances from meters to km for comparison)
        if (filters.maxDistance < 30) { // 30 means no upper limit
            const hasValidDistance = event.event_distances.some(distance => {
                const km = Math.round(distance / 100) / 10;
                return km <= filters.maxDistance;
            });
            if (!hasValidDistance)
                return false;
        }
        // Text search (name, location, description)
        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            const searchableText = [
                event.event_name,
                event.event_location,
                event.event_description,
                event.description_short || ''
            ].join(' ').toLowerCase();
            if (!searchableText.includes(query))
                return false;
        }
        // Date range filtering
        if (filters.dateRange !== 'all' && event.event_start_date) {
            const eventDate = new Date(event.event_start_date);
            const now = new Date();
            switch (filters.dateRange) {
                case 'week': {
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    if (!(eventDate >= now && eventDate <= weekFromNow))
                        return false;
                    break;
                }
                case 'month': {
                    const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
                    if (!(eventDate >= now && eventDate <= monthFromNow))
                        return false;
                    break;
                }
                case 'quarter': {
                    const quarterFromNow = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
                    if (!(eventDate >= now && eventDate <= quarterFromNow))
                        return false;
                    break;
                }
                case 'custom': {
                    if (filters.customDateStart && eventDate < filters.customDateStart)
                        return false;
                    if (filters.customDateEnd && eventDate > filters.customDateEnd)
                        return false;
                    break;
                }
            }
        }
        // Images filtering
        if (filters.hasImages !== undefined) {
            const hasImages = event.event_images.length > 0;
            if (filters.hasImages && !hasImages)
                return false;
            if (!filters.hasImages && hasImages)
                return false;
        }
        // Geographic filtering (future enhancement)
        if (filters.location && event.event_coordinates) {
            const distance = calculateDistance(filters.location.coordinates, event.event_coordinates);
            if (distance > filters.location.radius)
                return false;
        }
        return true;
    });
}
// Utility function to calculate distance between two coordinates
function calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Helper functions for common filter operations
export const filterHelpers = {
    // Toggle an item in an array filter
    toggleArrayFilter: (array, item) => {
        return array.includes(item)
            ? array.filter(i => i !== item)
            : [...array, item];
    },
    // Clear all filters
    clearAllFilters: () => createDefaultFilters(),
    // Get events for a specific date
    getEventsForDate: (events, date) => {
        return events.filter(event => {
            if (!event.event_start_date)
                return false;
            const eventDate = new Date(event.event_start_date);
            return eventDate.toDateString() === date.toDateString();
        });
    },
    // Count active filters
    getActiveFilterCount: (filters) => {
        let count = 0;
        if (filters.eventTypes.length > 0)
            count++;
        if (filters.maxDistance < 30)
            count++; // 30 is "no limit"
        if (filters.dateRange !== 'all')
            count++;
        if (filters.searchQuery.trim())
            count++;
        if (filters.hasImages !== undefined)
            count++;
        if (filters.location)
            count++;
        return count;
    }
};
// Hook for loading events from API/public directory
import { useState, useCallback, useEffect } from 'react';
export function useEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function loadEvents() {
            try {
                setLoading(true);
                const response = await fetch('/events.json');
                if (!response.ok) {
                    throw new Error(`Failed to load events: ${response.statusText}`);
                }
                const data = await response.json();
                // Validate the events data and filter out past events
                const validatedEvents = Array.isArray(data) ? data : [];
                const now = new Date();
                now.setHours(0, 0, 0, 0); // Set to start of today
                const futureEvents = validatedEvents.filter(event => {
                    if (!event.event_start_date)
                        return true; // Keep events without dates
                    const eventDate = new Date(event.event_start_date);
                    return eventDate >= now;
                });
                setEvents(futureEvents);
                setError(null);
            }
            catch (err) {
                console.error('Error loading events:', err);
                setError(err instanceof Error ? err.message : 'Failed to load events');
                setEvents([]);
            }
            finally {
                setLoading(false);
            }
        }
        loadEvents();
    }, []);
    return { events, loading, error };
}
// Hook for managing filter state (optional - can be used instead of useState)
export function useEventFilters(initialFilters) {
    const [filters, setFilters] = useState(() => ({
        ...createDefaultFilters(),
        ...initialFilters
    }));
    const updateFilters = useCallback((updates) => {
        setFilters(prev => ({ ...prev, ...updates }));
    }, []);
    const toggleEventType = useCallback((eventType) => {
        setFilters(prev => ({
            ...prev,
            eventTypes: filterHelpers.toggleArrayFilter(prev.eventTypes, eventType)
        }));
    }, []);
    const setMaxDistance = useCallback((maxDistance) => {
        setFilters(prev => ({
            ...prev,
            maxDistance
        }));
    }, []);
    const setSearchQuery = useCallback((query) => {
        setFilters(prev => ({ ...prev, searchQuery: query }));
    }, []);
    const clearAllFilters = useCallback(() => {
        setFilters(createDefaultFilters());
    }, []);
    return {
        filters,
        updateFilters,
        toggleEventType,
        setMaxDistance,
        setSearchQuery,
        clearAllFilters
    };
}

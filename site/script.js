class EventsApp {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.fuse = null;
        this.currentView = 'grid';
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadEvents();
    }
    
    initializeElements() {
        this.searchInput = document.getElementById('searchInput');
        this.typeFilter = document.getElementById('typeFilter');
        this.distanceFilter = document.getElementById('distanceFilter');
        this.locationFilter = document.getElementById('locationFilter');
        this.sortBy = document.getElementById('sortBy');
        this.clearFilters = document.getElementById('clearFilters');
        this.resultsCount = document.getElementById('resultsCount');
        this.eventsContainer = document.getElementById('eventsContainer');
        this.noResults = document.getElementById('noResults');
        this.loading = document.getElementById('loading');
        this.gridView = document.getElementById('gridView');
        this.listView = document.getElementById('listView');
    }
    
    setupEventListeners() {
        this.searchInput.addEventListener('input', () => this.filterEvents());
        this.typeFilter.addEventListener('change', () => this.filterEvents());
        this.distanceFilter.addEventListener('change', () => this.filterEvents());
        this.locationFilter.addEventListener('change', () => this.filterEvents());
        this.sortBy.addEventListener('change', () => this.filterEvents());
        this.clearFilters.addEventListener('click', () => this.clearAllFilters());
        
        this.gridView.addEventListener('click', () => this.setView('grid'));
        this.listView.addEventListener('click', () => this.setView('list'));
    }
    
    async loadEvents() {
        try {
            // Try to load the sample events first, then fall back to generated events
            let eventsData;
            try {
                const response = await fetch('../sample-events.json');
                eventsData = await response.json();
            } catch (e) {
                // If sample events don't exist, try the full events file
                const response = await fetch('../portugal-running-events.json');
                eventsData = await response.json();
            }
            
            this.events = eventsData;
            this.initializeFuse();
            this.populateFilters();
            this.filterEvents();
            
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events. Please check that the JSON file exists.');
        }
    }
    
    initializeFuse() {
        const options = {
            keys: [
                { name: 'event_name', weight: 0.3 },
                { name: 'event_location', weight: 0.2 },
                { name: 'description_short', weight: 0.2 },
                { name: 'event_description', weight: 0.1 },
                { name: 'event_types', weight: 0.1 },
                { name: 'event_distances', weight: 0.1 }
            ],
            threshold: 0.4,
            includeScore: true
        };
        
        this.fuse = new Fuse(this.events, options);
    }
    
    populateFilters() {
        // Populate event types
        const types = new Set();
        this.events.forEach(event => {
            event.event_types.forEach(type => types.add(type));
        });
        
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            this.typeFilter.appendChild(option);
        });
        
        // Populate distances
        const distances = new Set();
        this.events.forEach(event => {
            event.event_distances.forEach(distance => distances.add(distance));
        });
        
        [...distances].sort().forEach(distance => {
            const option = document.createElement('option');
            option.value = distance;
            option.textContent = distance;
            this.distanceFilter.appendChild(option);
        });
        
        // Populate locations
        const locations = new Set();
        this.events.forEach(event => {
            if (event.event_location) {
                // Extract city/region from location
                const location = event.event_location.split(',')[0].trim();
                locations.add(location);
            }
        });
        
        [...locations].sort().forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            this.locationFilter.appendChild(option);
        });
    }
    
    filterEvents() {
        let filtered = this.events;
        
        // Search filter
        const searchTerm = this.searchInput.value.trim();
        if (searchTerm) {
            const results = this.fuse.search(searchTerm);
            filtered = results.map(result => result.item);
        }
        
        // Type filter
        const selectedType = this.typeFilter.value;
        if (selectedType) {
            filtered = filtered.filter(event => 
                event.event_types.some(type => 
                    type.toLowerCase().includes(selectedType.toLowerCase())
                )
            );
        }
        
        // Distance filter
        const selectedDistance = this.distanceFilter.value;
        if (selectedDistance) {
            filtered = filtered.filter(event => 
                event.event_distances.includes(selectedDistance)
            );
        }
        
        // Location filter
        const selectedLocation = this.locationFilter.value;
        if (selectedLocation) {
            filtered = filtered.filter(event => 
                event.event_location && 
                event.event_location.toLowerCase().includes(selectedLocation.toLowerCase())
            );
        }
        
        // Sort
        const sortBy = this.sortBy.value;
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.event_name.localeCompare(b.event_name);
                case 'location':
                    return (a.event_location || '').localeCompare(b.event_location || '');
                case 'date':
                default:
                    const dateA = new Date(a.event_start_date || '2099-12-31');
                    const dateB = new Date(b.event_start_date || '2099-12-31');
                    return dateA - dateB;
            }
        });
        
        this.filteredEvents = filtered;
        this.updateResults();
    }
    
    updateResults() {
        this.loading.style.display = 'none';
        this.resultsCount.textContent = `${this.filteredEvents.length} event${this.filteredEvents.length !== 1 ? 's' : ''} found`;
        
        if (this.filteredEvents.length === 0) {
            this.eventsContainer.style.display = 'none';
            this.noResults.style.display = 'block';
        } else {
            this.eventsContainer.style.display = this.currentView === 'grid' ? 'grid' : 'flex';
            this.noResults.style.display = 'none';
            this.renderEvents();
        }
    }
    
    renderEvents() {
        this.eventsContainer.innerHTML = '';
        
        this.filteredEvents.forEach(event => {
            const eventCard = this.createEventCard(event);
            this.eventsContainer.appendChild(eventCard);
        });
    }
    
    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        
        // Format date
        const formatDate = (dateStr) => {
            if (!dateStr) return 'Date TBD';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        };
        
        // Get image path - handle both URL and local paths
        const getImageSrc = (imagePath) => {
            if (!imagePath) return '';
            if (imagePath.startsWith('http')) return imagePath;
            return `../${imagePath}`; // Relative to site directory
        };
        
        card.innerHTML = `
            ${event.event_images && event.event_images[0] ? 
                `<img src="${getImageSrc(event.event_images[0])}" alt="${event.event_name}" class="event-image" onerror="this.style.display='none'">` : 
                '<div class="event-image"></div>'
            }
            <div class="event-content">
                <h3 class="event-title">${event.event_name}</h3>
                ${event.description_short ? 
                    `<p class="event-short-desc">${event.description_short}</p>` : ''
                }
                
                <div class="event-details">
                    ${event.event_location ? 
                        `<div class="event-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.event_location}</span>
                        </div>` : ''
                    }
                    ${event.event_start_date ? 
                        `<div class="event-detail">
                            <i class="fas fa-calendar"></i>
                            <span>${formatDate(event.event_start_date)}${event.event_end_date && event.event_end_date !== event.event_start_date ? ` - ${formatDate(event.event_end_date)}` : ''}</span>
                        </div>` : ''
                    }
                    ${event.event_coordinates ? 
                        `<div class="event-detail">
                            <i class="fas fa-globe"></i>
                            <span>${event.event_coordinates.lat.toFixed(4)}, ${event.event_coordinates.lon.toFixed(4)}</span>
                        </div>` : ''
                    }
                </div>
                
                ${event.event_types && event.event_types.length > 0 ? 
                    `<div class="event-types">
                        ${event.event_types.map(type => 
                            `<span class="event-type">${type}</span>`
                        ).join('')}
                    </div>` : ''
                }
                
                ${event.event_distances && event.event_distances.length > 0 ? 
                    `<div class="event-distances">
                        ${event.event_distances.map(distance => 
                            `<span class="event-distance">${distance}</span>`
                        ).join('')}
                    </div>` : ''
                }
            </div>
        `;
        
        return card;
    }
    
    setView(view) {
        this.currentView = view;
        
        if (view === 'grid') {
            this.eventsContainer.className = 'events-grid';
            this.gridView.classList.add('active');
            this.listView.classList.remove('active');
        } else {
            this.eventsContainer.className = 'events-list';
            this.listView.classList.add('active');
            this.gridView.classList.remove('active');
        }
        
        this.renderEvents();
    }
    
    clearAllFilters() {
        this.searchInput.value = '';
        this.typeFilter.value = '';
        this.distanceFilter.value = '';
        this.locationFilter.value = '';
        this.sortBy.value = 'date';
        this.filterEvents();
    }
    
    showError(message) {
        this.loading.style.display = 'none';
        this.eventsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EventsApp();
});
let map;
let marker;
let geocoder;
let autocomplete;
let events = [];

// Initialize Google Maps and other components
function initMap() {
    geocoder = new google.maps.Geocoder();

    // Default center (you can change this)
    const defaultCenter = { lat: 40.7128, lng: -74.0060 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: defaultCenter,
        styles: [
            {
                featureType: "all",
                elementType: "geometry",
                stylers: [{ color: "#f5f7fa" }]
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#e3e8ef" }]
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#ffffff" }]
            }
        ]
    });

    // Add click listener to map
    map.addListener("click", (event) => {
        placeMarker(event.latLng);
    });

    // Initialize the autocomplete search box
    autocomplete = new google.maps.places.Autocomplete(
        document.getElementById("location-search"),
        { types: ["geocode"] }
    );

    // When a place is selected from autocomplete
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            showToast("No location details available for this place.", "error");
            return;
        }

        // Set the map view to the selected place
        map.setCenter(place.geometry.location);
        placeMarker(place.geometry.location);
    });

    // Initialize current location button
    document.getElementById("current-location").addEventListener("click", getCurrentLocation);

    // Initialize navigation links
    document.getElementById("register-link").addEventListener("click", (e) => {
        e.preventDefault();
        showRegisterSection();
    });

    document.getElementById("events-link").addEventListener("click", (e) => {
        e.preventDefault();
        showEventsSection();
    });

    // Initialize search and sort for events
    document.getElementById("event-search").addEventListener("input", filterEvents);
    document.getElementById("event-sort").addEventListener("change", filterEvents);
}

// Get current location using browser's Geolocation API
function getCurrentLocation() {
    if (navigator.geolocation) {
        document.getElementById("current-location").disabled = true;
        document.getElementById("current-location").innerHTML = "<span>Loading...</span>";

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                map.setCenter(pos);
                placeMarker(pos);
                document.getElementById("current-location").disabled = false;
                document.getElementById("current-location").innerHTML = "<span>My Location</span>";
            },
            (error) => {
                showToast("Error getting your location: " + error.message, "error");
                document.getElementById("current-location").disabled = false;
                document.getElementById("current-location").innerHTML = "<span>My Location</span>";
            }
        );
    } else {
        showToast("Geolocation is not supported by your browser", "error");
    }
}

// Place or move marker and get address
function placeMarker(location) {
    if (marker) {
        marker.setPosition(location);
    } else {
        marker = new google.maps.Marker({
            position: location,
            map: map,
            animation: google.maps.Animation.DROP
        });
    }

    // Update hidden inputs with coordinates
    document.getElementById("lat").value = location.lat();
    document.getElementById("lng").value = location.lng();

    // Get address for the location
    geocoder.geocode({ location: location }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                document.getElementById("locationAddress").value = results[0].formatted_address;
            }
        }
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow to enable transition
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show the registration section
function showRegisterSection() {
    document.getElementById("register-section").style.display = "block";
    document.getElementById("events-section").style.display = "none";
    document.getElementById("register-link").classList.add("active");
    document.getElementById("events-link").classList.remove("active");

    // Trigger map resize to prevent display issues
    if (map) {
        google.maps.event.trigger(map, 'resize');
    }
}

// Show the events listing section and load events
function showEventsSection() {
    document.getElementById("register-section").style.display = "none";
    document.getElementById("events-section").style.display = "block";
    document.getElementById("register-link").classList.remove("active");
    document.getElementById("events-link").classList.add("active");

    // Load events
    loadEvents();
}

// Fetch all events from the server
async function loadEvents() {
    try {
        const response = await fetch('/api/events');
        const data = await response.json();

        if (data.success) {
            events = data.events;
            filterEvents();
        } else {
            document.getElementById("events-list").innerHTML = `
                <div class="no-events">Error loading events. Please try again.</div>
            `;
        }
    } catch (error) {
        document.getElementById("events-list").innerHTML = `
            <div class="no-events">Error loading events. Please try again.</div>
        `;
        console.error('Error:', error);
    }
}

// Filter and sort events based on user input
function filterEvents() {
    const searchTerm = document.getElementById("event-search").value.toLowerCase();
    const sortOption = document.getElementById("event-sort").value;

    // Filter events
    let filteredEvents = events.filter(event =>
        event.eventName.toLowerCase().includes(searchTerm) ||
        event.organizerName.toLowerCase().includes(searchTerm) ||
        event.location.address.toLowerCase().includes(searchTerm)
    );

    // Sort events
    switch (sortOption) {
        case "date-asc":
            filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case "date-desc":
            filteredEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case "name-asc":
            filteredEvents.sort((a, b) => a.eventName.localeCompare(b.eventName));
            break;
        case "name-desc":
            filteredEvents.sort((a, b) => b.eventName.localeCompare(a.eventName));
            break;
    }

    // Display events
    if (filteredEvents.length === 0) {
        document.getElementById("events-list").innerHTML = `
            <div class="no-events">No events found matching your criteria.</div>
        `;
    } else {
        const eventsHTML = filteredEvents.map(event => {
            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="event-card">
                    <div class="event-map" id="map-${event._id}"></div>
                    <div class="event-details">
                        <div class="event-date">${formattedDate}</div>
                        <h3 class="event-title">${event.eventName}</h3>
                        <div class="event-organizer">Organized by: ${event.organizerName}</div>
                        <div class="event-location">${event.location.address}</div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById("events-list").innerHTML = eventsHTML;

        // Initialize maps for each event card
        filteredEvents.forEach(event => {
            const eventMap = new google.maps.Map(document.getElementById(`map-${event._id}`), {
                zoom: 13,
                center: { lat: event.location.lat, lng: event.location.lng },
                disableDefaultUI: true,
                zoomControl: false,
                scrollwheel: false
            });

            new google.maps.Marker({
                position: { lat: event.location.lat, lng: event.location.lng },
                map: eventMap
            });
        });
    }
}

// Initialize map when page loads
window.onload = initMap;

// Handle form submission
document.getElementById("eventForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Check if location is set
    if (!document.getElementById("lat").value || !document.getElementById("lng").value) {
        showToast("Please select a location on the map", "error");
        return;
    }

    const formData = {
        eventName: document.getElementById("eventName").value,
        organizerName: document.getElementById("organizerName").value,
        date: document.getElementById("date").value,
        location: {
            lat: parseFloat(document.getElementById("lat").value),
            lng: parseFloat(document.getElementById("lng").value),
            address: document.getElementById("locationAddress").value
        }
    };

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showToast('Event registered successfully!', 'success');
            e.target.reset();
            if (marker) {
                marker.setMap(null);
                marker = null;
            }
            document.getElementById("locationAddress").value = "";

            // Optionally switch to events view
            showEventsSection();
        } else {
            showToast('Error registering event: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Error registering event. Please try again.', 'error');
        console.error('Error:', error);
    }
});
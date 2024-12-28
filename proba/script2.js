// Global variables
let map;
let markers = [];
let droppedPhotos = [];

// Initialize when document is ready
$(document).ready(() => {
    initializeMap();
    setupEventListeners();
    setupDragAndDrop();
    loadDays();
});

// Initialize Map
function initializeMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Setup Event Listeners
function setupEventListeners() {
    $('#newDayBtn').click(() => {
        droppedPhotos = [];
        $('#dateInput').val(new Date().toISOString().split('T')[0]);
        $('#locationInput').val('');
        $('#notesInput').val('');
        $('#photoPreview').empty();
        $('#dayModal').modal('show');
    });

    $('#getCurrentLocation').click(getCurrentLocation);
    $('#saveDay').click(saveNewDay);
}

// Setup Drag and Drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFileSelect(e) {
    handleFiles(e.target.files);
}

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoData = e.target.result;
                droppedPhotos.push(photoData);
                displayPhotoPreview(photoData);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Save New Day
function saveNewDay() {
    const date = $('#dateInput').val();
    const location = $('#locationInput').val();
    const notes = $('#notesInput').val();
    
    if (!date || !location || !notes) {
        alert('Please fill in all required fields');
        return;
    }

    const dayData = {
        id: Date.now(),
        date,
        locations: [{
            name: location,
            notes,
            photos: droppedPhotos
        }]
    };

    const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
    days.push(dayData);
    localStorage.setItem('travelDays', JSON.stringify(days));
    
    $('#dayModal').modal('hide');
    loadDays();
}

// Add Location to Existing Day
function addLocationToDay(dayId) {
    droppedPhotos = [];
    $('#locationInput').val('');
    $('#notesInput').val('');
    $('#photoPreview').empty();
    
    const saveHandler = () => {
        const location = $('#locationInput').val();
        const notes = $('#notesInput').val();
        
        if (!location || !notes) {
            alert('Please fill in all required fields');
            return;
        }

        const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
        const dayIndex = days.findIndex(day => day.id === dayId);
        
        if (dayIndex > -1) {
            days[dayIndex].locations.push({
                name: location,
                notes,
                photos: droppedPhotos
            });
            localStorage.setItem('travelDays', JSON.stringify(days));
            $('#dayModal').modal('hide');
            $('#saveDay').off('click', saveHandler);
            $('#saveDay').click(saveNewDay);
            loadDays();
        }
    };

    $('#saveDay').off('click', saveNewDay);
    $('#saveDay').click(saveHandler);
    $('#dayModal').modal('show');
}

// Load and Display Days
function loadDays() {
    const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
    const container = $('#daysContainer');
    container.empty();

    days.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(day => {
        const dayElement = createDayElement(day);
        container.append(dayElement);
    });

    updateMap(days);
}

// Create Day Element with Locations
function createDayElement(day) {
    const dayDiv = $('<div>').addClass('accordion-item');
    
    const header = $('<div>')
        .addClass('accordion-header bg-light p-3 d-flex justify-content-between align-items-center cursor-pointer')
        .attr('data-bs-toggle', 'collapse')
        .attr('data-bs-target', `#day${day.id}`);
    
    header.append(
        $('<span>').text(new Date(day.date).toLocaleDateString()),
        $('<span>').addClass('expand-icon').html('&#708;')
    );

    const collapse = $('<div>')
        .addClass('collapse')
        .attr('id', `day${day.id}`);

    const body = $('<div>').addClass('p-3');
    const locationsList = $('<div>').addClass('locations-list');

    day.locations.forEach((location, index) => {
        const locationItem = createLocationItem(location, index === day.locations.length - 1);
        locationsList.append(locationItem);
    });

    // Add Location button
    const addLocationBtn = $('<button>')
        .addClass('btn btn-primary mt-3')
        .text('Add Location')
        .click((e) => {
            e.stopPropagation();
            addLocationToDay(day.id);
        });

    body.append(locationsList, addLocationBtn);
    collapse.append(body);
    dayDiv.append(header, collapse);

    return dayDiv;
}

// Create Location Item with Arrow
function createLocationItem(location, isLast) {
    const container = $('<div>').addClass('location-container');
    
    const item = $('<div>')
        .addClass('location-item p-3 mb-2')
        .click(() => showLocationDetails(location));

    const content = $('<div>').addClass('d-flex align-items-center');
    content.append(
        $('<span>').addClass('pin-icon me-2').html('📍'),
        $('<div>').addClass('d-flex flex-column').append(
            $('<span>').addClass('fw-bold').text(location.name),
            $('<span>').addClass('text-muted small').text(location.notes)
        )
    );

    item.append(content);
    container.append(item);

    if (!isLast) {
        container.append(
            $('<div>').addClass('text-center py-2').html('↓')
        );
    }

    return container;
}

// Show Location Details
function showLocationDetails(location) {
    const modal = $('#locationDetailsModal');
    
    $('#locationDetailsTitle').text(location.name);
    $('#locationDetailsNotes').text(location.notes);
    
    const photosContainer = $('#locationDetailsPhotos').empty();
    
    location.photos.forEach(photo => {
        const photoDiv = $('<div>').addClass('location-photo-container');
        const img = $('<img>')
            .addClass('location-photo')
            .attr('src', photo)
            .attr('alt', 'Location photo');
        photoDiv.append(img);
        photosContainer.append(photoDiv);
    });

    modal.modal('show');
}

// Update Map with Markers
function updateMap(days) {
    markers.forEach(marker => marker.remove());
    markers = [];

    days.forEach(day => {
        day.locations.forEach(async location => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.name)}&format=json`
                );
                const data = await response.json();
                
                if (data.length > 0) {
                    const marker = L.marker([data[0].lat, data[0].lon])
                        .bindPopup(location.name)
                        .addTo(map);
                    markers.push(marker);
                }
            } catch (error) {
                console.error('Error getting coordinates:', error);
            }
        });
    });

    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Get Current Location
function getCurrentLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async position => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
                );
                const data = await response.json();
                $('#locationInput').val(data.display_name.split(',')[0]);
            } catch (error) {
                console.error('Error getting location:', error);
                $('#locationInput').val(`${position.coords.latitude}, ${position.coords.longitude}`);
            }
        });
    } else {
        alert('Geolocation is not supported by your browser');
    }
}
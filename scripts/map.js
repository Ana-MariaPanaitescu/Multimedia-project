window.onload = function() {
    // Global variables
    let map;
    let markers = [];
    let droppedPhotos = [];

    // Initialize map with geolocation
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);

    function onLocationSuccess(position) {
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        
        // Initialize map
        map = L.map('travelMap').setView([lat, long], 17);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Multimedia'
        }).addTo(map);
        
        // Add initial marker
        L.marker([lat, long]).addTo(map);
        
        // Setup all other functionality
        setupEventListeners();
        setupDragAndDrop();
        loadDays();
    }

    function onLocationError(error) {
        console.log(error);
        // Initialize map with default view if geolocation fails
        map = L.map('travelMap').setView([0, 0], 2);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Multimedia'
        }).addTo(map);
        
        // Setup all other functionality
        setupEventListeners();
        setupDragAndDrop();
        loadDays();
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // New Day button
        const newDayBtn = document.querySelector('.btn-primary');
        newDayBtn.addEventListener('click', () => {
            droppedPhotos = [];
            document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
            document.getElementById('locationInput').value = '';
            document.getElementById('notesInput').value = '';
            document.getElementById('photoPreview').innerHTML = '';
            
            // Show modal using Bootstrap
            const modal = new bootstrap.Modal(document.getElementById('staticBackdrop'));
            modal.show();
        });

        // Get Current Location button
        document.getElementById('getCurrentLocation').addEventListener('click', getCurrentLocation);
        
        // Save button
        document.getElementById('saveDay').addEventListener('click', saveNewDay);
    }

    // Setup Drag and Drop
    function setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

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

    function displayPhotoPreview(photoData) {
        const preview = document.getElementById('photoPreview');
        const img = document.createElement('img');
        img.src = photoData;
        img.classList.add('preview-image');
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.margin = '5px';
        preview.appendChild(img);
    }

    // Save New Day
    function saveNewDay() {
        const date = document.getElementById('dateInput').value;
        const location = document.getElementById('locationInput').value;
        const notes = document.getElementById('notesInput').value;
        
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
        
        // Hide modal using Bootstrap
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        modal.hide();
        
        loadDays();
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
                    document.getElementById('locationInput').value = data.display_name.split(',')[0];
                } catch (error) {
                    console.error('Error getting location:', error);
                    document.getElementById('locationInput').value = 
                        `${position.coords.latitude}, ${position.coords.longitude}`;
                }
            });
        } else {
            alert('Geolocation is not supported by your browser');
        }
    }

    // Load and Display Days
    function loadDays() {
        const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
        const container = document.getElementById('daysContainer');
        container.innerHTML = '';

        days.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(day => {
            const dayElement = createDayElement(day);
            container.appendChild(dayElement);
        });

        updateMap(days);
    }

    // Create Day Element
    function createDayElement(day) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'accordion-item';
        
        dayDiv.innerHTML = `
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                        data-bs-target="#day${day.id}">
                    ${new Date(day.date).toLocaleDateString()}
                </button>
            </h2>
            <div id="day${day.id}" class="accordion-collapse collapse">
                <div class="accordion-body">
                    ${day.locations.map(location => createLocationHTML(location)).join('')}
                </div>
            </div>
        `;
        
        return dayDiv;
    }

    // Create Location HTML
    function createLocationHTML(location) {
        return `
            <div class="location-item mb-3" onclick="showLocationDetails('${location.name}', '${location.notes}')">
                <div class="d-flex align-items-center">
                    <span class="me-2">📍</span>
                    <div>
                        <div class="fw-bold">${location.name}</div>
                        <div class="text-muted small">${location.notes}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Update Map
    function updateMap(days) {
        // Clear existing markers
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

    // Make showLocationDetails available globally
    window.showLocationDetails = function(name, notes) {
        const modal = new bootstrap.Modal(document.getElementById('locationDetailsModal'));
        document.getElementById('locationDetailsTitle').textContent = name;
        document.getElementById('locationDetailsNotes').textContent = notes;
        modal.show();
    };
}
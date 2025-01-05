window.onload = function() {
    
    // Global variables
    let map;
    let markers = [];
    let droppedPhotos = [];

    // New canvas-related variables
    let photoCanvas;
    let photoCtx;
    const PHOTO_SIZE = 100;
    const PHOTO_PADDING = 10;
    let currentPhotoX = PHOTO_PADDING;
    let currentPhotoY = PHOTO_PADDING;

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

    // Set up Canvas
    function setupCanvas() {
        photoCanvas = document.createElement('canvas');
        photoCanvas.width = 600;
        photoCanvas.height = 400;
        photoCanvas.style.border = '1px solid #ccc';
        photoCanvas.style.marginTop = '10px';
        
        // Replace the photoPreview div with our canvas
        const photoPreview = document.getElementById('photoPreview');
        photoPreview.innerHTML = '';
        photoPreview.appendChild(photoCanvas);
        
        photoCtx = photoCanvas.getContext('2d');
        photoCtx.fillStyle = '#f8f9fa';
        photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
    }

    // Drag and Drop
    function setupDragAndDrop() {
        setupCanvas(); // Add canvas setup first
        
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

        photoCanvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoCanvas.style.border = '2px dashed #007bff';
        });

        photoCanvas.addEventListener('dragleave', () => {
            photoCanvas.style.border = '1px solid #ccc';
        });

        photoCanvas.addEventListener('drop', (e) => {
            e.preventDefault();
            photoCanvas.style.border = '1px solid #ccc';
            handleFiles(e.dataTransfer.files);
        });
    }

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        // Calculate scaled dimensions
                        let scale = Math.min(PHOTO_SIZE / img.width, PHOTO_SIZE / img.height);
                        let width = img.width * scale;
                        let height = img.height * scale;
                        
                        // Check if we need to move to next row
                        if (currentPhotoX + width + PHOTO_PADDING > photoCanvas.width) {
                            currentPhotoX = PHOTO_PADDING;
                            currentPhotoY += PHOTO_SIZE + PHOTO_PADDING;
                        }
                        
                        // Draw image on canvas
                        photoCtx.drawImage(img, currentPhotoX, currentPhotoY, width, height);
                        
                        // Store photo data
                        droppedPhotos.push({
                            data: e.target.result,
                            x: currentPhotoX,
                            y: currentPhotoY,
                            width: width,
                            height: height
                        });
                        
                        // Update position for next photo
                        currentPhotoX += width + PHOTO_PADDING;
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Modified saveNewDay to handle unique dates
    function saveNewDay() {
        const date = document.getElementById('dateInput').value;
        const location = document.getElementById('locationInput').value;
        const notes = document.getElementById('notesInput').value;
        
        if (!date || !location || !notes) {
            alert('Please fill in all required fields');
            return;
        }

        const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
        
        // Check if date already exists
        const existingDayIndex = days.findIndex(day => day.date === date);
        
        if (existingDayIndex >= 0) {
            // Add location to existing date
            days[existingDayIndex].locations.push({
                name: location,
                notes,
                photos: droppedPhotos
            });
        } else {
            // Create new day
            days.push({
                id: Date.now(),
                date,
                locations: [{
                    name: location,
                    notes,
                    photos: droppedPhotos
                }]
            });
        }

        localStorage.setItem('travelDays', JSON.stringify(days));
        
        // Reset canvas
        photoCtx.fillStyle = '#f8f9fa';
        photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
        currentPhotoX = PHOTO_PADDING;
        currentPhotoY = PHOTO_PADDING;
        droppedPhotos = [];
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        modal.hide();
        
        loadDays();
    }

     // Modified createLocationHTML to show arrows between locations
     function createLocationHTML(location, isLast) {
        return `
            <div class="location-container">
                <div class="location-item mb-2 d-flex align-items-center" 
                     onclick="showLocationDetails('${location.name}', '${location.notes}')">
                    <span class="me-2">📍</span>
                    <div>
                        <div class="fw-bold">${location.name}</div>
                        <div class="text-muted small">${location.notes}</div>
                    </div>
                </div>
                ${!isLast ? '<div class="text-center mb-2">↓</div>' : ''}
            </div>
        `;
    }

    // Modified createDayElement to handle location arrows
    function createDayElement(day) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'accordion-item';
        
        const locationsHTML = day.locations.map((location, index) => 
            createLocationHTML(location, index === day.locations.length - 1)
        ).join('');
        
        dayDiv.innerHTML = `
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" 
                        data-bs-target="#day${day.id}">
                    Day ${day.date}
                </button>
            </h2>
            <div id="day${day.id}" class="accordion-collapse collapse">
                <div class="accordion-body">
                    ${locationsHTML}
                </div>
            </div>
        `;
        
        return dayDiv;
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
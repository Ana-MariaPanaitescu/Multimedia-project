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
        
        map = L.map('travelMap').setView([lat, long], 17);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Multimedia'
        }).addTo(map);
        
        L.marker([lat, long]).addTo(map);
        
        setupEventListeners();
        setupDragAndDrop();
        loadDays();
    }

    function onLocationError(error) {
        console.log(error);
        map = L.map('travelMap').setView([0, 0], 2);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Multimedia'
        }).addTo(map);
        
        setupEventListeners();
        setupDragAndDrop();
        loadDays();
    }

     // Set up Canvas for photo display
     function setupCanvas() {
        photoCanvas = document.createElement('canvas');
        photoCanvas.width = 465;
        photoCanvas.height = 400;

        photoCanvas.style.border = '1px solid #ccc';
        photoCanvas.style.marginTop = '10px';
        
        const photoPreview = document.getElementById('photoPreview');
        photoPreview.innerHTML = '';
        photoPreview.appendChild(photoCanvas);
        
        photoCtx = photoCanvas.getContext('2d');
        photoCtx.fillStyle = '#f8f9fa';
        photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);

        // Add drag and drop events to canvas
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

    // Setup drag and drop functionality
    function setupDragAndDrop() {
        setupCanvas();
        
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
                    ${new Date(day.date).toLocaleDateString()}
                </button>
            </h2>
            <div id="day${day.id}" class="accordion-collapse collapse">
                <div class="accordion-body">
                    ${locationsHTML}
                    <button class="btn btn-primary mt-3" onclick="addLocationToDay(${day.id})">
                        Add New Location
                    </button>
                </div>
            </div>
        `;
        
        return dayDiv;
    }

    function createLocationHTML(location, isLast) {
        // Escape the location data to prevent JSON parsing errors
        const safeLocation = JSON.stringify({
            name: location.name,
            notes: location.notes,
            photos: location.photos || []
        }).replace(/'/g, "\\'");
    
        // Add photo preview thumbnails
        const photoThumbnails = location.photos && location.photos.length > 0 
            ? `<div class="photo-thumbnails d-flex flex-wrap gap-2 mt-2">
                ${location.photos.map(photo => `
                    <img src="${photo.data}" 
                         alt="Location photo" 
                         class="thumbnail-img"
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
                    >
                `).join('')}
               </div>`
            : '';
    
        return `
            <div class="location-container">
                <div class="location-item mb-2" 
                     onclick='showLocationDetails(${safeLocation})'>
                    <div class="d-flex align-items-center">
                        <span class="me-2">📍</span>
                        <div>
                            <div class="fw-bold">${location.name}</div>
                            <div class="text-muted small">${location.notes}</div>
                        </div>
                    </div>
                    ${photoThumbnails}
                </div>
                ${!isLast ? '<div class="text-center mb-2">↓</div>' : ''}
            </div>
        `;
    }

    // Add location to existing day
    window.addLocationToDay = function(dayId) {
        droppedPhotos = [];
        document.getElementById('dateInput').value = '';
        document.getElementById('locationInput').value = '';
        document.getElementById('notesInput').value = '';
        
        // Reset canvas
        setupCanvas();
        
        const modal = new bootstrap.Modal(document.getElementById('staticBackdrop'));
        modal.show();

        // Remove existing click handler and add new one for saving location
        const saveButton = document.getElementById('saveDay');
        saveButton.onclick = () => saveNewLocation(dayId);
    };

    function resetForm() {
        // Reset canvas
        photoCtx.fillStyle = '#f8f9fa';
        photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
        currentPhotoX = PHOTO_PADDING;
        currentPhotoY = PHOTO_PADDING;
        droppedPhotos = [];
        
        // Reset form inputs
        document.getElementById('dateInput').value = '';
        document.getElementById('locationInput').value = '';
        document.getElementById('notesInput').value = '';
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
        
        // Process photos before saving
        const processedPhotos = droppedPhotos.map(photo => ({
            data: photo.data,
            x: photo.x,
            y: photo.y,
            width: photo.width,
            height: photo.height
        }));
        
        // Check if date already exists
        const existingDayIndex = days.findIndex(day => day.date === date);
        
        if (existingDayIndex >= 0) {
            // Add location to existing date
            days[existingDayIndex].locations.push({
                name: location,
                notes,
                photos: processedPhotos
            });
        } else {
            // Create new day
            days.push({
                id: Date.now(),
                date,
                locations: [{
                    name: location,
                    notes,
                    photos: processedPhotos
                }]
            });
        }
    
        localStorage.setItem('travelDays', JSON.stringify(days));
        
        // Reset form and canvas
        resetForm();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        modal.hide();
        
        loadDays();
    }

    function saveNewLocation(dayId) {
        const location = document.getElementById('locationInput').value;
        const notes = document.getElementById('notesInput').value;
        
        if (!location || !notes) {
            alert('Please fill in all required fields');
            return;
        }

        const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
        const dayIndex = days.findIndex(day => day.id === dayId);
        
        if (dayIndex > -1) {
            // Process photos before saving
            const processedPhotos = droppedPhotos.map(photo => ({
                data: photo.data,
                x: photo.x,
                y: photo.y,
                width: photo.width,
                height: photo.height
            }));
            
            days[dayIndex].locations.push({
                name: location,
                notes,
                photos: processedPhotos
            });
            
            localStorage.setItem('travelDays', JSON.stringify(days));
            
            // Reset form and canvas
            resetForm();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
            modal.hide();
            
            // Reset save button to original handler
            document.getElementById('saveDay').onclick = saveNewDay;
            
            loadDays();
        }
    }

    // Setup Event Listeners
    function setupEventListeners() {
        const newDayBtn = document.querySelector('.btn-primary');
        newDayBtn.addEventListener('click', () => {
            droppedPhotos = [];
            document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
            document.getElementById('locationInput').value = '';
            document.getElementById('notesInput').value = '';
            setupCanvas();
            
            const modal = new bootstrap.Modal(document.getElementById('staticBackdrop'));
            modal.show();
        });

        document.getElementById('getCurrentLocation').addEventListener('click', getCurrentLocation);
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

     // Update showLocationDetails to handle photos
     window.showLocationDetails = function(location) {
        const modal = new bootstrap.Modal(document.getElementById('locationDetailsModal'));
        document.getElementById('locationDetailsTitle').textContent = location.name;
        document.getElementById('locationDetailsNotes').textContent = location.notes;
        
        const photosContainer = document.getElementById('locationDetailsPhotos');
        photosContainer.innerHTML = '';
        
        // Handle photos in grid view
        if (location.photos && location.photos.length > 0) {
            location.photos.forEach(photo => {
                const img = document.createElement('img');
                img.src = photo.data;
                img.style.maxWidth = '200px';
                img.style.maxHeight = '200px';
                img.className = 'me-2 mb-2';
                photosContainer.appendChild(img);
            });
            
            // Handle photos in canvas view
            const canvas = document.getElementById('locationCanvas');
            const ctx = canvas.getContext('2d');
            
            // Clear canvas
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            let currentX = 10;
            let currentY = 10;
            const maxHeight = 100;
            
            location.photos.forEach(photo => {
                const img = new Image();
                img.onload = () => {
                    // Calculate scaled dimensions
                    const scale = maxHeight / img.height;
                    const width = img.width * scale;
                    const height = maxHeight;
                    
                    // Move to next row if needed
                    if (currentX + width + 10 > canvas.width) {
                        currentX = 10;
                        currentY += maxHeight + 10;
                    }
                    
                    // Draw image
                    ctx.drawImage(img, currentX, currentY, width, height);
                    currentX += width + 10;
                };
                img.src = photo.data;
            });
        } else {
            // Show a message if no photos
            photosContainer.innerHTML = '<p>No photos available for this location.</p>';
            
            // Clear canvas
            const canvas = document.getElementById('locationCanvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No photos available', canvas.width/2, canvas.height/2);
        }
        
        modal.show();
    };
}
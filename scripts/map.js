window.onload = function() {

    // to clear localStorage when page loads
    localStorage.removeItem('travelDays');
    
    //  here we have global variables to manage map and photo data
    let map;
    let markers = [];
    let droppedPhotos = [];

    // canvas-related variables for photo display
    let photoCanvas;
    let photoCtx;
    const PHOTO_SIZE = 100;
    const PHOTO_PADDING = 10;
    let currentPhotoX = PHOTO_PADDING;
    let currentPhotoY = PHOTO_PADDING;

    //custom marker icon "pin with the balloon" for the current location of the user
    const customIcon = L.icon({
        iconUrl: 'images/balloon2.png',
        iconSize: [50, 50],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    //initialize map with geolocation
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);

    //event listeners and drag-and-drop functionality
    setupEventListeners();
    setupDragAndDrop();
    loadDays();

    function onLocationSuccess(position) {
        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        
        map = L.map('travelMap').setView([lat, long], 17);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
	        attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
	        maxZoom: 16
        }).addTo(map);
        
        //the custom icon for current location with the balloon
        const customMarker = L.marker([lat, long], { icon: customIcon }).addTo(map);
        customMarker.bindPopup('Current location with the balloon!');
        
       
    }

    function onLocationError(error) {
        console.log(error);
        map = L.map('travelMap').setView([0, 0], 2);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
	        attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
	        maxZoom: 16
        }).addTo(map);
        
        
    }

     //the set up for the canvas for photo display
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

        //drag and drop events
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

    // the drag and drop functionality
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

    //function to handle the files dropped and then draw them on the canvas
    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        // here we calculated the scaled dimensions
                        let scale = Math.min(PHOTO_SIZE / img.width, PHOTO_SIZE / img.height);
                        let width = img.width * scale;
                        let height = img.height * scale;
                        
                        //if there are many pictures to move to the next row
                        if (currentPhotoX + width + PHOTO_PADDING > photoCanvas.width) {
                            currentPhotoX = PHOTO_PADDING;
                            currentPhotoY += PHOTO_SIZE + PHOTO_PADDING;
                        }
                        
                        //draw theimage on canvas
                        photoCtx.drawImage(img, currentPhotoX, currentPhotoY, width, height);
                        
                        //save the photo data
                        droppedPhotos.push({
                            data: e.target.result,
                            x: currentPhotoX,
                            y: currentPhotoY,
                            width: width,
                            height: height
                        });
                        
                        //update position for next photo
                        currentPhotoX += width + PHOTO_PADDING;
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    //here we create day details with locations and then display the details
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
        const safeLocation = JSON.stringify({
            name: location.name,
            notes: location.notes,
            photos: location.photos || []
        }).replace(/'/g, "\\'");
    
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

    // here we add a new location to an existing day
    window.addLocationToDay = function(dayId) {
        droppedPhotos = [];
        document.getElementById('dateInput').value = '';
        document.getElementById('locationInput').value = '';
        document.getElementById('notesInput').value = '';
        
        // reset canvas for the new input
        setupCanvas();
        
        const modal = new bootstrap.Modal(document.getElementById('staticBackdrop'));
        modal.show();
        const saveButton = document.getElementById('saveDay');
        saveButton.onclick = () => saveNewLocation(dayId);
    };

    //here the form and canvas reset after we save the details
    function resetForm() {
        photoCtx.fillStyle = '#f8f9fa';
        photoCtx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
        currentPhotoX = PHOTO_PADDING;
        currentPhotoY = PHOTO_PADDING;
        droppedPhotos = [];
        document.getElementById('dateInput').value = '';
        document.getElementById('locationInput').value = '';
        document.getElementById('notesInput').value = '';
    }

    //function to save new day data, including locations and photos
    function saveNewDay() {
        const date = document.getElementById('dateInput').value;
        const location = document.getElementById('locationInput').value;
        const notes = document.getElementById('notesInput').value;
        
        const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
        
        const processedPhotos = droppedPhotos.map(photo => ({
            data: photo.data,
            x: photo.x,
            y: photo.y,
            width: photo.width,
            height: photo.height
        }));
        
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
        resetForm();//reset the form and canvas after saving
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('staticBackdrop'));
        modal.hide();
        
        loadDays();
    }

    function saveNewLocation(dayId) {
        const location = document.getElementById('locationInput').value;
        const notes = document.getElementById('notesInput').value;
        
        const days = JSON.parse(localStorage.getItem('travelDays') || '[]');
        const dayIndex = days.findIndex(day => day.id === dayId);
        
        if (dayIndex > -1) {
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
            
            document.getElementById('saveDay').onclick = saveNewDay;
            
            loadDays();
        }
    }

    //setup Event Listeners
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
        const saveButton = document.getElementById('saveDay');
        saveButton.onclick = saveNewDay;
    }

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

    //load and display saved days from localStorage
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

    
    //update the map with new location markers based on saved data
    function updateMap(days) {
        //clear existing markers
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
                        const marker = L.marker([data[0].lat, data[0].lon], { icon: customIcon })
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

     // Update showLocationDetails 
     window.showLocationDetails = function(location) {
        const modal = new bootstrap.Modal(document.getElementById('locationDetailsModal'));
        document.getElementById('locationDetailsTitle').textContent = location.name;
        document.getElementById('locationDetailsNotes').textContent = location.notes;
        
        const photosContainer = document.getElementById('locationDetailsPhotos');
        photosContainer.innerHTML = '';
        
        const canvas = document.getElementById('locationCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (location.photos && location.photos.length > 0) {
            let currentX = 10;
            let currentY = 10;
            const maxHeight = 100;
            let loadedImages = 0;
            
            location.photos.forEach(photo => {
                const img = new Image();
                img.onload = () => {
                    //here we calculated the scale dimensions
                    const scale = maxHeight / img.height;
                    const width = img.width * scale;
                    const height = maxHeight;
                    
                    if (currentX + width + 10 > canvas.width) {
                        currentX = 10;
                        currentY += maxHeight + 10;
                    }
                    
                    ctx.drawImage(img, currentX, currentY, width, height);
                    currentX += width + 10;
                    
                    loadedImages++;
                    
                    if (loadedImages === location.photos.length) {
                        canvas.style.display = 'block';
                    }
                };
                img.src = photo.data;
            });
        } else {
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No photos available', canvas.width/2, canvas.height/2);
        }
        
        modal.show();
    };
}
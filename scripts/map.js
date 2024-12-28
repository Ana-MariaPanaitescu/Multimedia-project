window.onload = function () {
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError)

    function onLocationSuccess(position) {
        console.log(position.coords.accuracy);
        console.log(position);

        let lat = position.coords.latitude;
        let long = position.coords.longitude;
        let accuracy = position.coords.accuracy;

        let map = L.map('travelMap').setView([lat, long], 17);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: 'Multimedia'
        }).addTo(map);

        L.marker([lat, long]).addTo(map);
    }

    function onLocationError(error) {
        console.log(error);
    }
}
let map;
let markers = [];
let markerObjects = [];

ymaps.ready(init);

function init() {
    map = new ymaps.Map("map", {
        center: [55.76, 37.64],
        zoom: 10
    });

    loadMarkers();
    renderSets();

    map.events.add('click', function (e) {
        addMarker(e.get('coords'));
    });

    document.getElementById('saveBtn').addEventListener('click', saveSet);

    // ------------------- Кастомный ресайз -------------------
    const mapContainer = document.getElementById('map-container');
    const resizers = document.querySelectorAll('.resizer');
    let currentResizer;
    let startX, startY, startWidth, startHeight;

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', function(e) {
            currentResizer = resizer;
            startX = e.clientX;
            startY = e.clientY;
            const rect = mapContainer.getBoundingClientRect();
            startWidth = rect.width;
            startHeight = rect.height;
            document.addEventListener('mousemove', resizeMouse);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        });
    });

    function resizeMouse(e) {
        if (!currentResizer) return;
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;

        if (currentResizer.classList.contains('right')) {
            mapContainer.style.width = startWidth + dx + 'px';
        }
        if (currentResizer.classList.contains('left')) {
            mapContainer.style.width = startWidth - dx + 'px';
        }
        if (currentResizer.classList.contains('bottom')) {
            mapContainer.style.height = startHeight + dy + 'px';
        }
        if (currentResizer.classList.contains('top')) {
            mapContainer.style.height = startHeight - dy + 'px';
        }
        if (currentResizer.classList.contains('topleft')) {
            mapContainer.style.width = startWidth - dx + 'px';
            mapContainer.style.height = startHeight - dy + 'px';
        }
        if (currentResizer.classList.contains('topright')) {
            mapContainer.style.width = startWidth + dx + 'px';
            mapContainer.style.height = startHeight - dy + 'px';
        }
        if (currentResizer.classList.contains('bottomleft')) {
            mapContainer.style.width = startWidth - dx + 'px';
            mapContainer.style.height = startHeight + dy + 'px';
        }
        if (currentResizer.classList.contains('bottomright')) {
            mapContainer.style.width = startWidth + dx + 'px';
            mapContainer.style.height = startHeight + dy + 'px';
        }

        map.container.fitToViewport();
    }

    function stopResize() {
        document.removeEventListener('mousemove', resizeMouse);
        document.removeEventListener('mouseup', stopResize);
        currentResizer = null;
    }
}

// ------------------- Маркеры -------------------
function addMarker(coords) {
    let placemark = new ymaps.Placemark(coords, {}, { draggable: true });
    placemark.events.add('click', function() {
        let index = markerObjects.indexOf(placemark);
        if (index > -1) {
            map.geoObjects.remove(placemark);
            markerObjects.splice(index, 1);
            markers.splice(index, 1);
            saveMarkers();
        }
    });
    map.geoObjects.add(placemark);
    markers.push(coords);
    markerObjects.push(placemark);
    saveMarkers();
}

function saveMarkers() {
    localStorage.setItem('markers', JSON.stringify(markers));
}

function loadMarkers() {
    let saved = localStorage.getItem('markers');
    if (saved) {
        markers = JSON.parse(saved);
        markers.forEach(coords => addMarker(coords));
    }
}

// ------------------- Наборы -------------------
function saveSet() {
    let name = document.getElementById('setName').value.trim();
    if (!name) return alert('Введите имя набора!');

    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');
    savedSets[name] = markers;
    localStorage.setItem('markerSets', JSON.stringify(savedSets));

    renderSets();
    document.getElementById('setName').value = '';
}

function renderSets() {
    let list = document.getElementById('setsList');
    list.innerHTML = '';
    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');

    if (Object.keys(savedSets).length === 0) {
        list.classList.add('hidden');
        return;
    } else {
        list.classList.remove('hidden');
    }

    for (let name in savedSets) {
        let container = document.createElement('div');
        container.style.display = 'flex';
        container.style.justifyContent = 'space-between';
        container.style.alignItems = 'center';

        let loadBtn = document.createElement('button');
        loadBtn.textContent = `Загрузить "${name}"`;
        loadBtn.onclick = () => loadSet(name);

        let deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Удалить';
        deleteBtn.classList.add('delete-set');
        deleteBtn.onclick = () => deleteSet(name);

        container.appendChild(loadBtn);
        container.appendChild(deleteBtn);
        list.appendChild(container);
    }
}

function loadSet(name) {
    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');
    if (savedSets[name]) {
        markerObjects.forEach(m => map.geoObjects.remove(m));
        markerObjects = [];
        markers = [];
        savedSets[name].forEach(coords => addMarker(coords));
    }
}

function deleteSet(name) {
    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');
    delete savedSets[name];
    localStorage.setItem('markerSets', JSON.stringify(savedSets));
    renderSets();
}

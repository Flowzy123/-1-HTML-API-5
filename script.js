let map;
let markers = [];
let markerObjects = [];
let currentCoords = null;

// IndexedDB setup
let db;
const request = indexedDB.open("GeoCommentsDB", 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if(!db.objectStoreNames.contains('comments')){
        db.createObjectStore('comments', { keyPath: 'id', autoIncrement:true });
    }
};
request.onsuccess = function(e){ db = e.target.result; loadIndexedComments(); };

// --- Инициализация карты ---
ymaps.ready(init);
function init(){
    map = new ymaps.Map("map", { center:[55.76,37.64], zoom:10 });
    loadMarkers();
    renderSets();
    map.events.add('click', e => addMarker(e.get('coords')));
    document.getElementById('getLocation').addEventListener('click', getLocation);
    document.getElementById('saveLocal').addEventListener('click', saveLocalComment);
    setupResize();
}

// --- Маркеры ---
function addMarker(coords){
    let placemark = new ymaps.Placemark(coords, {}, { draggable:true });
    placemark.events.add('click', function(){
        let index = markerObjects.indexOf(placemark);
        if(index>-1){
            map.geoObjects.remove(placemark);
            markerObjects.splice(index,1);
            markers.splice(index,1);
            saveMarkers();
        }
    });
    map.geoObjects.add(placemark);
    markers.push(coords);
    markerObjects.push(placemark);
    saveMarkers();
}

function saveMarkers(){ localStorage.setItem('markers', JSON.stringify(markers)); }
function loadMarkers(){
    let saved = localStorage.getItem('markers');
    if(saved) JSON.parse(saved).forEach(c=>addMarker(c));
}

// --- Наборы ---
function saveSet(){
    let name = document.getElementById('setName').value?.trim();
    if(!name) return alert('Введите имя набора!');
    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');
    savedSets[name] = markers;
    localStorage.setItem('markerSets', JSON.stringify(savedSets));
    renderSets();
    if(document.getElementById('setName')) document.getElementById('setName').value = '';
}

function renderSets(){
    let list = document.getElementById('setsList');
    if(!list) return;
    list.innerHTML = '';
    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');
    for(let name in savedSets){
        let container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '8px';
        let btnLoad = document.createElement('button');
        btnLoad.textContent = `Загрузить "${name}"`;
        btnLoad.onclick = ()=>loadSet(name);

        let btnDelete = document.createElement('button');
        btnDelete.textContent = 'Удалить';
        btnDelete.className = 'delete-set';
        btnDelete.onclick = ()=>{
            delete savedSets[name];
            localStorage.setItem('markerSets', JSON.stringify(savedSets));
            renderSets();
        };

        container.appendChild(btnLoad);
        container.appendChild(btnDelete);
        list.appendChild(container);
    }
}

function loadSet(name){
    let savedSets = JSON.parse(localStorage.getItem('markerSets') || '{}');
    if(savedSets[name]){
        map.geoObjects.removeAll();
        markers = [];
        markerObjects = [];
        savedSets[name].forEach(coords=>addMarker(coords));
    }
}

// --- Geolocation ---
function getLocation(){
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos=>{
            currentCoords = [pos.coords.latitude, pos.coords.longitude];
            alert(`Текущее местоположение: ${currentCoords[0].toFixed(5)}, ${currentCoords[1].toFixed(5)}`);
            map.setCenter(currentCoords, 12);
        }, err=>alert('Не удалось определить местоположение'));
    } else alert('Geolocation не поддерживается вашим браузером');
}

// --- LocalStorage комментарии ---
function saveLocalComment(){
    let comment = document.getElementById('comment').value.trim();
    if(!comment || !currentCoords) return alert('Введите комментарий и определите местоположение');
    let saved = JSON.parse(localStorage.getItem('geoComments') || '[]');
    saved.push({ coords: currentCoords, text: comment });
    localStorage.setItem('geoComments', JSON.stringify(saved));
    document.getElementById('comment').value = '';
    renderLocalComments();
}

function renderLocalComments(){
    let list = document.getElementById('localComments');
    if(!list) return;
    let saved = JSON.parse(localStorage.getItem('geoComments') || '[]');
    if(saved.length===0){ list.classList.add('hidden'); return; }
    list.classList.remove('hidden');
    list.innerHTML = '';
    saved.forEach((item,index)=>{
        let div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        let span = document.createElement('span');
        span.textContent = `${item.text} (${item.coords[0].toFixed(5)},${item.coords[1].toFixed(5)})`;
        let btn = document.createElement('button');
        btn.textContent = 'Удалить';
        btn.className = 'delete-comment';
        btn.onclick = ()=>{
            saved.splice(index,1);
            localStorage.setItem('geoComments', JSON.stringify(saved));
            renderLocalComments();
        };
        div.appendChild(span);
        div.appendChild(btn);
        list.appendChild(div);
    });
}

// --- IndexedDB комментарии ---
function saveIndexedComment(comment, coords){
    let tx = db.transaction('comments','readwrite');
    let store = tx.objectStore('comments');
    store.add({ text: comment, coords: coords });
    tx.oncomplete = ()=>loadIndexedComments();
}

function loadIndexedComments(){
    let list = document.getElementById('indexedComments');
    if(!list || !db) return;
    let tx = db.transaction('comments','readonly');
    let store = tx.objectStore('comments');
    let req = store.getAll();
    req.onsuccess = ()=>{
        let data = req.result;
        if(data.length===0){ list.classList.add('hidden'); return; }
        list.classList.remove('hidden');
        list.innerHTML = '';
        data.forEach(item=>{
            let div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            let span = document.createElement('span');
            span.textContent = `${item.text} (${item.coords[0].toFixed(5)},${item.coords[1].toFixed(5)})`;
            let btn = document.createElement('button');
            btn.textContent = 'Удалить';
            btn.className = 'delete-comment';
            btn.onclick = ()=>{
                let tx = db.transaction('comments','readwrite');
                let store = tx.objectStore('comments');
                store.delete(item.id);
                tx.oncomplete = ()=>loadIndexedComments();
            };
            div.appendChild(span);
            div.appendChild(btn);
            list.appendChild(div);
        });
    };
}

// --- Resize карты ---
function setupResize(){
    const container = document.getElementById('map-container');
    let isResizing = false;
    let currentResizer;
    let startX, startY, startWidth, startHeight;

    const resizers = container.querySelectorAll('.resizer');
    resizers.forEach(resizer=>{
        resizer.addEventListener('mousedown', e=>{
            e.preventDefault();
            isResizing = true;
            currentResizer = resizer;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = container.offsetWidth;
            startHeight = container.offsetHeight;
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });
    });

    function resize(e){
        if(!isResizing) return;
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;
        switch(currentResizer.className){
            case 'resizer right': container.style.width = startWidth + dx + 'px'; break;
            case 'resizer left': container.style.width = startWidth - dx + 'px'; break;
            case 'resizer bottom': container.style.height = startHeight + dy + 'px'; break;
            case 'resizer top': container.style.height = startHeight - dy + 'px'; break;
            case 'resizer topleft': container.style.width = startWidth - dx + 'px'; container.style.height = startHeight - dy + 'px'; break;
            case 'resizer topright': container.style.width = startWidth + dx + 'px'; container.style.height = startHeight - dy + 'px'; break;
            case 'resizer bottomleft': container.style.width = startWidth - dx + 'px'; container.style.height = startHeight + dy + 'px'; break;
            case 'resizer bottomright': container.style.width = startWidth + dx + 'px'; container.style.height = startHeight + dy + 'px'; break;
        }
        map.container.fitToViewport();
    }

    function stopResize(){
        isResizing = false;
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResize);
    }
}

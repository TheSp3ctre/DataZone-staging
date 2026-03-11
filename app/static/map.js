/**
 * DataZone Energy - Map Logic
 * Handles Leaflet initialization, GeoJSON fetching, and interactions.
 */

// --- CONFIGURATION ---
const API_BASE = '/api/v1';
const SP_CENTER = [-23.5505, -46.6333]; // São Paulo
const INITIAL_ZOOM = 11;

let map;
let layers = {
    subestacoes: null,
    linhas: null,
    fibra: null,
    zoneamento: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    
    // Load initial active layers
    if (document.getElementById('layer-subestacoes').checked) loadLayer('subestacoes');
    if (document.getElementById('layer-linhas').checked) loadLayer('linhas');
});

function initMap() {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView(SP_CENTER, INITIAL_ZOOM);

    // Dark Matter - CartoDB (Premium look)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Re-add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // --- COORD TRACKER ---
    map.on('mousemove', (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('coord-values').innerText = 
            `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
    });
}

// --- DATA FETCHING ---
async function loadLayer(type) {
    let endpoint = '';
    let style = {};
    let pointToLayer = null;

    switch(type) {
        case 'subestacoes':
            endpoint = `${API_BASE}/subestacoes?limit=500`;
            pointToLayer = (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 8,
                    fillColor: "#f97316",
                    color: "#fff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            };
            break;
        case 'linhas':
            endpoint = `${API_BASE}/linhas?limit=200`;
            style = { color: "#fbbf24", weight: 3, opacity: 0.7 };
            break;
        case 'fibra':
            endpoint = `${API_BASE}/fibra?limit=500`;
            pointToLayer = (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: "#3b82f6",
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.9
                });
            };
            break;
        case 'zoneamento':
            endpoint = `${API_BASE}/zoneamento-sp?limit=100`;
            style = { 
                color: "#a855f7", 
                weight: 1, 
                fillColor: "#a855f7", 
                fillOpacity: 0.2 
            };
            break;
    }

    try {
        console.log(`Fetching ${type}...`);
        const response = await fetch(endpoint);
        const data = await response.json();

        if (layers[type]) map.removeLayer(layers[type]);

        layers[type] = L.geoJSON(data, {
            style: style,
            pointToLayer: pointToLayer,
            onEachFeature: (feature, layer) => {
                // Tooltip on hover
                const name = feature.properties.nome || feature.properties.tx_zoneamento_perimetro || 'Item';
                layer.bindTooltip(`<strong>${name}</strong>`, { sticky: true, className: 'custom-tooltip' });

                layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    showDetail(feature, type, e.latlng);
                });
                
                layer.on('mouseover', function() {
                    this.setStyle({ weight: 5, opacity: 1 });
                });
                
                layer.on('mouseout', function() {
                    layers[type].resetStyle(this);
                });
            }
        }).addTo(map);

    } catch (err) {
        console.error(`Error loading ${type}:`, err);
    }
}

// --- INTERACTION ---
function showDetail(feature, type, latlng) {
    const panel = document.getElementById('detail-panel');
    const nameEl = document.getElementById('panel-name');
    const typeEl = document.getElementById('panel-type');
    const latEl = document.getElementById('val-lat');
    const lonEl = document.getElementById('val-lon');
    const attrList = document.getElementById('attribute-list');
    const iconContainer = document.getElementById('panel-icon');

    // Set Name & Type
    const props = feature.properties;
    nameEl.innerText = props.nome || props.tx_zoneamento_perimetro || props.operador || 'Sem Nome';
    typeEl.innerText = type.toUpperCase().replace('_', ' ');

    // Set Icon Color
    const colors = {
        subestacoes: '#f97316',
        linhas: '#fbbf24',
        fibra: '#3b82f6',
        zoneamento: '#a855f7'
    };
    iconContainer.style.backgroundColor = colors[type] || 'var(--accent)';

    // Set Exact Coordinates
    // If it's a point, we have exact coords. If it's a line/poly, we use click point.
    if (feature.geometry.type === 'Point') {
        latEl.innerText = feature.geometry.coordinates[1].toFixed(8);
        lonEl.innerText = feature.geometry.coordinates[0].toFixed(8);
    } else {
        latEl.innerText = latlng.lat.toFixed(8);
        lonEl.innerText = latlng.lng.toFixed(8);
    }

    // Clear and build attributes
    attrList.innerHTML = '';
    const ignoreFields = ['id', 'geometry'];
    
    for (const [key, value] of Object.entries(props)) {
        if (ignoreFields.includes(key)) continue;
        
        const item = document.createElement('div');
        item.className = 'attr-item';
        item.innerHTML = `
            <span class="attr-label">${key.replace(/_/g, ' ').toUpperCase()}</span>
            <span class="attr-value">${value || 'N/A'}</span>
        `;
        attrList.appendChild(item);
    }

    panel.classList.remove('hide');
}

function setupEventListeners() {
    // Layer Toggles
    const toggles = {
        'layer-subestacoes': 'subestacoes',
        'layer-linhas': 'linhas',
        'layer-fibra': 'fibra',
        'layer-zoneamento': 'zoneamento'
    };

    for (const [id, type] of Object.entries(toggles)) {
        document.getElementById(id).addEventListener('change', (e) => {
            if (e.target.checked) {
                loadLayer(type);
            } else {
                if (layers[type]) map.removeLayer(layers[type]);
            }
        });
    }

    // BDGD placeholders
    ['layer-bdgd-sub', 'layer-bdgd-rede'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (e.target.checked) {
                alert("As camadas de Distribuição (BDGD) serão integradas na próxima fase do MVP.");
                e.target.checked = false;
            }
        });
    });

    // Close Detail Panel
    document.getElementById('close-detail').addEventListener('click', () => {
        document.getElementById('detail-panel').classList.add('hide');
    });

    // Close panel when clicking map
    map.on('click', () => {
        document.getElementById('detail-panel').classList.add('hide');
    });
}

/* 
    * Converts Singapore Survey Coordinate System (SVY21)
    * to World Geodetic System 1984 (WGS84) Latitude and Longitude.
    */
function svy21ToWgs84(X, Y) {
    // Check for invalid input (e.g., if PapaParse didn't type it correctly)
    if (typeof X !== 'number' || typeof Y !== 'number' || isNaN(X) || isNaN(Y)) {
        return { lat: 0, lon: 0 }; // Return zero coordinates or handle error
    }

    // --- Calls new instance ---            
    var cv = new SVY21();
    var resultLatLon = cv.computeLatLon(Y, X);
    
    return resultLatLon;
}
    
//  API endpoint
const CARPARK_AVAILABILITY_API = 'https://api.data.gov.sg/v1/transport/carpark-availability';

/**
 * Loads HDB Carpark data from CSV, fetches live availability from API,
 * transforms and merges the data, and initializes the application.
 * @param {string} csvFilePath - The path to the static HDB Carpark CSV file.
 */
function loadCarparkData(csvFilePath) {
    Papa.parse(csvFilePath, {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: async function(results) { // Made 'complete' function 'async'
            
            // 1. Static Data Processing (CSV)
            const staticRawData = results.data.filter(row => row.car_park_no && row.x_coord && row.y_coord);
            
            // Create a Map for quick lookup of static data by Carpark Number
            const staticCarparkMap = new Map();

            staticRawData.forEach(carpark => {
                // Perform SVY21 to WGS84 conversion (assuming svy21ToWgs84 is defined)
                const { lat, lon } = svy21ToWgs84(carpark.x_coord, carpark.y_coord);
                
                staticCarparkMap.set(String(carpark.car_park_no).trim(), {
                    car_park_no: String(carpark.car_park_no).trim(),
                    address: String(carpark.address).trim(),
                    lat: lat,
                    lon: lon,
                    distance: 0, 
                    car_park_type: carpark.car_park_type,
                    // Temporarily set available lots to a default (e.g., 0)
                    available: 0 
                });
            });

            // 2. Fetch Live Availability Data (API)
            let availabilityData = [];
            try {
                const response = await fetch(CARPARK_AVAILABILITY_API);
                if (!response.ok) {
                    throw new Error(`API fetch failed with status ${response.status}`);
                }
                const apiResult = await response.json();
                
                // The API returns an array under 'items[0].carpark_data'
                if (apiResult.items && apiResult.items[0] && apiResult.items[0].carpark_data) {
                    availabilityData = apiResult.items[0].carpark_data;
                }
                
            } catch (error) {
                console.error("Failed to fetch live availability data. Using 0 for all:", error);
            }

            // 3. Merge Data: Update static data with live availability
            availabilityData.forEach(liveEntry => {
                // FIX: Use 'carpark_number' from the API response for matching the key in the Map
                const carparkNoAPI = String(liveEntry.carpark_number).trim();
                // Match the API key against the Map key (which should be keyed by the CSV's car_park_no)
                if (staticCarparkMap.has(carparkNoAPI)) {
                    const staticData = staticCarparkMap.get(carparkNoAPI);
                    
                    let availableLots = 0;

                    // CRITICAL: Safely access the nested 'lots_available' property
                    // liveEntry.carpark_info is an array, we take the first element [0]
                    if (liveEntry.carpark_info && liveEntry.carpark_info.length > 0) {
                        
                        const lotsString = liveEntry.carpark_info[0].lots_available; 
                        
                        // Parse the string to an integer, defaulting to 0 if null, undefined, or NaN
                        const parsedLots = parseInt(lotsString);
                        
                        if (!isNaN(parsedLots)) {
                            availableLots = parsedLots;
                        }
                    }
                    
                    staticData.available = availableLots;
                }
            });
            
            
            // 4. Finalize Global Data Array
            // Convert Map values back to an array
            ALL_CARPARK_DATA_MOCK = Array.from(staticCarparkMap.values());

            
            
            // 5. Initialize application components
            
            if (typeof ALL_CARPARK_DATA_MOCK !== 'undefined' && ALL_CARPARK_DATA_MOCK.length > 0) {

                // 1. Initialize the active data list with the full master list
                currentData = ALL_CARPARK_DATA_MOCK; 
                
                // 2. Initialize the page number
                currentPage = 1;                     
                
                console.log(`Initialized app with ${ALL_CARPARK_DATA_MOCK.length} carpark entries.`);
                
                // 3. Render the table for the very first time using the initialized state
                renderExploreTable(currentData, currentPage);
                
                // 4. Initialize the map (if needed)
                // initMap(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
                
            } else {
                console.error("Failed to load carpark data for initialization.");
            }
            
            // ... any other initialization logic ...
        },
        error: function(error) {
            console.error("Error parsing CSV file:", error);
        }
    });
}

// --- 1.  Global map instance  ---
let map;
let userMarker;
let userLocation=[];
let carparkMarkers = [];
let locateButton = document.getElementById("locate-button");
let locateButton1 = document.getElementById("locate-button-1");
let locateButton2 = document.getElementById("prompt-form");


// --- 2. Geospatial Utility Functions ---

/**
 * Calculates the distance between two geographical points using the Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers (km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    
    // Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in km
}

// --- 3. UI and Map Initialization ---

// Default center of Singapore
const DEFAULT_CENTER = [1.3521, 103.8198]; 

function initMap(centerLat, centerLon) {
    // Only initialize map if it doesn't exist or is corrupted
    if (map) {
        map.remove();
    }

    
    // Initialize map centered on user's location or default
    map = L.map('map').setView([centerLat, centerLon], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function clearMarkers() {
    carparkMarkers.forEach(marker => map.removeLayer(marker));
    carparkMarkers = [];
    if (userMarker) {
        map.removeLayer(userMarker);
        userMarker = null;
    }
}

function updateStatus(message, type = 'info') {
    const el = document.getElementById('status-message');
    el.textContent = message;
    el.className = `info-box block text-center font-medium transition duration-300`;

    // Note: Tailwind dark mode classes are handled via global CSS overrides in <style> block
    const colors = {
        info: 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800',
        success: 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800',
        error: 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
        loading: 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800'
    };

    // Remove all existing color classes and apply the new ones
    // We need to be careful to remove the dark mode specific classes too if they were present
    Object.values(colors).forEach(c => {
        c.split(' ').forEach(cls => el.classList.remove(cls));
    });
    el.classList.add(...colors[type].split(' '));


}

function createCarparkMarker(carpark, rank) {
    let iconColor;
    if (carpark.available > 50) {
        iconColor = 'green';
    } else if (carpark.available > 0) {
        iconColor = 'orange';
    } else {
        iconColor = 'red';
    }
    
    let distanceValue = carpark.distance; // Use existing distance if available

    // If distance is missing (called from Explore tab), calculate it
    if (!distanceValue && userLocation.lat && userLocation.lon) {
        distanceValue = calculateDistance(userLocation.lat, userLocation.lon, carpark.lat, carpark.lon);
    }
    
    // Determine the final string to display in the popup
    const displayDistance = (distanceValue && distanceValue > 0) 
        ? `${distanceValue.toFixed(2)} km` 
        : 0; // Shows 'N/A' if userLocation is not set or distance is 0
    //const displayDistance = (carpark.distance && !isNaN(carpark.distance)) ? `${carpark.distance.toFixed(2)} km` : 'N/A';
    
    const bgColorClass = `bg-${iconColor}-600`;
    const ringColorClass = `ring-${iconColor}-300`;

    // Custom Icon with rank and color
    // If rank is null (from Explore tab), use a simple icon (e.g., 'P')
    const iconContent = rank ? rank : 'P'; 
    const iconRankClass = rank ? 'tw-text-sm' : 'tw-text-lg'; // Larger 'P' or smaller rank number
    
    const iconHtml = `<div class="w-8 h-8 rounded-full ${bgColorClass} flex items-center justify-center text-white ${iconRankClass} font-bold shadow-lg ring-2 ring-white ${ringColorClass}">${iconContent}</div>`;

    const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    const marker = L.marker([carpark.lat, carpark.lon], { icon: customIcon }).addTo(map);

    // FIX: Optional rank in the popup content
    const rankPrefix = rank ? `${rank}. ` : ''; 

    const popupContent = `
        <div class="font-sans dark:text-gray-900">
            <h4 class="text-base font-bold">${rankPrefix}${carpark.car_park_no}</h4>
            <p class="text-xs text-gray-600 mb-2">${carpark.address}</p>
            <hr class="my-1">
            <p class="text-sm font-medium">
                Availability: 
                <span class="font-bold text-${iconColor}-600">${carpark.available} Lots</span>
            </p>
            <p class="text-xs text-gray-500">Distance: ${displayDistance} km</p>
        </div>
    `;
    marker.bindPopup(popupContent);
    
    // Do NOT push to carparkMarkers array when called from Explore view
    if (rank) {
        carparkMarkers.push(marker);
    }
    
    return marker; // Return the marker so showExploreCarparkOnMap can manage it
}


function showExploreCarparkOnMap(carparkData) {
    exploreMarker = createCarparkMarker(carparkData, null); // or 'Selected'
    clearMarkers;
    // We explicitly open the popup since this is a user-initiated action
    exploreMarker.openPopup(); 
    
    // 2. Center map view on the new marker and zoom in
    map.setView([carparkData.lat, carparkData.lon], 16); 
}

// --- 4. Main Logic: Location, Distance, and Rendering ---

function handleSuccess(position) {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;
    
    updateStatus(`Location found: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}. Calculating nearest car parks...`, 'success');
    
    // 1. Initialize Map at User's Location
    initMap(userLat, userLon);
    if (map) {
        map.invalidateSize(); 
    }
    userLocation.lat=userLat;
    userLocation.lon=userLon;
    // Add user marker
    userMarker = L.marker([userLat, userLon], {
        icon: L.divIcon({
            className: 'user-location-icon',
            html: '<div class="w-4 h-4 rounded-full bg-red-600 ring-4 ring-red-300"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        })
    }).addTo(map)
        .bindPopup('Your Location (Approximate)').openPopup();

    // 2. Calculate Distances
    const dataWithDistance = ALL_CARPARK_DATA_MOCK.map(carpark => {
        const distance = calculateDistance(userLat, userLon, carpark.lat, carpark.lon);
        return { ...carpark, distance };
    });

    // 3. Find Nearest 10
    const nearestCarparks = dataWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

    // 4. Render Results
    renderResults(nearestCarparks);
}

function handleError(error) {
    let errorMessage = "An unknown error occurred while retrieving your location.";
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = "Location access was denied. Please allow location access in your browser settings and try again.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            errorMessage = "The request to get user location timed out.";
            break;
        default:
            console.error("Geolocation Error Code:", error.code);
    }
    document.getElementById('locate-button').disabled = false;
    updateStatus(errorMessage, 'error');
    document.getElementById('location-prompt').style.display = 'none';
}

function requestUserLocation() {
    document.getElementById('locate-button').disabled = true;
    document.getElementById('map-container').classList.remove('tw-hidden');
    document.getElementById('list-container').classList.remove('tw-hidden');
    
    clearMarkers();
    
    updateStatus('Requesting location permission...', 'loading');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    } else {
        handleError({ code: 99, message: "Geolocation is not supported by this browser." });
    }
}

function renderResults(carparks) {
    // Clears old carpark markers but keeps the user marker
    carparkMarkers.forEach(marker => map.removeLayer(marker));
    carparkMarkers = []; 
    
    const listEl = document.getElementById('carpark-list');
    listEl.innerHTML = '';
    
    carparks.forEach((carpark, index) => {
        const rank = index + 1;
        
        // Add marker to map
        createCarparkMarker(carpark, rank);
        
        // Determine availability status for list display
        let availabilityText;
        let textColor;
        if (carpark.available > 50) {
            availabilityText = `${carpark.available} Lots`;
            textColor = 'text-green-600';
        } else if (carpark.available > 0) {
            availabilityText = `${carpark.available} Lots`;
            textColor = 'text-orange-600';
        } else {
            availabilityText = `Full (0 Lots)`;
            textColor = 'text-red-600';
        }

        const listItem = document.createElement('div');
        // Added dark mode classes for list item
        //   listItem.className="tw-p-3 tw-bg-gray-50 dark:tw-bg-[#171717] tw-rounded-md tw-border-[1px] dark:tw-border-[#1f2123] tw-shadow-sm"
        listItem.className = "bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition hover:shadow-md tw-dark:bg-gray-800 tw-dark:border-gray-700";
        listItem.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-grow">
                    <h3 class="text-lg font-bold tw-text-gray-800 tw-dark:text-white">${rank}. ${carpark.car_park_no}</h3>
                    <p class="text-sm text-gray-700 tw-dark:text-gray-300">${carpark.address}</p>
                </div>
                <div class="text-right ml-4">
                    <p class="text-sm font-semibold">${carpark.distance.toFixed(2)} km</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Type: ${carpark.car_park_type}</p>
                </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between text-sm tw-dark:border-gray-700">
                    <span class="tw-dark:text-gray-200">Available Lots:</span>
                    <span class="font-bold ${textColor}">${availabilityText}</span>
            </div>
        `;
        listEl.appendChild(listItem);
    });

    // Set map zoom and bounds to fit all markers including the user
    const latLons = carparks.map(cp => [cp.lat, cp.lon]);
    if (userMarker) {
        latLons.push(userMarker.getLatLng());
    }
    if (latLons.length > 0) {
        map.fitBounds(L.latLngBounds(latLons), { padding: [50, 50] });
    }

    document.getElementById('locate-button').disabled = false;
    document.getElementById('locate-button-1').disabled = false;
    document.getElementById('list-container').classList.remove('tw-hidden');
}

// Pagination Constants and Variables
const ROWS_PER_PAGE = 10;
let currentPage = 1;
let currentData = []; // This will hold the filtered data used for pagination
let exploreMarker = null;

// Function to filter the table based on search input
function filterExploreTable() {
    const searchInput = document.getElementById('carpark-search');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (typeof ALL_CARPARK_DATA_MOCK === 'undefined') {
        console.error("ALL_CARPARK_DATA_MOCK is not defined. Cannot filter.");
        return;
    }

    const filteredData = ALL_CARPARK_DATA_MOCK.filter(carpark => {
        const carParkMatch = carpark.car_park_no.toLowerCase().includes(searchTerm);
        const addressMatch = carpark.address.toLowerCase().includes(searchTerm);
        
        return carParkMatch || addressMatch;
    });

    // CRITICAL FOR PAGINATION: 
    // 1. Save the filtered data globally
    currentData = filteredData;
    // 2. Reset to the first page
    currentPage = 1; 
    
    // 3. Render the first page of the filtered results
    renderExploreTable(currentData, currentPage);
}

        // Function to change the current page
function changePage(page) {
    if (page < 1 || page > Math.ceil(currentData.length / ROWS_PER_PAGE)) {
        return;
    }
    currentPage = page;
    renderExploreTable(currentData, currentPage); // Re-render table with new page
}

// Function to calculate and render pagination controls
function setupPagination(totalItems) {
    const paginationContainer = document.getElementById('pagination-controls');
    if (!paginationContainer) {
        console.error("Pagination controls container not found. Check HTML ID 'pagination-controls'.");
        return; 
    }

    paginationContainer.innerHTML = ''; // Clear existing buttons

    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE);

    if (totalPages <= 1) return; // No pagination needed

    // Button Base Classes (Tailwind)
    const baseClasses = 'tw-px-3 tw-py-1 tw-mx-1 tw-text-sm tw-font-medium tw-rounded-md tw-cursor-pointer tw-transition-colors';
    
    // Function to create a button
    const createButton = (text, pageNumber, isActive = false) => {
        const button = document.createElement('button');
        button.innerText = text;
        button.classList.add(...baseClasses.split(' '));
        button.dataset.page = pageNumber;
        
        if (isActive) {
            button.classList.add('tw-bg-red-600', 'tw-text-white', 'hover:tw-bg-red-700');
        } else {
            button.classList.add('tw-bg-gray-200', 'dark:tw-bg-[#171717]', 'tw-text-gray-700', 'dark:tw-text-gray-300', 'hover:tw-bg-gray-300', 'dark:hover:tw-bg-[#2d2d2d]');
        }

        button.addEventListener('click', () => changePage(pageNumber));
        return button;
    };

    // Add 'Previous' button
    paginationContainer.appendChild(createButton('Previous', currentPage - 1, false));

    // Determine which page numbers to display (e.g., show max 5 buttons)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 2) {
        endPage = Math.min(totalPages, 5);
    } else if (currentPage >= totalPages - 1) {
        startPage = Math.max(1, totalPages - 4);
    }

    // Add page number buttons
    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(createButton(String(i), i, i === currentPage));
    }
    
    // Add 'Next' button
    paginationContainer.appendChild(createButton('Next', currentPage + 1, false));
    }
// Function to render the table rows based on provided data, using pagination
function renderExploreTable(data, page = 1) {
    const tableBody = document.getElementById('carpark-table-body');
    if (!tableBody) return;

    // Calculate the start and end indices for the current page
    const start = (page - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    
    // Slice the data to get the entries for the current page
    const paginatedData = data.slice(start, end);

    // Clear any existing content
    tableBody.innerHTML = '';

    paginatedData.forEach(carpark => {
        const row = document.createElement('tr');
        
        // Determine lot availability color (using full, safelisted classes)
        let lotColorClass = 'text-gray-800 dark:tw-text-gray-200';
        if (carpark.available > 50) {
            lotColorClass = 'text-green-600 font-bold';
        } else if (carpark.available > 0) {
            lotColorClass = 'text-orange-500 font-bold';
        } else {
            lotColorClass = 'text-red-600 font-bold';
        }
        
        // All <td> tags now include tw-text-center
        row.innerHTML = `
            <td class="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-font-medium tw-text-gray-900 dark:tw-text-white tw-text-center">
                ${carpark.car_park_no}
            </td>
            <td class="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-500 dark:tw-text-gray-400 tw-text-center">
                ${carpark.address}
            </td>
            <td class="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm ${lotColorClass} tw-text-center">
                ${carpark.available} Lots
            </td>
            <td class="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-center">
                <button 
                    data-lat="${carpark.lat}" 
                    data-lon="${carpark.lon}"
                    data-carpark-no="${carpark.car_park_no}"
                    class="show-on-map-btn tw-text-red-600 hover:tw-text-red-800 tw-font-medium"
                >
                    Show on Map
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    setupPagination(data.length);
} 




function addExploreMarkerToMap(lat, lon, carParkNo, address, availableLots) {
    if (!map) {
        alert("Map not initialized yet.");
        return;
    }

    // 1. Remove previous explore marker
    if (exploreMarker) {
        exploreMarker.remove();
    }

    // 2. Define the custom icon
    const iconHtml = `<div class="tw-w-8 tw-h-8 tw-bg-blue-600 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-white tw-text-xs tw-font-bold tw-ring-4 tw-ring-blue-300">📍</div>`;

    const customIcon = L.divIcon({
        className: 'explore-div-icon',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    // 3. Add new marker with detailed popup
    exploreMarker = L.marker([lat, lon], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
            <div class="font-sans">
                <h4 class="text-base font-bold">${carParkNo}</h4>
                <p class="text-sm text-gray-600 mb-1">${address}</p>
                <p class="text-sm font-medium">
                    Available Lots: <span class="font-bold text-blue-600">${availableLots}</span>
                </p>
            </div>
        `)
        .openPopup();

    // 4. Center map view on the new marker and zoom in
    map.setView([lat, lon], 16); 
}

 // --- Three.js Logic for Hero Background ---

let scene, camera, renderer, entryBarrier, exitBarrier, animatedCarEntry, animatedCarExit;
let groundMaterial;

// Colors for Dark/Light mode in Three.js
const DARK_SKY_COLOR = 0x1f2937; 
//const LIGHT_SKY_COLOR = 0xadd8e6;
const LIGHT_SKY_COLOR = 0x000000;

function initThree() {
    const container = document.getElementById('three-canvas');
    scene = new THREE.Scene();
    scene.background = null;

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    
    const loader = new THREE.GLTFLoader();

    // 1. Load the GLTF Model for the Entry Car
    loader.load(
        'assets/3d_model/parkinglot.gltf', // local size exceeded
   
        function (gltf) {
     
            model = gltf.scene;
       
            // Apply necessary scale and position adjustments
            model.scale.set(0.5, 0.5, 0.5); // Adjust size
            model.rotation.y = Math.PI / 2; // Rotate if needed
            model.position.set(-5, 0.4, 1); // Set starting position
            model.visible = true;
                    
            scene.add(model);
            console.log('GLTF Model Loaded and added to scene.');

            
        },
    
        function (xhr) {
    // Check if the total size is available (it should be for GLTF files)
        if (xhr.lengthComputable) {
            
            // Calculate the percentage
            const percent = (xhr.loaded / xhr.total) * 100;
            
            // 🚨 Action: Update your UI element (e.g., a div with ID 'loading-text')
            console.log(Math.round(percent) + '% loaded'); 
            
            // If you have an HTML progress bar element:
            // document.getElementById('loading-bar').style.width = percent + '%';
        }
        },
        
        // 3. onError Callback (Error Handling)
        function (error) {
            console.error('An error occurred during GLTF loading:', error);
        }
            
    );
            
    
    
    
    
    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Event Listener for responsiveness
    window.addEventListener('resize', onWindowResizeThree, false);
}

function onWindowResizeThree() {
    const container = document.getElementById('three-canvas');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

let animationState = 0; // 0: Idle, 1: Car Entry, 2: Car Exits
let animationProgress = 0;
const animationDuration = 500; // Total frames for entry/exit animation phase

function animateThree() {
    requestAnimationFrame(animateThree);

    // Smooth circular camera movement around the scene
    const time = Date.now() * 0.0001;
    camera.position.x = Math.sin(time) * 15;
    camera.position.z = Math.cos(time) * 15;
    camera.lookAt(0, 0, 0);

    animationProgress++;

    switch (animationState) {
        case 0: // Idle state, wait to start entry
            if (animationProgress > 300) { 
                animationState = 1;
                animationProgress = 0;
                animatedCarEntry.position.set(-15, 0.4, -1);
                entryBarrier.rotation.z = 0; 
            }
            break;

        case 1: // Car Entry Animation
            if (animationProgress < 100) { // Car approaches barrier
                animatedCarEntry.position.x += 0.1;
            } else if (animationProgress === 100) { // Barrier opens
                entryBarrier.rotation.z = -Math.PI / 2; 
            } else if (animationProgress > 120 && animationProgress < 220) { // Car passes barrier
                animatedCarEntry.position.x += 0.1;
            } else if (animationProgress === 220) { // Barrier closes
                entryBarrier.rotation.z = 0;
            } else if (animationProgress > 250 && animationProgress < 350) { // Car turns and parks
                animatedCarEntry.position.z += 0.1; 
            } else if (animationProgress >= animationDuration) { // Animation done, transition to exit
                animatedCarEntry.position.set(-5, 0.4, -1); // Snap to a parked spot 
                animationState = 2; 
                animationProgress = 0;
                animatedCarExit.position.set(5, 0.4, 1); // Place exit car at a parked spot
                animatedCarExit.visible = true; 
            }
            break;

        case 2: // Car Exit Animation
            if (animationProgress < 100) { // Car reverses/approaches exit
                animatedCarExit.position.x -= 0.05;
            } else if (animationProgress === 100) { // Exit barrier opens
                exitBarrier.rotation.z = Math.PI / 2; 
            } else if (animationProgress > 120 && animationProgress < 220) { // Car passes exit barrier
                animatedCarExit.position.x -= 0.1;
            } else if (animationProgress === 220) { // Exit barrier closes
                exitBarrier.rotation.z = 0;
            } else if (animationProgress > 250 && animationProgress < 350) { // Car drives off-screen
                animatedCarExit.position.x -= 0.1;
            } else if (animationProgress >= animationDuration) { // Animation done, go back to idle
                animatedCarExit.position.set(5, 0.4, 1); 
                animatedCarExit.visible = false;
                animationState = 0;
                animationProgress = 0;
            }
            break;
    }

    renderer.render(scene, camera);
}

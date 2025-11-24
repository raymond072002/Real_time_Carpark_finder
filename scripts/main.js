// ---  Initialization on Load ---

document.addEventListener('DOMContentLoaded', () => {

    locateButton.addEventListener('click',requestUserLocation);    
    locateButton1.addEventListener('click',requestUserLocation);    
    locateButton2.addEventListener('click',requestUserLocation);    
    
    loadCarparkData('HDBCarparkInformation.csv');
        if (typeof ALL_CARPARK_DATA_MOCK !== 'undefined') {
        // Initialize currentData with all data
        currentData = ALL_CARPARK_DATA_MOCK; 
        // Initial render (will call setupPagination internally)
        renderExploreTable(currentData, currentPage);
    }

    // Attach the filter function to the search input event
    const searchInput = document.getElementById('carpark-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterExploreTable);
        searchInput.addEventListener('change', filterExploreTable);
    }    

    const exploreSection = document.getElementById('explore-section');
    if (exploreSection) {
        exploreSection.addEventListener('click', (e) => {
            if (e.target.classList.contains('show-on-map-btn')) {
                
                const carparkNo = e.target.dataset.carparkNo; // Get the unique identifier
                
                // Find the full carpark object from the global data array
                // NOTE: This assumes ALL_CARPARK_DATA_MOCK holds your complete list of carpark objects.
                const selectedCarpark = ALL_CARPARK_DATA_MOCK.find(c => c.car_park_no === carparkNo);

                if (selectedCarpark) {
                    
                    // 1. Remove previous explore marker
                    if (exploreMarker) {
                        exploreMarker.remove();
                    }
                    
                    // 2. Make the map section visible and scroll
                    document.getElementById('map-container').classList.remove('tw-hidden');
                    document.getElementById('list-container').classList.add('tw-hidden');
                    document.getElementById('map-container').scrollIntoView({ behavior: 'smooth' });

                    // 3. Call the new utility function to create and show the marker
                    showExploreCarparkOnMap(selectedCarpark);
                    
                    // 4. Force map redraw
                    if (map) {
                        map.invalidateSize();
                    }
                } else {
                    console.error(`Carpark data not found for ID: ${carparkNo}`);
                }
            }
        });
    }           
    // PDPA 
    const privacyLink = document.getElementById('privacy-link');
    const privacySection = document.getElementById('privacy-policy');
    const privacyHideButton = document.getElementById('privacy-policy-hide');
    
    if (privacyLink && privacySection) {
    privacyLink.addEventListener('click', (event) => {
        // 1. Prevent the browser from navigating away
        event.preventDefault(); 
        
        // 2. Hide the main app content (e.g., your CarCare section)
    
        // 3. Reveal the Privacy Policy section
        privacySection.classList.remove('tw-hidden');
        
        // Optional: Scroll the user to the top of the policy page
        //window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById("privacy-policy").scrollIntoView({behavior:"smooth"});
        });
    }
    
    if (privacyHideButton) {
    privacyHideButton.addEventListener('click', (event) => {
        event.preventDefault();
        // Hide the Privacy Policy section
        privacySection.classList.add('tw-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Terms of Service 
    const termsLink = document.getElementById('terms-of-service-link');
    const termsSection = document.getElementById('terms-of-service');
    const termsHideButton = document.getElementById('terms-of-service-hide');
    
    if (termsLink && termsSection) {
    termsLink.addEventListener('click', (event) => {
        // 1. Prevent the browser from navigating away
        event.preventDefault(); 
        
        // 2. Hide the main app content (e.g., your CarCare section)
    
        // 3. Reveal the Privacy Policy section
        termsSection.classList.remove('tw-hidden');
        
        // Optional: Scroll the user to the top of the policy page
        //window.scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById("terms-of-service").scrollIntoView({behavior:"smooth"});
        });
    }
    
    if (termsHideButton) {
    termsHideButton.addEventListener('click', (event) => {
        event.preventDefault();
        // Hide the terms-of-service section
        termsSection.classList.add('tw-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    


// Initialize 3D Hero
    try {
        initThree(); 
        
        let entryGateGroup = null; // Initialize globally
        let exitGateGroup = null;  // Initialize globally
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

            if (entryGateGroup === null || exitGateGroup === null) {
                    // Render the scene even if the gates aren't loaded (if other objects exist)
                    renderer.render(scene, camera); 
                    return; // Exit the function early
                }
            entryBarrierArm = entryGateGroup.getObjectByName('gate1_movable_gate_m_0');
            exitBarrierArm = exitGateGroup.getObjectByName('gate2_movable_gate_m_0');

            // CRITICAL CHECK: Ensure the objects were loaded successfully before animating
            if (entryBarrierArm && exitBarrierArm) {
                
                switch (animationState) {
                    
                    case 1: // Entry animation
                        // ... (Car movement logic) ...
                        
                        if (animationProgress === 50) { 
                            // Target the specific mesh by name and rotate it to open (e.g., 45 degrees)
                            entryBarrierArm.rotation.x = Math.PI / 4; 
                        } 
                        
                        if (animationProgress === 120) {
                            // Close the gate
                            entryBarrierArm.rotation.x = 0; 
                        }
                        // ...
                        break;

                    case 3: // Exit animation
                        // ... (Car movement logic) ...
                        
                        if (animationProgress === 50) { 
                            // Open the exit gate
                            exitBarrierArm.rotation.x = -Math.PI / 4; // Use negative for opposite rotation
                        }
                        
                        if (animationProgress === 120) {
                            // Close the exit gate
                            exitBarrierArm.rotation.x = 0;
                        }
                        // ...
                        break;
                }
            } else {
                // This helps debug if the model hasn't loaded yet
                console.warn("Gate mesh objects not yet available for animation.");
            }

        
            renderer.render(scene, camera);
        }
    animateThree(); 
    } catch (e) {
        console.error("Three.js initialization failed:", e);
        // Fallback UI in case of Three.js error
        document.getElementById('three-canvas').innerHTML = '<div class="absolute inset-0 bg-gray-900 flex items-center justify-center"><p class="text-white text-xl">3D Hero Loading Error</p></div>';
    }

    // Initialize default map view (center of Singapore)
    initMap(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
});


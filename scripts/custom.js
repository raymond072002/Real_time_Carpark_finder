        // --- 5. Three.js Logic for Hero Background ---

        let scene, camera, renderer, entryBarrier, exitBarrier, animatedCarEntry, animatedCarExit;
        let groundMaterial;

        // Colors for Dark/Light mode in Three.js
        const DARK_SKY_COLOR = 0x1f2937; 
        //const LIGHT_SKY_COLOR = 0xadd8e6;
        const LIGHT_SKY_COLOR = 0x000000;

        function initThree() {
            const container = document.getElementById('three-canvas');
            scene = new THREE.Scene();
            // FIX: Initialize scene.background as a THREE.Color so .setHex can be called later
            //scene.background = new THREE.Color(LIGHT_SKY_COLOR); 
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

            // --- Ground ---
            //const groundGeometry = new THREE.PlaneGeometry(50, 50);
            // Initialize groundMaterial globally for use in setDarkMode
         //   groundMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 }); 
          //  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
          //  ground.rotation.x = -Math.PI / 2;
          //  scene.add(ground);

            // --- Parking Spots (simplified) ---
        //    const parkingLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        //    for (let i = -2; i <= 2; i++) {
         //       for (let j = -2; j <= 2; j++) {
          //          // Lines to define spots
          //          const hLineGeometry = new THREE.BoxGeometry(4, 0.05, 0.1);
          //          const hLine = new THREE.Mesh(hLineGeometry, parkingLineMaterial);
          //          hLine.position.set(i * 5, 0.02, j * 5 - 2);
          //          scene.add(hLine);
          //          const hLine2 = new THREE.Mesh(hLineGeometry, parkingLineMaterial);
          //          hLine2.position.set(i * 5, 0.02, j * 5 + 2);
          //          scene.add(hLine2);

                    // Vertical lines (dividers)
                    const vLineGeometry = new THREE.BoxGeometry(0.1, 0.05, 4);
                    const vLine = new THREE.Mesh(vLineGeometry, parkingLineMaterial);
                    vLine.position.set(i * 5 - 2, 0.02, j * 5);
                    scene.add(vLine);
                }
            }

            // --- Parked Cars ---
            const carColors = [0x4169e1, 0x008080, 0x8b0000, 0xffd700, 0xffa500];
            const parkedCarGeometry = new THREE.BoxGeometry(1.5, 0.8, 3);
            for (let i = 0; i < 5; i++) { 
                const carMaterial = new THREE.MeshLambertMaterial({ color: carColors[i % carColors.length] });
                const parkedCar = new THREE.Mesh(parkedCarGeometry, carMaterial);
                parkedCar.position.set((i - 2) * 5, 0.4, 0);
                scene.add(parkedCar);
            }
            
            // --- Entry/Exit Lanes ---
            const laneMaterial = new THREE.MeshLambertMaterial({ color: 0x404040 });
            const laneGeometry = new THREE.BoxGeometry(4, 0.05, 10);
            const entryLane = new THREE.Mesh(laneGeometry, laneMaterial);
            entryLane.position.set(-10, 0.02, 0);
            scene.add(entryLane);
            const exitLane = new THREE.Mesh(laneGeometry, laneMaterial);
            exitLane.position.set(10, 0.02, 0);
            scene.add(exitLane);


            // --- Entry Barrier ---
            const barrierPoleGeometry = new THREE.BoxGeometry(0.1, 0.1, 3);
            const barrierPoleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            entryBarrier = new THREE.Mesh(barrierPoleGeometry, barrierPoleMaterial);
            entryBarrier.position.set(-10, 1, -1);
            entryBarrier.rotation.y = Math.PI / 2;
            scene.add(entryBarrier);

            // --- Exit Barrier ---
            exitBarrier = new THREE.Mesh(barrierPoleGeometry, barrierPoleMaterial);
            exitBarrier.position.set(10, 1, 1);
            exitBarrier.rotation.y = -Math.PI / 2;
            scene.add(exitBarrier);

            // --- Animated Cars ---
            const entryCarMaterial = new THREE.MeshLambertMaterial({ color: 0x1e90ff }); // Dodger Blue
            animatedCarEntry = new THREE.Mesh(parkedCarGeometry, entryCarMaterial);
            animatedCarEntry.position.set(-15, 0.4, -1);
            scene.add(animatedCarEntry);

            const exitCarMaterial = new THREE.MeshLambertMaterial({ color: 0xb22222 }); // Fire Brick
            animatedCarExit = new THREE.Mesh(parkedCarGeometry, exitCarMaterial);
            animatedCarExit.position.set(0, 0.4, 0); 
            animatedCarExit.visible = false;
            scene.add(animatedCarExit);

            // --- Lighting ---
         //   const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
         //   scene.add(ambientLight);
         //   const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
         //   directionalLight.position.set(5, 10, 7);
         //   scene.add(directionalLight);

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
        
     // --- 6. Initialization on Load ---

        document.addEventListener('DOMContentLoaded', () => {
            // Check local storage for theme preference or system preference
//            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
//            const currentTheme = localStorage.getItem('color-theme');
            
            // Default to system preference if no local storage preference is set
//            const isDark = currentTheme === 'dark' || (currentTheme === null && prefersDark);
            
            // Initialize 3D Hero
            try {
                initThree(); 
                // Set initial mode *after* initThree so Three.js globals are available
        //        setDarkMode(isDark); 
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
        
     
                animateThree(); 
            } catch (e) {
                console.error("Three.js initialization failed:", e);
                // Fallback UI in case of Three.js error
                document.getElementById('three-canvas').innerHTML = '<div class="absolute inset-0 bg-gray-900 flex items-center justify-center"><p class="text-white text-xl">3D Hero Loading Error</p></div>';
            }

            // Initialize default map view (center of Singapore)
//            initMap(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
        });

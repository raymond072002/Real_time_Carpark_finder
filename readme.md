# CARPARK LOCATOR 🚗

## Find Your Parking Lot

### Project Description
**CARPARK LOCATOR** is a web application designed to help users quickly find available parking lots. It provides a real-time map interface and a searchable table to explore all car park locations and their current availability. The application aims to offer a seamless experience for finding the nearest spot for your car.

### Features
The application includes the following core functionalities:

* **Real-time Car Park Location:** Find and view car park locations on an interactive map.
* **Nearest Locations List:** Displays the 5 nearest car parks to the user's current location (or a specified location).
* **Explore & Search:** A dedicated section to search and explore all car parks by their number or address in a paginated table view.
* **Nearby Amenities:** A dropdown menu provides quick links to find other nearby points of interest via Google Maps, including:
    * Petrol Stations
    * Convenience Stores
    * Washrooms
    * ATMs
    * Supermarkets
* **Car Care Section:** Links to external e-commerce platforms for car-related products like fragrances, cleaning supplies, and engine oils.
* **Theme Toggle:** Supports both light and dark modes for a comfortable viewing experience.
* **3D Hero Section:** A visually engaging hero section potentially utilizing 3D graphics (powered by Three.js).

### Technologies Used
This project is built using modern web technologies:

* **Frontend:** HTML5, CSS (specifically using **Tailwind CSS** for styling)
* **Mapping:** **Leaflet.js** for interactive map rendering
* **Data Handling:** **PapaParse** for fast in-browser parsing of data (likely a CSV or similar file containing car park data)
* **3D Graphics:** **Three.js** and **GLTFLoader.js** for the hero section's 3D visualization
* **Icons:** **Bootstrap Icons** and **Font Awesome**

### Installation and Setup

Since this is primarily a front-end application, setup is straightforward.

1.  **Clone the Repository:**
    ```bash
    git clone [Your Repository URL Here]
    cd carpark-locator
    ```

2.  **Ensure Dependencies (Assets):**
    Ensure the necessary assets and CSS files referenced in `index.html` are present in their correct paths:
    * `css/tailwind-build.css`
    * `css/index.css`
    * `assets/logo/logo2.png`
    * `assets/favicon/...`
    * `assets/images/aircare.jpg`, `carcare.jpg`, `engine.png`

    *(Note: The `index.html` file also implies the existence of a custom JavaScript file that handles the map logic, data fetching, search, and UI interactions, although it is not included here.)*

3.  **Run Locally:**
    Open the `index.html` file directly in your web browser. Due to same-origin policy restrictions for data fetching (e.g., PapaParse loading a data file), it is best to run it using a local development server (e.g., Live Server VS Code extension, Python's SimpleHTTPServer, or similar).

### Credits
* **Developer:** [raymond072002](https://github.com/raymond072002) (Inferred from the Open Graph URL in `index.html`)
* **External Content/Shop Links:** Lazada and Shopee

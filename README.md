# Trip Mileage Calculator V3

## What's new
- GPS coordinates are used directly; city/state/ZIP are not needed for current location.
- Pickup/drop-off accept full addresses, GPS coordinates, and many **full** Google Maps links.
- Paste buttons; home address and successful home coordinates are stored on your device.
- Installable Android PWA with Android Share Target support (after HTTPS deployment and installation).
- Three-leg OSRM road mileage and Google Maps navigation links.

## Test on your Mac
In Terminal: `cd ~/Desktop/UberMileageCalculator && python3 -m http.server 8000`
Open `http://localhost:8000`. The PWA install/share feature is intended for HTTPS deployment, not localhost.

## Install on Android (requires HTTPS hosting)
Upload the **contents** of this folder to a static HTTPS host such as GitHub Pages or Netlify. Open the hosted site in Chrome on Android. Use Chrome menu → Add to Home screen / Install app. After installation, try Google Maps → select a place → Share → Trip Mileage Calculator. Choose Pickup or Drop-off when it opens. Android may not list the app until it is installed and supported by the browser/OS.

**Important:** Google Maps short links (`maps.app.goo.gl`) cannot reliably be expanded from client-side JavaScript because of browser cross-origin restrictions. If a shared short link fails, open the place in Google Maps and copy its address or coordinates into the app. Google Maps sharing depends on the Android/Chrome version; it is not guaranteed for every place/link.

## Limitations
- The public Nominatim geocoder is for low-volume, manual use, **not autocomplete**. The public OSRM demo router is not production-grade. Respect usage limits; replace these endpoints with a hosted provider before frequent/commercial driving.
- Google Maps is opened for navigation; the app does **not** access Uber Driver data, Google Maps' internal state, or live traffic.
- An internet connection is required for distance calculation; GPS permission requires HTTPS (or localhost for local testing).
- Google Maps links may contain a place label instead of an exact street number. Verify results before relying on them.
- Don't operate the app while driving.

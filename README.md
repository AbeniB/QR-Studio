# QR Studio

A practical QR code generator using Node.js, Express, and `qr-image`.

## Features
- Responsive interface with an in-page QR preview
- Download generated codes as PNG
- QR types: website URL, plain text, Wi-Fi, phone number, email, and vCard contact
- Input validation and helpful error messages
- No database or account required

## Run locally
1. Install Node.js (LTS).
2. Open a terminal in this project folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm start
   ```
5. Open http://localhost:3000

## Project structure
- `server.js` — Express server and QR generation endpoint
- `index.html` — main page
- `public/app.js` — frontend interactions
- `public/styles.css` — styling

## Notes
- Wi-Fi QR codes contain the network name and, for secured networks, the password. Treat the generated code as sensitive.
- This version generates static QR codes. It does not save generated data or provide analytics.
- Always scan-test a QR code before printing it or using it at an event.

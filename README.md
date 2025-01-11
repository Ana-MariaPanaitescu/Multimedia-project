# Multimedia-project
**Personal Travel Diary Project**

## Introduction
The Personal Travel Diary is a web application designed to allow users to document their travels by marking visited locations on an interactive map and adding accompanying notes and photos. It combines geolocation technology, a customizable map interface, and an intuitive photo management system

## Key Features Implemented
- Geolocation Integration: Automatically captures the user's current location and displays it on the map with a custom marker icon
- Interactive Map: Utilizes Leaflet.js to create a dynamic map interface, allowing users to add and view travel locations
- Photo Upload and Display:
  - Drag-and-drop functionality for photo uploads
  - Resizing and positioning of photos on a canvas for a clean display
- Travel Days Management: Allows users to create and manage travel days with associated locations and details
- Location Details Modal: Displays location specific notes and photos in a modal window for detailed viewing
- Accordion UI for Day Details: Implements an accordion interface using Bootstrap to organize and display travel days and their respective locations

## Technologies and APIs Used
- HTML, CSS, JavaScript
- Bootstrap
- Canvas API
- Leaflet.js
- Geolocation API

## Implementation Details
- Custom Map Marker: Designed a unique marker icon resembling a balloon to denote the user's current location
- LocalStorage Usage:
  - Saved user input and uploaded photos locally to ensure persistent data across sessions
  - Managed storage and retrieval of travel days and location details
- Photo Canvas Management:
  - Dynamically rendered photos with adjusted dimensions to fit within the canvas
  - Supported multiple photo uploads and organize them 
- Responsive Design

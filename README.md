# The Spotter – Human-in-the-Loop Annotation Tool

## Overview
Full-stack pedestrian annotation system for generating high-quality training data for computer vision models.

## Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: SQLite
- Authentication: JWT Role-Based Access

## Features
- Annotator workspace with interactive bounding box drawing
- Coordinate transformation logic (display → original pixel space)
- Image lifecycle state management
- Admin dashboard for label review and quality control
- Role-based access protection

## Architecture
Frontend handles drawing and UI scaling.
Backend enforces role permissions and stores labels in original resolution for ML training integrity.

## How to Run

### Backend
cd server
npm install
npm run dev

### Frontend
cd client
npm install
npm run dev
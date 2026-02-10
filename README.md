# Family Financial App

## Prerequisites
- Node.js installed

## Running the Application

### Option 1: Unified Start (Recommended)
This command starts both the backend server and the React frontend concurrently.

1. Open a terminal in the project root (`d:\code\family-financial-`).
2. Run:
   ```bash
   npm start
   ```
   - backend runs on http://localhost:8000
   - frontend runs on http://localhost:3000

### Option 2: Separate Processes
If you prefer running backend and frontend in separate terminals:

**Backend:**
1. Open a terminal in the project root.
2. Run:
   ```bash
   node server.js
   ```

**Frontend:**
1. Open a new terminal.
2. Navigate to the frontend directory:
   ```bash
   cd react-frontend
   ```
3. Run:
   ```bash
   npm start
   ```

## troubleshooting
- **Port Conflicts**: If you see errors about ports 3000 or 8000 being in use, ensure you stop all running node processes before starting.
- **CORS**: The backend is configured to allow requests from http://localhost:3000.

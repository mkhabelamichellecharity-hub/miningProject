# Mining Tracking System - Firebase Setup Guide

This guide provides step-by-step instructions to set up Firebase Realtime Database as the database for the Mining Tracking System backend, replacing MongoDB.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Google account for Firebase Console access

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click "Create a project" or "Add project".
3. Enter your project name (e.g., "mining-tracking-system").
4. Choose whether to enable Google Analytics (optional).
5. Click "Create project" and wait for it to be ready.

## Step 2: Enable Firestore Database

1. In your Firebase project dashboard, click on "Firestore Database" in the left sidebar.
2. Click "Create database".
3. Choose "Start in test mode" for development (you can change security rules later).
4. Select a location for your database (choose the one closest to your users).
5. Click "Done".

## Step 3: Set Up Service Account for Backend Authentication

1. In the Firebase Console, go to "Project settings" (gear icon).
2. Click on the "Service accounts" tab.
3. Click "Generate new private key".
4. Download the JSON file containing your service account credentials.
5. **Important:** Keep this file secure and never commit it to version control.

## Step 4: Configure Environment Variables

1. In your backend directory (`backend/`), create or update the `.env` file.
2. Add the following environment variables:

```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}  # Paste the entire JSON content from the downloaded file
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com

# Remove MongoDB URI if present 
# MONGO_URI=...

PORT=5000
```

**Security Note:** Instead of pasting the entire JSON, you can set `FIREBASE_SERVICE_ACCOUNT` to the path to the JSON file if preferred, but the code expects the JSON content directly.

## Step 5: Install Dependencies

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install the required packages:
   ```bash
   npm install
   ```

   This will install `firebase-admin` and other dependencies.

## Step 6: Run the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. The server should start on `http://localhost:5000` and connect to Firebase Realtime Database.

3. Test the connection by visiting `http://localhost:5000` in your browser. You should see a success message indicating Firebase is connected.

## Step 7: Verify Data Operations

1. Use tools like Postman or curl to test API endpoints.
2. For example, create a worker:
   ```bash
   curl -X POST http://localhost:5000/api/workers/checkin \
     -H "Content-Type: application/json" \
     -d '{"name":"John Doe","workerId":"JD001","location":"Surface"}'
   ```

3. Check Firebase Console > Firestore Database to see the data being stored.

## Troubleshooting

### Common Issues

1. **"FIREBASE_SERVICE_ACCOUNT is not defined"**
   - Ensure the `.env` file is in the `backend/` directory.
   - Check that the JSON format is correct (no extra quotes or escaping issues).

2. **"Firebase initialization error"**
   - Verify your service account JSON is valid.
   - Ensure the project ID in the JSON matches your Firebase project.

3. **Permission denied errors**
   - Check that Firestore security rules allow the operations you're trying to perform.
   - For development, you can use test mode rules.

4. **Port already in use**
   - Change the PORT in `.env` or kill the process using that port.

### Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Next Steps

Once Firebase is connected, you can:
- Deploy the backend to a cloud service like Heroku or Google Cloud.
- Set up proper security rules for production.
- Integrate with the frontend application.

For frontend setup, refer to the frontend README or package.json scripts.
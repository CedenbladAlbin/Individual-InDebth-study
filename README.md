# Individual-InDebth-study
DM helper to run and track sessions
To replicate this project, the following core technologies and tools are required:

1. Framework
SvelteKit: A modern framework for building both frontend and backend logic in a unified application. It supports server-side rendering, file-based routing, and TypeScript integration.

2. Authentication
@auth/sveltekit: Handles OAuth authentication.
External OAuth providers: GitHub and Google. You must register your app with each provider to obtain client IDs and client secrets.

3. Database
MongoDB: Stores all game data including players, NPCs, items, scenes, and sessions.
Can use MongoDB Atlas (cloud) or a local MongoDB server.

4. Image/File Uploads
Handled with native SvelteKit endpoints. Images can be stored either in the database as base64 strings or on the file system.

5. Frontend Libraries/Modules
Svelte (core UI library)
No additional UI frameworks are required; custom CSS handles the styling.

6. Environment Variables
Used for secrets, database connection strings, and OAuth credentials.

7. External APIs/Services
GitHub OAuth API
Google OAuth API
MongoDB Atlas 
These technologies are essential for authentication, data storage, and interactive campaign management features of the DnD DM game tracker.
Setting Up Your Development Environment

Step 1: Install Node.js on your device
SvelteKit requires Node.js (version 18 or newer).
Go to Node.js official website
 and download the LTS version.

Install Node.js, which automatically installs NPM.
Verify installation by running in your terminal:

node -v
npm -v

Step 2: Get SvelteKit Running
Open a terminal and navigate into your project:
cd my-app

Install dependencies:
npm install
npm intall svelte

Run the dev server:
npm run dev

You should now see a running SvelteKit app at http://localhost:5173.

Step 3: Set Up Your .env File

The .env file stores your environment variables securely.

In the project root(my-app), create a file named .env.

Add your variables with the VITE_ prefix (required by Vite):

VITE_MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
VITE_MONGODB_DB=rpg-manager
VITE_AUTH_SECRET=random_secret_string

step 4: Set Up Your Database 

Set up a mongodb account at:
  https://www.mongodb.com/cloud/atlas/register
Create a Cluster
Click “Clusters” in the dashboard.
Click “Build a Cluster”.
Choose “Free Cluster” (this is enough for development).

Create a Database
In your cluster, click “Collections”.
Click “Create Database”.
  Use “MongoDB for vs Code”
Copy your connection string and put in your .env at
	VITE_MONGODB_URI=
Now the db collections will be created while the app is used

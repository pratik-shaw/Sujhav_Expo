# Backend API for Sujhav Expo

This is the backend API for the Sujhav Expo application. It is a Node.js application built with Express.js and MongoDB.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have Node.js and npm installed on your machine.

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

You also need to have a MongoDB instance running. You can either install it locally or use a cloud service like MongoDB Atlas.

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/your_username_/your_project.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Create a `.env` file by copying the `.env.example` file.
   ```sh
   cp .env.example .env
   ```
4. Update the `.env` file with your environment variables.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

- `MONGO_HOST`: The hostname of your MongoDB instance. Default is `mongodb`.
- `MONGO_PORT`: The port of your MongoDB instance. Default is `27017`.
- `MONGO_INITDB_ROOT_USERNAME`: The username for your MongoDB instance.
- `MONGO_INITDB_ROOT_PASSWORD`: The password for your MongoDB instance.
- `MONGO_DB_NAME`: The name of the database to use.
- `PORT`: The port to run the server on. Default is `5000`.
- `JWT_SECRET`: A secret key for signing JWT tokens.
- `RAZORPAY_KEY_ID`: Your Razorpay key ID.
- `RAZORPAY_KEY_SECRET`: Your Razorpay key secret.
- `NODE_ENV`: The node environment. Set to `development` for development.
- `UPLOADS_PATH`: Path for static File upload Volume (Used By Docker)
- `MONGO_DATA_PATH`: Path for presistent Mongodb data volume (Used By Docker)

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the production mode.

### `npm run dev`

Runs the app in the development mode.
The server will reload if you make edits.

## API Endpoints

The following are the API endpoints available:

- `/api/auth`: Authentication routes
- `/api/unpaidCourses`: Unpaid course routes
- `/api/paidCourses`: Paid course routes
- `/api/paidNotes`: Paid notes routes
- `/api/unpaidNotes`: Unpaid notes routes
- `/api/paidMaterials`: Paid materials routes
- `/api/enrollment`: Enrollment routes
- `/api/purchasedNotes`: Purchased notes routes
- `/api/dpp`: DPP routes
- `/api/batches`: Batch routes
- `/api/tests`: Test routes
- `/api/calendar`: Event routes
- `/api/attendance`: Attendance routes
- `/api/students`: Student routes
- `/api/health`: Health check

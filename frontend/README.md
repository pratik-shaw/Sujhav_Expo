# Sujhav Expo Frontend

This is the frontend for the Sujhav Expo application, built with React Native and Expo.

## Installation

1.  Clone the repository.
2.  Install the dependencies using npm:
    ```bash
    npm install
    ```

## Running the application

To start the development server, run:

```bash
npm start
```

This will open the Expo developer tools in your browser. You can then run the app on a physical device using the Expo Go app or in an emulator.

## Configuration

You need to create a `config/api.ts` file. This file should export the base URL of your backend API.

**Example `config/api.ts`:**

```typescript
export const API_BASE_URL = "http://192.168.0.4:5000/api";
export const API_BASE = "http://192.168.0.4:5000/api";
export const API_TIMEOUT = 10000; 
```

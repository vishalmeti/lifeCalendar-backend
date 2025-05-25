# LifeCalendar Backend

A backend API service for the LifeCalendar application, designed to help users track their daily activities, meetings, tasks, journal entries, and moods. The system generates AI-powered summaries of daily entries to provide meaningful insights.

## Features

- **User Authentication**: Secure registration and login with JWT authentication
- **Daily Entries Management**: Create, read, update, and delete daily activity entries
- **AI-Powered Summaries**: Automatic generation of comprehensive summaries for each day's activities using Google's Generative AI (Gemini)
- **RESTful API**: Well-structured API endpoints for seamless frontend integration
- **API Documentation**: Interactive Swagger documentation

## Tech Stack

- **Node.js & Express**: For the server and API framework
- **MongoDB & Mongoose**: For the database and object modeling
- **JWT**: For secure authentication
- **Google Generative AI (Gemini)**: For generating intelligent summaries
- **Swagger**: For API documentation

## Prerequisites

- Node.js (v14+)
- MongoDB database
- Google Generative AI API key

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/lifeCalendar-backend.git
cd lifeCalendar-backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3000
MONGODB_CONNECTION_STRING=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

Once the server is running, you can access the Swagger documentation at:
```
http://localhost:3000/api/v1/api-docs
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register`: Register a new user
- `POST /api/v1/auth/login`: Login a user
- `GET /api/v1/auth/me`: Get current user profile (protected)

### Daily Entries
- `POST /api/v1/entries`: Create a new daily entry (protected)
- `GET /api/v1/entries`: Get all entries for the user (protected)
- `GET /api/v1/entries/:id`: Get a specific entry by ID (protected)
- `PUT /api/v1/entries/:id`: Update an entry (protected)
- `PATCH /api/v1/entries/:id`: Partially update an entry (protected)
- `DELETE /api/v1/entries/:id`: Delete an entry (protected)
- `GET /api/v1/entries/:id/generate-summary`: Generate a new AI summary for an entry (protected)

## Data Models

### User
- Username, email, password (hashed)

### Daily Entry
- Date, mood, journal notes, meetings, tasks

### Summary
- AI-generated summary text linked to a daily entry

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
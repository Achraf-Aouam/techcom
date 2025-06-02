# SAO Club Manager Backend

A FastAPI-based backend application for managing student clubs, events, and memberships.

## Overview

This backend provides a robust API for managing student clubs, their events, and member interactions. It's built using FastAPI and SQLAlchemy, with JWT-based authentication.

## Features

- **Authentication System**

  - JWT-based authentication
  - Login using either email or student ID
  - Role-based access control
  - Secure password hashing

- **User Management**

  - Student profiles with unique student IDs
  - Email notifications preferences
  - Role-based permissions (Admin, Staff, Student)

- **Club Management**

  - Create and manage clubs
  - Club member management with different roles
  - Club-specific events
  - Club customization (name, description, image, color code)

- **Event Management**
  - Create and manage events
  - Event attendance tracking
  - Event status management
  - Location and timing details

## API Structure

The API is organized into the following main endpoints:

- `/api/v1/auth` - Authentication endpoints
- `/api/v1/users` - User management
- `/api/v1/clubs` - Club operations
- `/api/v1/events` - Event management

## Database Models

### User

- Student ID (unique)
- Name
- Email (unique)
- Hashed password
- Role (Admin/Staff/Student)
- Email notification preferences

### Club

- Name
- Description
- Image URL
- Color code
- Active status
- Member relationships
- Event relationships

### Event

- Name
- Description
- Location
- Status
- Image URL
- Start/End times
- Club association
- Attendee tracking

## Authentication

The system uses JWT (JSON Web Tokens) for authentication:

1. Users can login using either their email or student ID
2. Upon successful authentication, a JWT token is issued
3. The token contains user information and roles
4. Token expiration is configurable (default: 30 minutes)

## Getting Started

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up the database:

```bash
# The database will be automatically created when the application starts
```

3. Run the application:

```bash
uvicorn app.main:app --reload
```

4. Access the API documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Security Features

- Password hashing using secure algorithms
- JWT token-based authentication
- CORS middleware for secure cross-origin requests
- Role-based access control
- Input validation using Pydantic schemas

## Development

The project follows a modular structure:

- `app/api/` - API routes and endpoints
- `app/core/` - Core functionality and security
- `app/model/` - Database models
- `app/schema/` - Pydantic schemas for request/response validation

## API Documentation

Detailed API documentation is available at `/docs` when running the server. The documentation includes:

- All available endpoints
- Request/response schemas
- Authentication requirements
- Example requests and responses

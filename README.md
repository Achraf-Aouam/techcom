# SAO Club Manager

A comprehensive web application for managing student clubs, events, and memberships. This project consists of a modern Next.js frontend and a robust FastAPI backend.

> **Note**: This is a work in progress. The project is currently being enhanced with facial recognition capabilities for attendance tracking.

## Project Overview

The SAO Club Manager is designed to streamline the management of student clubs and their activities. It provides a complete solution for club administrators, staff, and students to manage clubs, events, and memberships efficiently.

## System Architecture

The project is divided into two main components:

### Frontend (`/frontend`)

- Built with Next.js and TypeScript
- Modern UI using Tailwind CSS and Radix UI
- State management with Zustand
- Form handling with React Hook Form and Zod
- [Detailed Frontend Documentation](./frontend/README.md)

### Backend (`/backend`)

- FastAPI-based REST API
- SQLAlchemy ORM for database management
- JWT authentication
- Role-based access control
- [Detailed Backend Documentation](./backend/README.md)

## Features

- **User Management**

  - Student profiles with unique IDs
  - Role-based access (Admin, Staff, Student)
  - Email notification preferences

- **Club Management**

  - Club creation and customization
  - Member management
  - Club-specific events
  - Club profile customization

- **Event Management**

  - Event creation and scheduling
  - Attendance tracking
  - Location and timing management
  - Event status updates

- **Security**
  - JWT-based authentication
  - Secure password hashing
  - Role-based access control
  - Input validation

## Upcoming Features

### Facial Recognition Integration

- Facial recognition-based attendance tracking
- Integration with existing `facial_recon` FastAPI backend
- PostgreSQL pgvector extension for efficient face embedding storage
- Real-time attendance verification
- Face embedding management and updates

> **Note**: The facial recognition system has been successfully implemented in a separate repository (`facial_recon`) and is currently being integrated into this project. The integration requires adding PostgreSQL pgvector extension support to the main project.

## Getting Started

### Prerequisites

- Python 3.8+ (for backend)
- Node.js 18+ (for frontend)
- PostgreSQL with pgvector extension (for database)
- OpenCV and face recognition libraries (for facial recognition)

### Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd sao-club-manager
```

2. Set up the backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up the frontend:

```bash
cd frontend
npm install
```

### Running the Application

1. Start the backend server:

```bash
cd backend
uvicorn app.main:app --reload
```

2. Start the frontend development server:

```bash
cd frontend
npm run dev
```

3. Access the application:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Code Style

- Frontend: ESLint and TypeScript configurations
- Backend: PEP 8 style guide
- Both: Pre-commit hooks for code quality

### Testing

- Frontend: Jest and React Testing Library
- Backend: Pytest
- API: Postman/Insomnia collections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Add your license information here]

## Support

For support, please [add contact information or support channels]

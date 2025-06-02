# SAO Club Manager Frontend

A modern, responsive web application built with Next.js for managing student clubs, events, and memberships.

## Overview

This frontend application provides an intuitive user interface for the SAO Club Manager system. Built with Next.js and TypeScript, it offers a seamless experience for managing student clubs, events, and member interactions.

## Features

- **Modern UI/UX**

  - Responsive design using Tailwind CSS
  - Dark/Light mode support
  - Smooth animations and transitions
  - Accessible components using Radix UI

- **Authentication**

  - Secure login system
  - JWT token management
  - Protected routes
  - Role-based access control

- **Club Management**

  - Club creation and editing
  - Member management interface
  - Club event scheduling
  - Club profile customization

- **Event Management**
  - Event creation and management
  - Attendance tracking
  - Event status updates
  - Location and timing management

## Tech Stack

- **Framework**: Next.js 15.3.3
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI
- **Notifications**: Sonner
- **Table Management**: TanStack Table

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Start production server:

```bash
npm start
```

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable UI components
- `/contexts` - React context providers
- `/lib` - Utility functions and configurations
- `/public` - Static assets

## Development

The project uses several development tools:

- ESLint for code linting
- TypeScript for type safety
- Tailwind CSS for styling
- Turbopack for fast development builds

## API Integration

The frontend integrates with the SAO Club Manager Backend API. API documentation is available in:

- `OpenAPI_docs.json` - Full API specification
- `openapidocs.txt` - Human-readable API documentation

## Contributing

1. Follow the TypeScript and ESLint configurations
2. Use the provided component library
3. Maintain consistent styling with Tailwind CSS
4. Write meaningful commit messages

## Security

- JWT token management
- Secure API communication
- Protected routes
- Input validation using Zod

# API Route Specifications

This document outlines the API routes for the TechCom backend application.

## Authentication

### 1. Login for Access Token

- **Endpoint:** `POST /token`
- **Description:** Authenticates a user and returns an access token.
- **Request Body:** `application/x-www-form-urlencoded` with `username` (student_id or email) and `password`.
- **Response Body:** `{ "access_token": "string", "token_type": "bearer" }`
- **Permissions:** Public

## Users

### 1. Create User

- **Endpoint:** `POST /users/`
- **Description:** Creates a new user. Typically for registration.
- **Request Body:** `UserCreate` schema.
- **Response Body:** `UserInDb` schema.
- **Permissions:** Public (for self-registration) or Admin.

### 2. Get Current User

- **Endpoint:** `GET /users/me`
- **Description:** Retrieves the details of the currently authenticated user.
- **Response Body:** `UserInDb` schema.
- **Permissions:** Authenticated User.

### 3. Update Current User

- **Endpoint:** `PUT /users/me`
- **Description:** Updates the details of the currently authenticated user.
- **Request Body:** `UserUpdate` schema.
- **Response Body:** `UserInDb` schema.
- **Permissions:** Authenticated User (self).

### 4. Get User by ID

- **Endpoint:** `GET /users/{user_id}`
- **Description:** Retrieves the details of a specific user by their ID.
- **Response Body:** `UserInDb` schema.
- **Permissions:** Admin, or self.

### 5. Update User by ID (Admin)

- **Endpoint:** `PUT /users/{user_id}`
- **Description:** Updates the details of a specific user.
- **Request Body:** `UserUpdate` schema.
- **Response Body:** `UserInDb` schema.
- **Permissions:** Admin.

### 6. Delete User by ID (Admin)

- **Endpoint:** `DELETE /users/{user_id}`
- **Description:** Deletes a specific user.
- **Response Body:** Success message.
- **Permissions:** Admin.

### 7. Get All Users (Admin)

- **Endpoint:** `GET /users/`
- **Description:** Retrieves a list of all users.
- **Query Parameters:** `skip: int = 0`, `limit: int = 100`
- **Response Body:** `List[UserInDb]` schema.
- **Permissions:** Admin.

## Clubs

### 1. Create Club

- **Endpoint:** `POST /clubs/`
- **Description:** Creates a new club.
- **Request Body:** `ClubCreate` schema (Note: `ClubCreate` is currently empty in `club.py`, it should likely be `ClubBase` or similar).
- **Response Body:** `ClubInDb` schema.
- **Permissions:** Authenticated User (e.g., Admin, or specific roles).

### 2. Get All Clubs

- **Endpoint:** `GET /clubs/`
- **Description:** Retrieves a list of all clubs.
- **Query Parameters:** `skip: int = 0`, `limit: int = 100`, `active_only: bool = True`
- **Response Body:** `List[ClubInDb]` schema.
- **Permissions:** Public or Authenticated User.

### 3. Get Club by ID

- **Endpoint:** `GET /clubs/{club_id}`
- **Description:** Retrieves the details of a specific club by its ID.
- **Response Body:** `ClubInDb` schema.
- **Permissions:** Public or Authenticated User.

### 4. Update Club by ID

- **Endpoint:** `PUT /clubs/{club_id}`
- **Description:** Updates the details of a specific club.
- **Request Body:** `ClubUpdate` schema.
- **Response Body:** `ClubInDb` schema.
- **Permissions:** Admin or Club Owner/Admin.

### 5. Delete Club by ID

- **Endpoint:** `DELETE /clubs/{club_id}`
- **Description:** Deletes a specific club.
- **Response Body:** Success message.
- **Permissions:** Admin or Club Owner/Admin.

## Events

### 1. Create Event

- **Endpoint:** `POST /events/`
- **Description:** Creates a new event. The `club_id` in the `EventCreate` schema will associate it with a club.
- **Request Body:** `EventCreate` schema.
- **Response Body:** `EventInDb` schema.
- **Permissions:** Authenticated User (e.g., Club Admin/Owner).

### 2. Get All Events

- **Endpoint:** `GET /events/`
- **Description:** Retrieves a list of all events.
- **Query Parameters:** `skip: int = 0`, `limit: int = 100`, `status: Optional[EventStatusType] = None`, `club_id: Optional[int] = None`
- **Response Body:** `List[EventInDb]` schema.
- **Permissions:** Public or Authenticated User.

### 3. Get Event by ID

- **Endpoint:** `GET /events/{event_id}`
- **Description:** Retrieves the details of a specific event by its ID.
- **Response Body:** `EventInDb` schema.
- **Permissions:** Public or Authenticated User.

### 4. Update Event by ID

- **Endpoint:** `PUT /events/{event_id}`
- **Description:** Updates the details of a specific event.
- **Request Body:** `EventUpdate` schema.
- **Response Body:** `EventInDb` schema.
- **Permissions:** Club Admin/Owner or Event Creator.

### 5. Delete Event by ID

- **Endpoint:** `DELETE /events/{event_id}`
- **Description:** Deletes a specific event.
- **Response Body:** Success message.
- **Permissions:** Club Admin/Owner or Event Creator.

### 6. Get Events by Club ID

- **Endpoint:** `GET /clubs/{club_id}/events`
- **Description:** Retrieves all events associated with a specific club.
- **Query Parameters:** `skip: int = 0`, `limit: int = 100`, `status: Optional[EventStatusType] = None`
- **Response Body:** `List[EventInDb]` schema.
- **Permissions:** Public or Authenticated User.

## Club Memberships

### 1. Add Member to Club

- **Endpoint:** `POST /clubs/{club_id}/members/{user_id}`
- **Description:** Adds a user as a member to a specific club.
- **Request Body:** (Optional) `{ "role_in_club": ClubMemberRoleType }` (default to MEMBER)
- **Response Body:** Success message or updated membership details.
- **Permissions:** Club Admin/Owner, or User (request to join, then approved by admin).

### 2. Get Club Members

- **Endpoint:** `GET /clubs/{club_id}/members`
- **Description:** Retrieves a list of members for a specific club.
- **Response Body:** `List[UserInDb]` (potentially with their role in the club).
- **Permissions:** Club Member or Admin.

### 3. Update Member's Role in Club

- **Endpoint:** `PUT /clubs/{club_id}/members/{user_id}`
- **Description:** Updates the role of a member within a club.
- **Request Body:** `{ "role_in_club": ClubMemberRoleType }`
- **Response Body:** Success message or updated membership details.
- **Permissions:** Club Admin/Owner.

### 4. Remove Member from Club

- **Endpoint:** `DELETE /clubs/{club_id}/members/{user_id}`
- **Description:** Removes a user from a club.
- **Response Body:** Success message.
- **Permissions:** Club Admin/Owner, or User (to leave club).

### 5. Get Clubs for a User

- **Endpoint:** `GET /users/{user_id}/clubs`
- **Description:** Retrieves a list of clubs a specific user is a member of.
- **Response Body:** `List[ClubInDb]` (potentially with their role in each club).
- **Permissions:** Authenticated User (self) or Admin.

## Event Attendance

### 1. Register User for Event

- **Endpoint:** `POST /events/{event_id}/attendees/{user_id}`
- **Description:** Registers a user for a specific event.
- **Response Body:** Success message or attendance record.
- **Permissions:** Authenticated User (self-registration), or Club/Event Admin.

### 2. Get Event Attendees

- **Endpoint:** `GET /events/{event_id}/attendees`
- **Description:** Retrieves a list of users attending a specific event.
- **Response Body:** `List[UserInDb]`.
- **Permissions:** Club/Event Admin or event attendees (depending on privacy settings).

### 3. Unregister User from Event

- **Endpoint:** `DELETE /events/{event_id}/attendees/{user_id}`
- **Description:** Unregisters a user from a specific event.
- **Response Body:** Success message.
- **Permissions:** Authenticated User (self-unregistration), or Club/Event Admin.

### 4. Get Events Attended by User

- **Endpoint:** `GET /users/{user_id}/events/attended`
- **Description:** Retrieves a list of events a specific user is attending or has attended.
- **Response Body:** `List[EventInDb]`.
- **Permissions:** Authenticated User (self) or Admin.

---

**Note on Permissions:**

- "Admin" refers to a user with `UserRoleType.ADMIN`.
- "Club Admin/Owner" refers to a user who has a role like `ClubMemberRoleType.ADMIN` or `ClubMemberRoleType.OWNER` in that specific club.
- "Authenticated User" means any logged-in user.
- Specific role-based access control (RBAC) will need to be implemented for these permissions.

**Note on Schemas:**

- The `ClubCreate` schema in `app/schema/club.py` is currently `pass`. It should likely inherit from `ClubBase` or define the fields necessary for club creation.
- Consider adding response schemas for membership and attendance that include role or status information (e.g., `ClubMembershipWithUser`, `EventAttendanceWithUser`).

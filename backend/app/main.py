from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from app.api.routers import auth  # Import the auth router
# If you create other routers (e.g., for users, clubs, events), import them here
# from app.api.routers import users, clubs, events


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SAO club manager",  # Corrected: comma added
    description="app for managing clubs"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the authentication router
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Example for other routers (uncomment and adjust as you build them)
# app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
# app.include_router(clubs.router, prefix="/api/v1/clubs", tags=["Clubs"])
# app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])


@app.get("/")
def read_root():
    return {
        "message": "welcome to the club management app backend",
        "documentation": "/docs",
    }
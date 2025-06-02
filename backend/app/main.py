from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine
from app.api.routers import auth, user, club, event 



Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SAO club manager",  
    description="app for managing clubs"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(user.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(club.router, prefix="/api/v1/clubs", tags=["Clubs"])
app.include_router(event.router, prefix="/api/v1/events", tags=["Events"])


@app.get("/")
def read_root():
    return {
        "message": "welcome to the club management app backend",
        "documentation": "/docs",
    }
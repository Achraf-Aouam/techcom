from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

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
@app.middleware("http")
async def log_request_body(request: Request, call_next):
    body = await request.body()
    print("Raw request body:", body.decode())
    response = await call_next(request)
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("Validation error:", exc.errors())
    print("Request body (for validation error):", await request.body())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
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
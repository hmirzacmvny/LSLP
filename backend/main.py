from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import properties, visits, outreach, submissions, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LSLP API",
    description="Lead Service Line Inventory Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])
app.include_router(visits.router, prefix="/api/visits", tags=["Visits"])
app.include_router(outreach.router, prefix="/api/outreach", tags=["Outreach"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"status": "LSLP API is running"}
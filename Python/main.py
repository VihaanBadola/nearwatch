from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from Horizons import get_earth_state

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"message": "OrbitForge backend is running"}


@app.get("/earth")
def earth():
    return get_earth_state()

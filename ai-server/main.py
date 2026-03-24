from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import training, evaluation, optimization

app = FastAPI(title="FlowMind AI Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(training.router)
app.include_router(evaluation.router)
app.include_router(optimization.router)


@app.get("/health")
def health():
    return {"status": "ok"}

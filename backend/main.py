from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agent import get_agent_response

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/process-video")
async def process_video(data: dict):
    # TODO: Implement actual video processing logic
    # For now, just return a dummy response from the agent
    prompt = data.get("prompt", "Describe this video")
    response = get_agent_response(prompt)
    return {"response": response}

from fastapi import APIRouter

some_router = APIRouter()


@some_router.get("/hello")
async def hello():
    return {"message": "Hello from router!"}

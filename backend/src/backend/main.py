import cv2
import numpy as np
from ultralytics import YOLO
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from djitellopy import Tello
import base64
import time
from drone_agent import drone_agent, DroneData, DroneStatus, DetectedObject, DeployCommand, MoveCommand, DroneList
from uagents import Context

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

torch.cuda.set_device(0)  # Set to your desired GPU number

model = YOLO('yolov8x.pt')

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                data = await websocket.receive_json()
                event = data["event"]

                if event == "GET_DRONES":
                    ctx = Context()
                    response = await ctx.send(drone_agent.address, DroneList(drones=[]))
                    if isinstance(response, DroneList):
                        await websocket.send_json({
                            "event": "DRONE_LIST",
                            "drones": [drone.dict() for drone in response.drones]
                        })
                    else:
                        print(f"Unexpected response: {response}")
                elif event == "DEPLOY":
                    await drone_agent.send(drone_agent.address, DeployCommand(command="takeoff"))
                elif event == "MOVE":
                    x, y, z, yaw = data.get("x", 0), data.get("y", 0), data.get("z", 0), data.get("yaw", 0)
                    await drone_agent.send(drone_agent.address, MoveCommand(x=x, y=y, z=z, yaw=yaw))

                drone_data = drone_agent.storage.get("drone_data")
                if isinstance(drone_data, DroneData):
                    await websocket.send_json({
                        "detected_objects": [obj.dict() for obj in drone_data.detected_objects],
                        "frame": drone_data.frame,
                        "droneStatus": drone_data.drone_status.dict()
                    })
            except asyncio.TimeoutError:
                pass
            
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print("WebSocket disconnected")

if __name__ == "__main__":
    import uvicorn
    drone_agent.run()
    uvicorn.run(app, host="0.0.0.0", port=8000)

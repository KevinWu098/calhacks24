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
from drone_agent import drone_agent, DroneData, DroneStatus, DetectedPerson, DeployCommand, MoveCommand, DroneList
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

model = YOLO('yolo11x.pt')

tello = None

def connect_to_drone():
    global tello
    tello = Tello()
    tello.connect()
    tello.streamon()
    
    time.sleep(4)
    
    tello.takeoff()

    tello.move_forward(200)

    # circle()

    tello.send_rc_control(0,0,0,0)  
    time.sleep(0.1)
    # Turns motors on:
    tello.send_rc_control(-100,-100,-100,100)
    time.sleep(2)
    tello.send_rc_control(0,10,20,0)
    time.sleep(3)
    tello.send_rc_control(0,0,0,0)
    time.sleep(2)

    v_up = 0
    for _ in range(4):
        tello.send_rc_control(40, -5, v_up, -35)
        time.sleep(4)
        tello.send_rc_control(0,0,0,0)
        time.sleep(0.5)

    tello.land()
    

def disconnect_from_drone():
    global tello
    if tello:
        tello.streamoff()
        tello.end()
        tello = None

def detect_objects(frame):
    results = model(frame)
    persons = []

    for r in results:
        boxes = r.boxes
        for box in boxes:
            cls = int(box.cls)
            class_name = model.names[cls]
            if class_name == "person":
                conf = float(box.conf)
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                persons.append(DetectedPerson(
                    confidence=conf,
                    bbox=[x1, y1, x2, y2]
                ))
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    return frame, persons

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                data = await websocket.receive_json()
                event = data["event"]

                if event == "GET_DRONES":
                    # Create a new context for this request
                    ctx = Context()
                    # Send a message to the drone agent and wait for a response
                    response = await ctx.send(drone_agent.address, DroneList(drones=[]))
                    # Check if we received a DroneList response
                    if isinstance(response, DroneList):
                        await websocket.send_json({
                            "event": "DRONE_LIST",
                            "drones": [drone.dict() for drone in response.drones]
                        })
                    else:
                        print(f"Unexpected response: {response}")
                elif event == "DEPLOY":
                    await drone_agent.send("self", DeployCommand(command="takeoff"))
                elif event == "MOVE":
                    x, y, z, yaw = data.get("x", 0), data.get("y", 0), data.get("z", 0), data.get("yaw", 0)
                    await drone_agent.send("self", MoveCommand(x=x, y=y, z=z, yaw=yaw))

                drone_data = drone_agent.storage.get("drone_data")
                if isinstance(drone_data, DroneData):
                    await websocket.send_json({
                        "persons": [p.dict() for p in drone_data.persons],
                        "frame": drone_data.frame,
                        "droneStatus": drone_data.drone_status.dict()
                    })
            except asyncio.TimeoutError:
                pass
            
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    finally:
        disconnect_from_drone()

if __name__ == "__main__":
    import uvicorn
    drone_agent.run()
    uvicorn.run(app, host="0.0.0.0", port=8000)

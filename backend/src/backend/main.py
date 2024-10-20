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
                persons.append({
                    "confidence": conf,
                    "bbox": [x1, y1, x2, y2]
                })
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    return frame, persons

async def process_video_stream(websocket: WebSocket):
    global tello
    frame_read = tello.get_frame_read()
    last_battery_update = 0
  
    try:
        while True:
            try:
                data = await websocket.receive_json()
                event = data["event"]

                if event == "DEPLOY":
                    # ! Do something here
                    
                    tello.takeoff()
                    pass

            except asyncio.TimeoutError:
                pass  # No message received, continue
            
            frame = cv2.cvtColor(frame_read.frame, cv2.COLOR_RGB2BGR)
            if frame is None:
                continue
            
            processed_frame, persons = detect_objects(frame)
            
            # Encode the frame as base64
            _, buffer = cv2.imencode('.jpg', processed_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            # Get drone connection status and battery level
            drone_connected = tello.stream_on
            battery_level = tello.get_battery()

            await websocket.send_json({
                "persons": persons,
                "frame": jpg_as_text,
                "droneStatus": {
                    "name": "Drone 1",
                    "isConnected": drone_connected,
                    "batteryLevel": battery_level
                }
            })
            await asyncio.sleep(0.1)  # Adjust this value to control the update frequency
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    finally:
        disconnect_from_drone()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connect_to_drone()
    await process_video_stream(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

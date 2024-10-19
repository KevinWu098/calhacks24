import cv2
import numpy as np
from ultralytics import YOLO
import torch
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from djitellopy import Tello
import base64

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

tello = Tello()
tello.connect()
tello.streamon()

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
    frame_read = tello.get_frame_read()
    
    try:
        while True:
            frame = cv2.cvtColor(frame_read.frame, cv2.COLOR_RGB2BGR)
            if frame is None:
                continue
            
            processed_frame, persons = detect_objects(frame)
            
            # Encode the frame as base64
            _, buffer = cv2.imencode('.jpg', processed_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            # Get drone connection status
            drone_connected = tello.stream_on

            await websocket.send_json({
                "persons": persons,
                "frame": jpg_as_text,
                "droneStatus": {
                    "name": "Drone 1",
                    "isConnected": drone_connected
                }
            })
            await asyncio.sleep(0.1)  # Adjust this value to control the update frequency
    finally:
        tello.streamoff()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await process_video_stream(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

import cv2
import numpy as np
from ultralytics import YOLO
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from djitellopy import Tello
import base64
import time
import singlestoredb
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

torch.device('cpu')  # Set to use CPU

model = YOLO('yolo11x.pt')

tello = None

# SingleStore connection
conn = singlestoredb.connect(
    host=os.getenv('SINGLESTORE_HOST'),
    port=int(os.getenv('SINGLESTORE_PORT')),
    user=os.getenv('SINGLESTORE_USER'),
    password=os.getenv('SINGLESTORE_PASSWORD'),
    database=os.getenv('SINGLESTORE_DATABASE')
)

# Create tables if they don't exist
with conn.cursor() as cursor:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS persons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        confidence FLOAT,
        bbox_x1 INT,
        bbox_y1 INT,
        bbox_x2 INT,
        bbox_y2 INT,
        image LONGTEXT,
        timestamp DATETIME
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS drone_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255), 
        is_connected BOOLEAN,
        battery_level INT,
        location_lat FLOAT,
        location_lng FLOAT,
        timestamp DATETIME
    )
    """)

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
                    
                    # Handle deployment logic
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

            # Insert data into SingleStore
            with conn.cursor() as cursor:
                for person in persons:
                    cursor.execute("""
                    INSERT INTO persons (confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2, image, timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    """, (person['confidence'], *person['bbox'], jpg_as_text))
                # Print data being inserted into the database
                print("Inserting person data:")
                for person in persons:
                    print(f"  Confidence: {person['confidence']:.2f}, BBox: {person['bbox']}")
                
                print(f"Inserting drone status:")
                print(f"  Name: Drone 1, Connected: {drone_connected}, Battery: {battery_level}%")
                print(f"  Location: Lat: 0, Lng: 0")  # Replace with actual lat/lng when available
                print("---")  # Separator for readability
                
                cursor.execute("""
                INSERT INTO drone_status (name, is_connected, battery_level, location_lat, location_lng, timestamp)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """, ("Drone 1", drone_connected, battery_level, 0, 0))  # Replace 0, 0 with actual lat/lng
            
            conn.commit()

            await websocket.send_json({
                "message": "Data inserted into SingleStore"
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

@app.get("/api/persons")
async def get_persons():
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM persons ORDER BY timestamp DESC LIMIT 10")
            persons = cursor.fetchall()
        return [{"id": p[0], "confidence": p[1], "bbox": p[2:6], "image": p[6], "timestamp": p[7]} for p in persons]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/drone_status") 
async def get_drone_status(): 
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM drone_status ORDER BY timestamp DESC LIMIT 1")
            drone = cursor.fetchone()
        return {"name": drone[1], "isConnected": drone[2], "batteryLevel": drone[3], "location": {"lat": drone[4], "lng": drone[5]}, "timestamp": drone[6]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

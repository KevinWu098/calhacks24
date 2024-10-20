import cv2
import numpy as np
from ultralytics import YOLO
import torch
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import base64
import time
import singlestoredb
import os
from dotenv import load_dotenv
from drone_agent import drone_agent, DroneData, DroneStatus, DetectedObject, DeployCommand, MoveCommand, DroneList
from uagents import Context

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

torch.cuda.set_device(0)  # Set to your desired GPU number

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
                    # Insert data into SingleStore
                    with conn.cursor() as cursor:
                        for obj in drone_data.detected_objects:
                            if obj.class_name == "person":
                                cursor.execute("""
                                INSERT INTO persons (confidence, bbox_x1, bbox_y1, bbox_x2, bbox_y2, image, timestamp)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                                """, (obj.confidence, *obj.bbox, drone_data.frame))
                        
                        cursor.execute("""
                        INSERT INTO drone_status (name, is_connected, battery_level, location_lat, location_lng, timestamp)
                        VALUES (%s, %s, %s, %s, %s, NOW())
                        """, (drone_data.drone_status.name, drone_data.drone_status.is_connected, drone_data.drone_status.battery_level, 0, 0))  # Replace 0, 0 with actual lat/lng when available
                    
                    conn.commit()

                    await websocket.send_json({
                        "detected_objects": [obj.dict() for obj in drone_data.detected_objects],
                        "frame": drone_data.frame,
                        "droneStatus": drone_data.drone_status.dict(),
                        "message": "Data inserted into SingleStore"
                    })

            except asyncio.TimeoutError:
                pass
            
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print("WebSocket disconnected")

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
    drone_agent.run()
    uvicorn.run(app, host="0.0.0.0", port=8000)

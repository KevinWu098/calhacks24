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
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from typing import List


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

device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
torch.set_default_device(device)

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
        location_lat FLOAT,
        location_lng FLOAT,
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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hazards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('pole', 'fire', 'tree', 'flood'),
        location_lat FLOAT,
        location_lng FLOAT,
        severity ENUM('Low', 'Moderate', 'High', 'Critical'),
        details TEXT,
        created_by VARCHAR(255),
        created_at DATETIME
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
    
    try:
        while True:
            # Capture telemetry data
            drone_connected = tello.stream_on
            battery_level = tello.get_battery()
            location_lat = tello.get_latitude()  # Replace with actual function
            location_lng = tello.get_longitude() # Replace with actual function

            # Process frame
            frame = cv2.cvtColor(frame_read.frame, cv2.COLOR_RGB2BGR)
            if frame is None:
                continue
            
            processed_frame, persons = detect_objects(frame)
            
            # Encode the frame as base64
            _, buffer = cv2.imencode('.jpg', processed_frame)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            
            # Submit data to the database
            with conn.cursor() as cursor:
                cursor.execute("""
                INSERT INTO drone_status (name, is_connected, battery_level, location_lat, location_lng, timestamp)
                VALUES (%s, %s, %s, %s, %s, NOW())
                """, ("Drone 1", drone_connected, battery_level, location_lat, location_lng))

            conn.commit()

            # Send data to the WebSocket client
            await websocket.send_json({
                "message": "Data inserted into SingleStore"
            })
            
            await asyncio.sleep(0.1)  # Adjust this value to control update frequency

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    finally:
        disconnect_from_drone()

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

                # Handle incoming messages from the drone agent
                detection_data = await drone_agent.receive("detection")
                if detection_data:
                    await websocket.send_json({
                        "event": "DETECTION",
                        "data": detection_data
                    })

                drone_data = await drone_agent.receive("drone_metadata")
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
                        "event": "DRONE_DATA",
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
        
@app.websocket("/ws_agent")
async def agent_websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for handling agent interactions.
    """
    await websocket.accept()

    # Define the system prompt
    system_prompt = """You are an AI assistant for a search and rescue application. Your primary role is to support drone operators in mapping hazards and plotting safe routes.

Key capabilities:
1. Hazard reporting: You can analyze drone data and report potential hazards to the frontend interface.
2. Route planning: Based on the id of the person in need of rescue and the list of hazards to avoid, you can suggest optimal routes for rescue teams.
3. Database querying: You can execute SQL queries to retrieve information from the database.

Database schema:
- persons: Stores information about detected persons
  (id INT, location_lat FLOAT, location_lng FLOAT, timestamp DATETIME)
- drone_status: Stores drone status information
  (id INT, name VARCHAR(255), is_connected BOOLEAN, battery_level INT, location_lat FLOAT, location_lng FLOAT, timestamp DATETIME)
- hazards: Stores information about detected hazards
  (id INT, type ENUM('pole', 'fire', 'tree', 'flood'), location_lat FLOAT, location_lng FLOAT, severity ENUM('Low', 'Moderate', 'High', 'Critical'), details TEXT, created_by VARCHAR(255), created_at DATETIME)

Your responses should be clear, concise, and focused on providing actionable information to the drone operators. Prioritize safety and efficiency in all recommendations. When providing information or suggestions, always consider the urgency of search and rescue operations.

You can use SQL queries to retrieve relevant information from the database to support your decision-making and recommendations. When constructing queries, be mindful of the data types for each column.

Remember, your guidance directly impacts the safety of both rescue teams and those in need of assistance. Maintain a professional and supportive tone at all times."""

    # Define the tools within the WebSocket function
    @tool
    async def display_hazards(hazards: List[str], drones: bool, humans: bool):
        """
        Display hazards on the map.

        Args:
            hazards: List of types of hazards to display on the map. One of the following: "all", "person", "fire", "tree", "power", "flood". Default is "all". If user says do not display any hazards, set hazards to empty list.
            drones: Boolean value to determine if drones should be displayed on the map. Default is True.
            humans: Boolean value to determine if humans should be displayed on the map. Default is True.
        """
        # Send the hazards back as JSON
        await websocket.send_json({
            "event": "display_hazards",
            "hazards": hazards,
            "drones": drones,
            "humans": humans
        })
        return {"status": "success", "message": "Sent hazards, drones, and humans to the frontend."}

    @tool
    async def plan_route(id: str, hazards: List[str]):
        """
        Plan a route to help people avoid hazards. You only need the id of the person in need of rescue and the list of hazards to avoid.

        Args:
            id: The ID of the person in need of rescue.
            hazards: List of types of hazards to avoid. List of one or more of the following: "all", "person", "fire", "tree", "power", "flood". Default is empty list to signify no hazards avoided.
        """
        # Send the id and hazards back as JSON
        await websocket.send_json({
            "event": "plan_route",
            "id": id,
            "hazards": hazards
        })
        return {"status": "success", "message": "Route has been planned and sent to the frontend."}
    
    @tool
    async def execute_sql(query: str):
        """
        Execute an SQL query against the database. 

        Args:
            query: The SQL query to execute.

        Returns:
            A dictionary containing the query results or an error message.
        """
        try:
            with conn.cursor() as cursor:
                cursor.execute(query)
                results = cursor.fetchall()
                columns = [column[0] for column in cursor.description]
                data = [dict(zip(columns, row)) for row in results]
                print("Here are the results of the query:", data)
            return "Here are the results of the query:" + str(data)
        except Exception as e:
            return str(e)

    # Initialize tools
    tools = [display_hazards, plan_route, execute_sql]

    # Initialize memory
    memory = MemorySaver()

    # Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.0
    )

    # Create the agent executor
    agent_executor = create_react_agent(llm, tools, state_modifier=system_prompt, checkpointer=memory)

    # Configuration for the agent
    config = {"configurable": {"thread_id": "agent_ws_connection"}}

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=120.0)
                event = data.get("event")

                if event == "query":
                    user_message = data.get("message", "")
                    if user_message:
                        # Process the message through the agent
                        async for event in agent_executor.astream_events(
                            {
                                "messages": [
                                    HumanMessage(content=user_message)
                                ]
                            }, 
                            config, 
                            version="v1"
                        ):
                            kind = event.get("event")
                            
                            if kind == "on_chat_model_stream":
                                
                                content = event["data"]["chunk"].content
                                if content:
                                    # Stream the chunk back to the client as it arrives
                                    await websocket.send_json({
                                        "event": "chat_chunk",
                                        "content": content
                                    })
                            elif kind == "on_tool_start":
                                # Optionally handle tool start
                                pass
                            elif kind == "on_tool_end":
                                # Optionally handle tool end
                                pass
                            elif kind == "on_chain_start":
                                # Optionally handle chain start
                                pass
                            elif kind == "on_chain_end":
                                # Optionally handle chain end
                                pass

                        # After streaming all chunks, you might want to send a final message
                        await websocket.send_json({
                            "event": "AGENT_RESPONSE_COMPLETE",
                            "message": "Agent response complete."
                        })
                    else:
                        await websocket.send_json({
                            "event": "error",
                            "message": "No message provided for AGENT_QUERY."
                        })
                else:
                    await websocket.send_json({
                        "event": "error",
                        "message": "Unknown event type."
                    })

            except asyncio.TimeoutError:
                await websocket.send_json({
                    "event": "timeout",
                    "message": "No message received in 120 seconds."
                })
            
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print("Agent WebSocket disconnected")

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


from uagents import Agent, Context, Model
from typing import List
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from djitellopy import Tello
import time
import netifaces  # Add this import

class DroneStatus(Model):
    name: str
    is_connected: bool
    battery_level: int

class DetectedPerson(Model):
    confidence: float
    bbox: List[int]

class DroneData(Model):
    persons: List[DetectedPerson]
    drone_status: DroneStatus
    frame: str  # Base64 encoded frame

class DeployCommand(Model):
    command: str

class MoveCommand(Model):
    x: int
    y: int
    z: int
    yaw: int

class DroneList(Model):
    drones: List[DroneStatus]

drone_agent = Agent(name="drone_agent", seed="drone_agent_seed")
model = YOLO('yolo11x.pt')
tello = None

def get_available_drones():
    wifi_interfaces = [iface for iface in netifaces.interfaces()]
    drones = []
    for i, iface in enumerate(wifi_interfaces):
        drones.append(DroneStatus(
            name=f"Drone {i+1}",
            is_connected=False,
            battery_level=100  # Assume full battery for available drones
        ))
    return drones

@drone_agent.on_event("startup")
async def initialize(ctx: Context):
    available_drones = get_available_drones()
    ctx.storage.set("available_drones", available_drones)
    ctx.storage.set("drone_data", DroneData(persons=[], drone_status=DroneStatus(name="Drone 1", is_connected=False, battery_level=0), frame=""))
    ctx.logger.info(f"Drone agent initialized with {len(available_drones)} available drones")

@drone_agent.on_message(model=DeployCommand)
async def handle_deploy_command(ctx: Context, sender: str, msg: DeployCommand):
    global tello
    ctx.logger.info(f"Received deploy command: {msg.command}")
    if msg.command == "takeoff":
        tello = Tello()
        tello.connect()
        tello.streamon()
        time.sleep(4)
        tello.takeoff()
        ctx.storage.set("tello", tello)

@drone_agent.on_message(model=MoveCommand)
async def handle_move_command(ctx: Context, sender: str, msg: MoveCommand):
    tello = ctx.storage.get("tello")
    if tello:
        tello.send_rc_control(msg.x, msg.y, msg.z, msg.yaw)
        time.sleep(0.1)

@drone_agent.on_message(model=DroneList)
async def handle_drone_list_request(ctx: Context, sender: str, msg: DroneList):
    available_drones = ctx.storage.get("available_drones")
    await ctx.send(sender, DroneList(drones=available_drones))

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

@drone_agent.on_interval(period=0.1)
async def process_video_stream(ctx: Context):
    tello = ctx.storage.get("tello")
    if not tello:
        return

    frame_read = tello.get_frame_read()
    frame = cv2.cvtColor(frame_read.frame, cv2.COLOR_RGB2BGR)
    if frame is None:
        return

    processed_frame, persons = detect_objects(frame)
    
    _, buffer = cv2.imencode('.jpg', processed_frame)
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    
    drone_connected = tello.stream_on
    battery_level = tello.get_battery()

    drone_data = DroneData(
        persons=persons,
        drone_status=DroneStatus(
            name="Drone 1",
            is_connected=drone_connected,
            battery_level=battery_level
        ),
        frame=jpg_as_text
    )

    ctx.storage.set("drone_data", drone_data)

@drone_agent.on_interval(period=5.0)
async def share_data(ctx: Context):
    drone_data = ctx.storage.get("drone_data")
    await ctx.send("drone_metadata", drone_data)

@drone_agent.on_event("shutdown")
async def shutdown(ctx: Context):
    tello = ctx.storage.get("tello")
    if tello:
        tello.land()
        tello.streamoff()
        tello.end()
    ctx.logger.info("Drone agent shut down")

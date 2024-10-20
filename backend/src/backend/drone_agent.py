from uagents import Agent, Context, Model
from typing import List
import cv2
import numpy as np
from ultralytics import YOLO
import base64
from djitellopy import Tello
import time
import netifaces

class DroneStatus(Model):
    name: str
    is_connected: bool
    battery_level: int

class DetectedObject(Model):
    class_name: str
    confidence: float
    bbox: List[int]

class DroneData(Model):
    detected_objects: List[DetectedObject]
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
    ctx.storage.set("drone_data", DroneData(detected_objects=[], drone_status=DroneStatus(name="Drone 1", is_connected=False, battery_level=0), frame=""))
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
        await search_and_rescue(ctx)

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
    detected_objects = []

    for r in results:
        boxes = r.boxes
        for box in boxes:
            cls = int(box.cls)
            class_name = model.names[cls]
            conf = float(box.conf)
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            detected_objects.append(DetectedObject(
                class_name=class_name,
                confidence=conf,
                bbox=[x1, y1, x2, y2]
            ))
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{class_name}: {conf:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    return frame, detected_objects

@drone_agent.on_interval(period=0.1)
async def process_video_stream(ctx: Context):
    tello = ctx.storage.get("tello")
    if not tello:
        return

    frame_read = tello.get_frame_read()
    frame = cv2.cvtColor(frame_read.frame, cv2.COLOR_RGB2BGR)
    if frame is None:
        return

    processed_frame, detected_objects = detect_objects(frame)
    
    _, buffer = cv2.imencode('.jpg', processed_frame)
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    
    drone_connected = tello.stream_on
    battery_level = tello.get_battery()

    drone_data = DroneData(
        detected_objects=detected_objects,
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

async def search_and_rescue(ctx: Context):
    tello = ctx.storage.get("tello")
    if not tello:
        ctx.logger.error("Tello drone not initialized")
        return

    while True:
        tello.move_forward(30)  # Move forward 30 cm
        time.sleep(1)  # Wait for the movement to complete

        drone_data = ctx.storage.get("drone_data")
        if not drone_data:
            continue

        for obj in drone_data.detected_objects:
            if obj.class_name == "person" and obj.confidence > 0.7:
                await approach_person(ctx, obj)
                return
            elif obj.class_name in ["tree", "fire", "flood", "power line"] and obj.confidence > 0.6:
                ctx.logger.info(f"Detected {obj.class_name} with confidence {obj.confidence}")
                return

async def approach_person(ctx: Context, person_obj):
    tello = ctx.storage.get("tello")
    frame_height, frame_width = 720, 960  # Assuming Tello's default resolution

    while True:
        # Center the person in the frame
        x1, y1, x2, y2 = person_obj.bbox
        center_x = (x1 + x2) / 2
        frame_center_x = frame_width / 2
        yaw = int((center_x - frame_center_x) / frame_center_x * 100)  # Scale to -100 to 100
        tello.send_rc_control(0, 0, 0, yaw)
        time.sleep(0.1)

        # Move towards the person
        person_height = y2 - y1
        if person_height < frame_height * 0.8:  # If person occupies less than 80% of frame height
            tello.move_forward(30)
            time.sleep(1)
        else:
            break

    await circle_flight_sequence(ctx)

async def circle_flight_sequence(ctx: Context):
    tello = ctx.storage.get("tello")
    tello.send_rc_control(0, 0, 0, 0)
    time.sleep(0.1)
    tello.send_rc_control(-100, -100, -100, 100)
    time.sleep(2)
    tello.send_rc_control(0, 10, 20, 0)
    time.sleep(3)
    tello.send_rc_control(0, 0, 0, 0)
    time.sleep(2)

    v_up = 0
    for _ in range(4):
        tello.send_rc_control(40, -5, v_up, -35)
        time.sleep(4)
        tello.send_rc_control(0, 0, 0, 0)
        time.sleep(0.5)

@drone_agent.on_event("shutdown")
async def shutdown(ctx: Context):
    tello = ctx.storage.get("tello")
    if tello:
        tello.land()
        tello.streamoff()
        tello.end()
    ctx.logger.info("Drone agent shut down")

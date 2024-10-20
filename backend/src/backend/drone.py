from djitellopy import Tello
from time import sleep

def circle(): 
    tello.send_rc_control(0,0,0,0)  
    sleep(0.1)
    # Turns motors on:
    tello.send_rc_control(-100,-100,-100,100)
    sleep(2)
    tello.send_rc_control(0,10,20,0)
    sleep(3)
    tello.send_rc_control(0,0,0,0)
    sleep(2)

    v_up = 0
    for _ in range(4):
        tello.send_rc_control(40, -5, v_up, -35)
        sleep(4)
        tello.send_rc_control(0,0,0,0)
        sleep(0.5)
        
tello = Tello()

tello.connect()
tello.takeoff()

tello.move_forward(200)

# circle()

tello.send_rc_control(0,0,0,0)  
sleep(0.1)
# Turns motors on:
tello.send_rc_control(-100,-100,-100,100)
sleep(2)
tello.send_rc_control(0,10,20,0)
sleep(3)
tello.send_rc_control(0,0,0,0)
sleep(2)

v_up = 0
for _ in range(4):
    tello.send_rc_control(40, -5, v_up, -35)
    sleep(4)
    tello.send_rc_control(0,0,0,0)
    sleep(0.5)

tello.land()
tello.end()

# tello.move_right(20)
# tello.rotate_counter_clockwise(90)
# tello.move_forward(100)
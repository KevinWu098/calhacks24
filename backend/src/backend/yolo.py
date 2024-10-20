import cv2
import torch
import numpy as np
import argparse
from ultralytics import YOLO
from collections import deque
import logging
import os

def setup_logging():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    setup_logging()
    logging.info("Starting YOLO detection script")

    parser = argparse.ArgumentParser(description='Run YOLO on a video file')
    parser.add_argument('video_path', type=str, help='Path to the input video file')
    parser.add_argument('-o', '--output', type=str, help='Path to the output file', default=None)
    parser.add_argument('-f', '--frames', type=int, help='Frame interval for running analysis', default=10)
    args = parser.parse_args()
    logging.info(f"Input video path: {args.video_path}")
    logging.info(f"Output file path: {args.output}")
    logging.info(f"Frame interval: {args.frames}")

    torch.cuda.set_device(0)  # Set to your desired GPU number
    logging.info(f"Using GPU: {torch.cuda.get_device_name(0)}")

    # Load the YOLO model
    logging.info("Loading YOLO model")
    model = YOLO('yolo11s_NP.pt')
    logging.info("YOLO model loaded successfully")

    # Open the video file
    logging.info("Opening video file")
    cap = cv2.VideoCapture(args.video_path)
    if not cap.isOpened():
        logging.error("Error opening video file")
        return

    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    logging.info(f"Video properties - FPS: {fps}, Width: {width}, Height: {height}")

    # Create a window if not saving to file
    if args.output is None:
        cv2.namedWindow('YOLO Detection', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('YOLO Detection', width, height)
        logging.info("Created display window")
    else:
        # Create VideoWriter object if saving to file
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(args.output, fourcc, fps, (width, height))
        logging.info(f"Created output video file: {args.output}")

    # Initialize a deque to store detection history
    detection_history = deque(maxlen=fps)  # Store 1 second of detections
    logging.info(f"Initialized detection history with {fps} frames capacity")

    frame_count = 0
    current_detections = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            logging.info("Reached end of video")
            break

        frame_count += 1
        logging.info(f"Processing frame {frame_count}")

        # Run YOLO detection every args.frames frames
        if frame_count % args.frames == 1:
            # Run YOLO detection
            results = model.predict(source=frame, conf=0.25, iou=0.45, imgsz=640)
            logging.info(f"YOLO detection completed for frame {frame_count}")

            # Process results
            current_detections = []
            for result in results[0].boxes.data.tolist():
                x1, y1, x2, y2, confidence, class_id = result
                current_detections.append((x1, y1, x2, y2, confidence, class_id))
                detection_history.append((x1, y1, x2, y2, confidence, class_id))

            logging.info(f"Found {len(current_detections)} detections in frame {frame_count}")

        # Draw bounding boxes for current detections
        logging.info(f"Drawing bounding boxes for detections in frame {frame_count}")
        for detection in current_detections:
            x1, y1, x2, y2, confidence, class_id = detection
            color = (0, 255, 0)  # Bright green color
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 3)  # Bold line (thickness=3)
            label = f'{model.names[int(class_id)]}: {confidence:.2f}'
            cv2.putText(frame, label, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)

        if args.output is None:
            # Display the frame
            cv2.imshow('YOLO Detection', frame)
            logging.info(f"Displayed frame {frame_count}")

            # Break the loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord('q'):
                logging.info("User pressed 'q'. Exiting.")
                break
        else:
            # Write the frame to the output file
            out.write(frame)
            logging.info(f"Wrote frame {frame_count} to output file")

    # Release resources
    logging.info("Releasing resources")
    cap.release()
    if args.output is not None:
        out.release()
    else:
        cv2.destroyAllWindows()
    logging.info("Script completed successfully")

if __name__ == '__main__':
    main()

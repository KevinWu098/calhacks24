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

class YOLODetector:
    def __init__(self, frame_interval=5):
        setup_logging()
        logging.info("Initializing YOLO detector")
        
        self.frame_interval = frame_interval
        torch.cuda.set_device(0)  # Set to your desired GPU number
        logging.info(f"Using GPU: {torch.cuda.get_device_name(0)}")

        # Load the YOLO models
        logging.info("Loading YOLO models")
        self.model_np = YOLO('yolo11s_NP.pt')
        self.model_x = YOLO('yolo11x.pt')
        logging.info("YOLO models loaded successfully")

        self.frame_count = 0
        self.current_detections = []
        self.detection_history = deque(maxlen=30)  # Assuming 30 FPS, store 1 second of detections

    def process_frame(self, frame):
        self.frame_count += 1
        logging.info(f"Processing frame {self.frame_count}")

        # Run YOLO detection every self.frame_interval frames
        if self.frame_count % self.frame_interval == 1:
            # Run YOLO detection with yolo11s_NP model
            results_np = self.model_np.predict(source=frame, conf=0.25, iou=0.45, imgsz=640)
            logging.info(f"YOLO11s_NP detection completed for frame {self.frame_count}")

            # Run YOLO detection with yolo11x model
            results_x = self.model_x.predict(source=frame, conf=0.25, iou=0.45, imgsz=640)
            logging.info(f"YOLO11x detection completed for frame {self.frame_count}")

            # Process results
            self.current_detections = []
            for result in results_np[0].boxes.data.tolist():
                x1, y1, x2, y2, confidence, class_id = result
                self.current_detections.append((x1, y1, x2, y2, confidence, class_id, 'NP'))
                self.detection_history.append((x1, y1, x2, y2, confidence, class_id, 'NP'))

            for result in results_x[0].boxes.data.tolist():
                x1, y1, x2, y2, confidence, class_id = result
                if self.model_x.names[int(class_id)] == 'person':
                    self.current_detections.append((x1, y1, x2, y2, confidence, class_id, 'X'))
                    self.detection_history.append((x1, y1, x2, y2, confidence, class_id, 'X'))

            logging.info(f"Found {len(self.current_detections)} detections in frame {self.frame_count}")

        # Draw bounding boxes for current detections
        logging.info(f"Drawing bounding boxes for detections in frame {self.frame_count}")
        for detection in self.current_detections:
            x1, y1, x2, y2, confidence, class_id, model_type = detection
            if model_type == 'NP':
                if self.model_np.names[int(class_id)] == 'fallen tree':
                    color = (0, 255, 0)  # Lime green for fallen trees
                else:
                    color = (255, 191, 0)  # Light blue for other NP detections
            else:
                color = (128, 0, 128)  # Purple for people (X model)
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 4)  # Increased thickness to 4
            label = f'{self.model_np.names[int(class_id)] if model_type == "NP" else "person"}: {confidence:.2f}'
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
            cv2.rectangle(frame, (int(x1), int(y1) - label_size[1] - 10), (int(x1) + label_size[0], int(y1)), color, -1)
            cv2.putText(frame, label, (int(x1), int(y1) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        return frame

def main():
    setup_logging()
    logging.info("Starting YOLO detection script")

    parser = argparse.ArgumentParser(description='Run YOLO on a video file')
    parser.add_argument('video_path', type=str, help='Path to the input video file')
    parser.add_argument('-o', '--output', type=str, help='Path to the output file', default=None)
    parser.add_argument('-f', '--frames', type=int, help='Frame interval for running analysis', default=5)
    args = parser.parse_args()
    logging.info(f"Input video path: {args.video_path}")
    logging.info(f"Output file path: {args.output}")
    logging.info(f"Frame interval: {args.frames}")

    detector = YOLODetector(frame_interval=args.frames)

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

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            logging.info("Reached end of video")
            break

        processed_frame = detector.process_frame(frame)

        if args.output is None:
            # Display the frame
            cv2.imshow('YOLO Detection', processed_frame)
            logging.info(f"Displayed frame {detector.frame_count}")

            # Break the loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord('q'):
                logging.info("User pressed 'q'. Exiting.")
                break
        else:
            # Write the frame to the output file
            out.write(processed_frame)
            logging.info(f"Wrote frame {detector.frame_count} to output file")

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

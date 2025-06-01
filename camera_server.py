from flask import Flask, Response, jsonify, request
import cv2
import time
import os
import threading
import urllib.parse
from flask_cors import CORS

# Camera credentials - match your React configuration
USERNAME = "admin"
PASSWORD = "admin@123"
CAMERA_IP = "192.168.29.229"
PORT = 8000

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variables
camera = None
frame = None
camera_lock = threading.Lock()
stream_active = False
connection_status = {
    "connected": False,
    "error": None,
    "method": None,
    "url": None
}

def generate_frames():
    """Generate video frames as MJPEG stream"""
    global frame, stream_active
    
    while stream_active:
        if frame is not None:
            # Encode frame as JPEG
            _, encoded_frame = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            # Yield the frame in MJPEG format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + encoded_frame.tobytes() + b'\r\n')
        else:
            # If no frame is available, send a black frame
            black_frame = cv2.imencode('.jpg', cv2.zeros((480, 640, 3), dtype=np.uint8))[1].tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + black_frame + b'\r\n')
        
        time.sleep(0.03)  # ~30 FPS

def camera_thread():
    """Background thread to capture frames from camera"""
    global frame, camera, stream_active, connection_status
    
    stream_active = True
    connection_status["connected"] = False
    
    # Try different streaming URLs
    encoded_password = urllib.parse.quote(PASSWORD)
    stream_urls = [
        # RTSP URLs
        f"rtsp://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/cam/realmonitor?channel=1&subtype=0",
        f"rtsp://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/h264/ch01/main/av_stream",
        f"rtsp://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/Streaming/Channels/101",
        f"rtsp://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/live/ch00_0",
        
        # HTTP URLs
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/videostream.cgi",
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/video.cgi",
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/mjpg/video.mjpg",
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/cgi-bin/mjpg/video.cgi",
    ]
    
    # Test each URL
    for url in stream_urls:
        try:
            print(f"Trying camera URL: {url}")
            
            # Set RTSP transport to TCP if using RTSP
            if url.startswith("rtsp"):
                os.environ["OPENCV_FFMPEG_TRANSPORT_OPTION"] = "rtsp_transport=tcp"
                cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            else:
                cap = cv2.VideoCapture(url)
            
            # Check if connection was successful
            if not cap.isOpened():
                print(f"Failed to open stream: {url}")
                continue
            
            # Try to read a frame to verify connection
            ret, test_frame = cap.read()
            if not ret or test_frame is None:
                print(f"Could not read frame from: {url}")
                cap.release()
                continue
            
            # Success - keep this connection
            camera = cap
            connection_status["connected"] = True
            connection_status["error"] = None
            connection_status["method"] = "Stream"
            connection_status["url"] = url
            print(f"✅ Successfully connected to camera: {url}")
            
            # Main frame capture loop
            while stream_active:
                with camera_lock:
                    ret, frame = camera.read()
                    
                if not ret or frame is None:
                    print("Camera connection lost, reconnecting...")
                    connection_status["connected"] = False
                    connection_status["error"] = "Connection lost"
                    break
                
                time.sleep(0.03)  # ~30 FPS
            
            # Release camera before trying another URL
            cap.release()
            
        except Exception as e:
            print(f"Error with URL {url}: {str(e)}")
            connection_status["error"] = str(e)
            
    # If all URLs failed, try snapshot mode
    if not connection_status["connected"]:
        try_snapshot_mode()
    
    # Mark stream as inactive if we've tried everything
    if not connection_status["connected"]:
        stream_active = False
        print("❌ Failed to connect to camera with any method")

def try_snapshot_mode():
    """Fallback to snapshot mode if streaming fails"""
    global frame, stream_active, connection_status
    
    encoded_password = urllib.parse.quote(PASSWORD)
    snapshot_urls = [
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/cgi-bin/snapshot.cgi",
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/snapshot.cgi",
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/snapshot.jpg",
        f"http://{USERNAME}:{encoded_password}@{CAMERA_IP}:{PORT}/cgi-bin/camera/snapshot.cgi",
    ]
    
    for url in snapshot_urls:
        try:
            print(f"Trying snapshot URL: {url}")
            cap = cv2.VideoCapture(url)
            
            ret, test_frame = cap.read()
            if not ret or test_frame is None:
                print(f"Could not get snapshot from: {url}")
                cap.release()
                continue
            
            # Success - use this for periodic snapshots
            connection_status["connected"] = True
            connection_status["error"] = None
            connection_status["method"] = "Snapshot"
            connection_status["url"] = url
            print(f"✅ Successfully connected to camera in snapshot mode: {url}")
            
            # Periodic snapshot capture loop
            while stream_active:
                cap = cv2.VideoCapture(url + "?t=" + str(int(time.time())))
                ret, snapshot = cap.read()
                cap.release()
                
                if ret and snapshot is not None:
                    with camera_lock:
                        frame = snapshot
                else:
                    print("Failed to get snapshot, retrying...")
                    connection_status["error"] = "Snapshot failed"
                
                time.sleep(2)  # Get a new snapshot every 2 seconds
            
            return True
            
        except Exception as e:
            print(f"Error with snapshot URL {url}: {str(e)}")
            connection_status["error"] = str(e)
    
    return False

@app.route('/video_feed')
def video_feed():
    """Route for streaming video as MJPEG"""
    if not connection_status["connected"]:
        return Response("Camera not connected", status=503)
    
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/snapshot')
def snapshot():
    """Route for getting a single snapshot"""
    global frame
    
    if frame is None:
        return Response("No frame available", status=503)
    
    with camera_lock:
        _, buffer = cv2.imencode('.jpg', frame)
    
    return Response(buffer.tobytes(), mimetype='image/jpeg')

@app.route('/start_camera', methods=['POST'])
def start_camera():
    """Start camera connection"""
    global stream_active
    
    if stream_active:
        return jsonify({"status": "already_running", "connection": connection_status})
    
    # Start camera thread
    stream_active = True
    camera_thread_obj = threading.Thread(target=camera_thread)
    camera_thread_obj.daemon = True
    camera_thread_obj.start()
    
    return jsonify({"status": "starting", "message": "Camera connection starting"})

@app.route('/stop_camera', methods=['POST'])
def stop_camera():
    """Stop camera connection"""
    global stream_active, camera, frame
    
    stream_active = False
    
    # Release camera if it exists
    if camera is not None:
        camera.release()
        camera = None
    
    # Clear the current frame
    frame = None
    
    # Reset connection status
    connection_status["connected"] = False
    connection_status["method"] = None
    
    return jsonify({"status": "stopped", "message": "Camera connection stopped"})

@app.route('/status')
def status():
    """Get camera connection status"""
    global connection_status
    return jsonify(connection_status)

@app.route('/fire_detection', methods=['POST'])
def fire_detection():
    """Simple fire detection based on color thresholds (for demo)"""
    global frame
    
    if frame is None:
        return jsonify({"status": "error", "message": "No frame available"})
    
    try:
        # Simple fire detection based on color (just for demonstration)
        # Real implementation would use more sophisticated techniques
        with camera_lock:
            frame_copy = frame.copy()
        
        # Convert to HSV for better color detection
        hsv = cv2.cvtColor(frame_copy, cv2.COLOR_BGR2HSV)
        
        # Define range for fire color (reddish-orange)
        lower_fire = np.array([0, 70, 100])
        upper_fire = np.array([25, 255, 255])
        
        # Create mask for fire-colored pixels
        mask = cv2.inRange(hsv, lower_fire, upper_fire)
        
        # Count fire pixels
        fire_pixel_count = cv2.countNonZero(mask)
        total_pixels = frame_copy.shape[0] * frame_copy.shape[1]
        fire_ratio = fire_pixel_count / total_pixels
        
        # Determine if fire is detected
        fire_detected = fire_ratio > 0.05  # 5% of the image is fire-colored
        
        return jsonify({
            "status": "success",
            "fire_detected": fire_detected,
            "fire_ratio": fire_ratio,
            "timestamp": time.time()
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })

if __name__ == '__main__':
    import numpy as np
    # Start server on port 5000
    app.run(host='0.0.0.0', port=5000, threaded=True)
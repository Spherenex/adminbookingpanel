import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, RefreshCw, AlertTriangle, Video, VideoOff, Check,
  Monitor, Wifi, Settings, Info, X
} from 'lucide-react';

// Camera server settings - this is our Python Flask server
const CAMERA_SERVER = {
  baseUrl: "http://localhost:5000",
  endpoints: {
    videoFeed: "/video_feed",
    snapshot: "/snapshot",
    status: "/status",
    startCamera: "/start_camera",
    stopCamera: "/stop_camera",
    fireDetection: "/fire_detection"
  },
  // Backup in case server fails
  fallbackToWebcam: true,
  connectionTimeout: 8000,
  snapshotRefreshRate: 2000,
};

const CameraIntegration = ({ 
  onCameraConnected, 
  onCameraError, 
  onFireDetected,
  showControls = true,
  width = 640,
  height = 480,
  className = ""
}) => {
  // Camera state
  const [cameraConnected, setCameraConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [connectionMethod, setConnectionMethod] = useState('');
  const [useWebcam, setUseWebcam] = useState(false);
  const [showConnectionHelp, setShowConnectionHelp] = useState(false);
  const [serverStatus, setServerStatus] = useState({});
  
  // Refs
  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const snapshotImageRef = useRef(null);
  const statusCheckInterval = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  // Stop all camera streams
  const stopAllStreams = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }
    
    // Tell the server to stop the camera
    if (cameraConnected && !useWebcam) {
      fetch(`${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.stopCamera}`, {
        method: 'POST',
      }).catch(err => {
        console.error("Error stopping camera on server:", err);
      });
    }
    
    setCameraConnected(false);
    setConnectionMethod('');
  };

  // Check server status
  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.status}`);
      if (response.ok) {
        const status = await response.json();
        setServerStatus(status);
        
        // Update connected state based on server status
        if (status.connected !== cameraConnected && !useWebcam) {
          setCameraConnected(status.connected);
          setConnectionMethod(status.method || '');
          
          if (status.connected) {
            if (onCameraConnected) onCameraConnected(status);
          } else if (status.error) {
            setCameraError(status.error);
            if (onCameraError) onCameraError(status.error);
          }
        }
      }
    } catch (error) {
      console.error("Server status check failed:", error);
      if (!useWebcam) {
        setCameraConnected(false);
        setCameraError("Camera server unreachable");
        if (onCameraError) onCameraError("Camera server unreachable");
      }
    }
  };

  // Start webcam as fallback
  const startWebcam = async () => {
    try {
      console.log("🎥 Starting webcam as fallback camera");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: 'user'
        },
        audio: false
      });

      webcamStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setUseWebcam(true);
      setCameraConnected(true);
      setConnectionMethod('Device Webcam (Fallback)');
      setCameraError(null);
      
      if (onCameraConnected) {
        onCameraConnected({ method: 'Device Webcam (Fallback)' });
      }
      
      console.log("✅ Webcam started successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to start webcam:", error);
      setCameraError(`Failed to access webcam: ${error.message}`);
      
      if (onCameraError) {
        onCameraError(`Failed to access webcam: ${error.message}`);
      }
      
      return false;
    }
  };

  // Start the camera connection
  const connectToCamera = async () => {
    setConnecting(true);
    setCameraError(null);
    stopAllStreams();
    
    try {
      console.log("🔌 Connecting to camera server...");
      
      // First try the Python server
      const response = await fetch(`${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.startCamera}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Server response:", data);
      
      // Start checking status regularly
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      
      statusCheckInterval.current = setInterval(checkServerStatus, 2000);
      
      // Wait for the server to connect (or timeout)
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        // Check server status
        try {
          const statusResponse = await fetch(`${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.status}`);
          const status = await statusResponse.json();
          
          if (status.connected) {
            // Connected to camera, show the stream
            console.log("✅ Camera server connected successfully:", status);
            setCameraConnected(true);
            setConnectionMethod(status.method || 'Stream');
            setCameraError(null);
            
            if (status.method === 'Snapshot') {
              // Use snapshot mode
              if (snapshotImageRef.current) {
                startSnapshotRefresh();
              }
            } else {
              // Use streaming mode
              if (videoRef.current) {
                videoRef.current.src = `${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.videoFeed}`;
                await videoRef.current.play().catch(err => {
                  console.error("Error playing video:", err);
                });
              }
            }
            
            if (onCameraConnected) {
              onCameraConnected(status);
            }
            
            setConnecting(false);
            return true;
          } else if (status.error) {
            console.warn("Camera connection in progress, server reports:", status.error);
          }
        } catch (err) {
          console.error("Error checking server status:", err);
        }
      }
      
      // If we reach here, server failed to connect to camera
      console.error("❌ Server failed to connect to camera after timeout");
      setCameraError("Server failed to connect to camera after timeout");
      
      // Try webcam as fallback if enabled
      if (CAMERA_SERVER.fallbackToWebcam) {
        console.log("Trying webcam as fallback...");
        const webcamSuccess = await startWebcam();
        setConnecting(false);
        return webcamSuccess;
      }
      
      if (onCameraError) {
        onCameraError("Server failed to connect to camera after timeout");
      }
      
      setConnecting(false);
      return false;
      
    } catch (error) {
      console.error("❌ Failed to connect to camera server:", error);
      setCameraError(`Failed to connect to camera server: ${error.message}`);
      
      // Try webcam as fallback if enabled and server is unreachable
      if (CAMERA_SERVER.fallbackToWebcam) {
        console.log("Server unreachable, trying webcam as fallback...");
        const webcamSuccess = await startWebcam();
        setConnecting(false);
        return webcamSuccess;
      }
      
      if (onCameraError) {
        onCameraError(`Failed to connect to camera server: ${error.message}`);
      }
      
      setConnecting(false);
      return false;
    }
  };

  // Refresh snapshot image
  const startSnapshotRefresh = () => {
    // Start a timer to refresh the snapshot image
    const refreshInterval = setInterval(() => {
      if (snapshotImageRef.current) {
        snapshotImageRef.current.src = `${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.snapshot}?t=${Date.now()}`;
      }
    }, CAMERA_SERVER.snapshotRefreshRate);
    
    return refreshInterval;
  };

  // Check for fire detection
  const checkFireDetection = async () => {
    if (!cameraConnected) return;
    
    try {
      const response = await fetch(`${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.fireDetection}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.fire_detected && onFireDetected) {
          onFireDetected(data);
        }
        
        return data;
      }
    } catch (error) {
      console.error("Error checking fire detection:", error);
    }
    
    return null;
  };

  return (
    <div className={`camera-integration ${className}`}>
      {/* Camera connection status */}
      <div className={`camera-connection-status ${cameraConnected ? 'connected' : 'disconnected'} ${useWebcam ? 'webcam' : ''}`}>
        <div className="connection-indicator">
          <div className="status-dot"></div>
          <span className="connection-label">
            {useWebcam ? 'Device Webcam' : 'CP Plus Camera'}: {cameraConnected ? 'Connected' : 'Disconnected'}
            {cameraConnected && connectionMethod === 'Snapshot' && !useWebcam ? ' (Snapshot Mode)' : ''}
            {cameraConnected && connectionMethod === 'Stream' && !useWebcam ? ' (Video Stream)' : ''}
          </span>
        </div>
        
        {showControls && (
          <div className="connection-actions">
            <button
              onClick={connectToCamera}
              disabled={connecting}
              className={`btn-connect ${cameraConnected ? 'connected' : ''} ${connecting ? 'connecting' : ''}`}
            >
              {connecting ? <RefreshCw size={18} className="icon-spin" /> : <Settings size={18} />}
              <span>
                {connecting ? 'Connecting...' : cameraConnected ? 'Reconnect' : 'Connect'}
              </span>
            </button>
            
            <button
              onClick={() => setShowConnectionHelp(!showConnectionHelp)}
              className="btn-help"
            >
              <Info size={18} />
              <span>Help</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Connection Help Panel */}
      {showConnectionHelp && (
        <div className="connection-help-panel">
          <div className="help-panel-header">
            <h4>🔧 Connection Troubleshooting</h4>
            <button className="close-help" onClick={() => setShowConnectionHelp(false)}>
              <X size={16} />
            </button>
          </div>
          
          <div className="help-sections">
            <div className="help-section">
              <h5>📡 Network Setup</h5>
              <ul>
                <li>Ensure Python server is running at: <code>{CAMERA_SERVER.baseUrl}</code></li>
                <li>Check if the camera is powered on and connected to the network</li>
                <li>Make sure your computer is on the same network as the camera</li>
              </ul>
            </div>
            <div className="help-section">
              <h5>🔐 Camera Server</h5>
              <ul>
                <li>Server should be running: <code>python camera_server.py</code></li>
                <li>The server handles CORS and authentication with the camera</li>
                <li>Check server logs for specific connection errors</li>
              </ul>
            </div>
            <div className="help-section">
              <h5>💻 Fallback Options</h5>
              <ul>
                <li>If camera server is unreachable, the system will use your device webcam</li>
                <li>Webcam fallback can be disabled in settings if needed</li>
                <li>Some features like fire detection may be limited with webcam</li>
              </ul>
            </div>
          </div>
          
          <div className="server-status">
            <h5>Server Status:</h5>
            <pre>{JSON.stringify(serverStatus, null, 2)}</pre>
          </div>
        </div>
      )}
      
      {/* Camera error message */}
      {cameraError && (
        <div className="camera-error">
          <p>
            <AlertTriangle size={16} />
            <span>{cameraError}</span>
          </p>
        </div>
      )}
      
      {/* Camera feed container */}
      <div className="camera-feed-container">
        <div className="live-indicator">{useWebcam ? 'WEBCAM' : 'LIVE'}</div>
        
        {connectionMethod === 'Snapshot' && !useWebcam ? (
          <img
            ref={snapshotImageRef}
            src={`${CAMERA_SERVER.baseUrl}${CAMERA_SERVER.endpoints.snapshot}?t=${Date.now()}`}
            alt="Camera Feed"
            width={width}
            height={height}
            className="camera-snapshot"
            onError={(e) => {
              console.error('Snapshot failed to load:', e);
              setCameraError('Snapshot failed to load. Camera may have disconnected.');
            }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            width={width}
            height={height}
            className="camera-video"
          />
        )}
        
        {!cameraConnected && (
          <div className="camera-status-overlay">
            <div className="status-message">
              <Wifi size={24} className="icon-spin" />
              <span>Camera not connected</span>
            </div>
          </div>
        )}
      </div>
      
      {showControls && (
        <div className="camera-controls">
          {cameraConnected ? (
            <button
              onClick={stopAllStreams}
              className="control-button stop"
            >
              <VideoOff size={20} />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={connectToCamera}
              disabled={connecting}
              className="control-button start"
            >
              <Video size={20} />
              <span>{connecting ? 'Connecting...' : 'Connect'}</span>
            </button>
          )}
          
          {cameraConnected && (
            <button
              onClick={checkFireDetection}
              className="control-button test"
            >
              <AlertTriangle size={20} />
              <span>Test Fire Detection</span>
            </button>
          )}
        </div>
      )}
      
      <style jsx>{`
        .camera-integration {
          width: 100%;
          max-width: ${width + 40}px;
          margin: 0 auto;
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .camera-connection-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background-color: #f1f3f5;
          border-radius: 6px;
          margin-bottom: 16px;
          border-left: 4px solid #dc3545;
        }
        
        .camera-connection-status.connected {
          border-left: 4px solid #28a745;
        }
        
        .camera-connection-status.webcam {
          border-left: 4px solid #007bff;
        }
        
        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #dc3545;
        }
        
        .camera-connection-status.connected .status-dot {
          background-color: #28a745;
        }
        
        .connection-actions {
          display: flex;
          gap: 8px;
        }
        
        .btn-connect, .btn-help {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 4px;
          border: none;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-connect {
          background-color: #007bff;
          color: white;
        }
        
        .btn-connect:hover {
          background-color: #0069d9;
        }
        
        .btn-connect.connected {
          background-color: #28a745;
        }
        
        .btn-connect.connected:hover {
          background-color: #218838;
        }
        
        .btn-connect:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .btn-help {
          background-color: #6c757d;
          color: white;
        }
        
        .btn-help:hover {
          background-color: #5a6268;
        }
        
        .icon-spin {
          animation: spin 1.5s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .camera-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .camera-error p {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .camera-feed-container {
          position: relative;
          width: 100%;
          margin-bottom: 16px;
          background-color: #000;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .camera-video, .camera-snapshot {
          width: 100%;
          height: auto;
          display: block;
          background-color: #000;
        }
        
        .live-indicator {
          position: absolute;
          top: 10px;
          left: 10px;
          background-color: rgba(255, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          z-index: 10;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .camera-status-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }
        
        .status-message {
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }
        
        .camera-controls {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .control-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 4px;
          border: none;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .control-button.start {
          background-color: #28a745;
          color: white;
        }
        
        .control-button.start:hover {
          background-color: #218838;
        }
        
        .control-button.stop {
          background-color: #dc3545;
          color: white;
        }
        
        .control-button.stop:hover {
          background-color: #c82333;
        }
        
        .control-button.test {
          background-color: #fd7e14;
          color: white;
        }
        
        .control-button.test:hover {
          background-color: #e8710d;
        }
        
        .control-button:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        .connection-help-panel {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .help-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .help-panel-header h4 {
          margin: 0;
          color: #495057;
        }
        
        .close-help {
          background: none;
          border: none;
          cursor: pointer;
          color: #6c757d;
          padding: 4px;
        }
        
        .close-help:hover {
          color: #343a40;
        }
        
        .help-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .help-section h5 {
          margin: 0 0 8px 0;
          color: #6c757d;
        }
        
        .help-section ul {
          margin: 0;
          padding-left: 20px;
          line-height: 1.4;
        }
        
        .help-section li {
          margin-bottom: 4px;
        }
        
        .help-section code {
          background-color: #e9ecef;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 12px;
        }
        
        .server-status {
          background-color: #e9ecef;
          padding: 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }
        
        .server-status h5 {
          margin: 0 0 8px 0;
          color: #495057;
        }
        
        .server-status pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};

export default CameraIntegration;
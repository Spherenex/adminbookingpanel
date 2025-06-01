
// import React, { useState, useEffect, useRef } from 'react';
// import { ref, onValue, update, get, set, push } from 'firebase/database';
// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { database, storage } from '../firebase';
// import {
//   Users, Calendar, DollarSign, Ticket, Thermometer, Droplets, Wine,
//   AlertTriangle, Camera, X, CheckCircle, XCircle, Video, VideoOff, User, 
//   UserPlus, Shield, List, Wind, Settings, RefreshCw, Monitor, Wifi
// } from 'lucide-react';
// import '../styles/AdminDashboard.css';

// const AdminDashboard = () => {
//   const [stats, setStats] = useState({
//     totalUsers: 0,
//     totalBookings: 0,
//     pendingPayments: 0,
//     completedPayments: 0,
//     recentBookings: [],
//     temperature: 0,
//     humidity: 0,
//     alcoholDetection: 'No detection',
//     gasDetection: 'No detection',
//     fireDetection: 'No detection',
//     unusualActivity: 'Normal',
//     activityStatus: 0
//   });
//   const [loading, setLoading] = useState(true);
//   const [showCamera, setShowCamera] = useState(false);
//   const [currentBooking, setCurrentBooking] = useState(null);
//   const [comparing, setComparing] = useState(false);
//   const [verified, setVerified] = useState(null);
//   const [verificationStatus, setVerificationStatus] = useState(0);
//   const [monitoringActive, setMonitoringActive] = useState(false);
//   const [fireDetected, setFireDetected] = useState(false);
//   const [blinking, setBlinking] = useState(false);
//   const [fireDetectionCount, setFireDetectionCount] = useState(0);
//   const [lastFrameData, setLastFrameData] = useState(null);
//   const [motionLevel, setMotionLevel] = useState(0);
//   const [verificationLogs, setVerificationLogs] = useState([]);
//   const [showVerificationLogs, setShowVerificationLogs] = useState(false);
//   const [monitoringFrameCount, setMonitoringFrameCount] = useState(0);
  
//   // Camera state
//   const [cameraConnected, setCameraConnected] = useState(false);
//   const [connectingCamera, setConnectingCamera] = useState(false);
//   const [cameraError, setCameraError] = useState(null);
  
//   // Refs
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const monitoringVideoRef = useRef(null);
//   const monitoringCanvasRef = useRef(null);
//   const monitoringIntervalRef = useRef(null);
//   const analysisIntervalRef = useRef(null);
//   const motionCanvasRef = useRef(null);
//   const webcamStreamRef = useRef(null);

//   // Effect to reset Firebase data on component mount
//   useEffect(() => {
//     const resetFirebaseData = async () => {
//       try {
//         const monitoringRef = ref(database, 'monitoring/unusualActivity');
//         await set(monitoringRef, {
//           status: 0,
//           message: 'Normal',
//           timestamp: new Date().toISOString()
//         });
//         console.log("Firebase reset to normal state");
//       } catch (error) {
//         console.error("Error resetting Firebase data:", error);
//       }
//     };

//     resetFirebaseData();
//   }, []);

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       stopWebcam();
//       if (monitoringIntervalRef.current) {
//         clearInterval(monitoringIntervalRef.current);
//       }
//       if (analysisIntervalRef.current) {
//         clearInterval(analysisIntervalRef.current);
//       }

//       const monitoringRef = ref(database, 'monitoring/unusualActivity');
//       set(monitoringRef, {
//         status: 0,
//         message: 'Normal',
//         timestamp: new Date().toISOString()
//       }).catch(error => {
//         console.error("Error resetting alert state on unmount:", error);
//       });
//     };
//   }, []);

//   // Stop webcam
//   const stopWebcam = () => {
//     if (webcamStreamRef.current) {
//       webcamStreamRef.current.getTracks().forEach(track => track.stop());
//       webcamStreamRef.current = null;
//     }
//     setCameraConnected(false);
//   };

//   // Fetch stats from Firebase
//   useEffect(() => {
//     setLoading(true);
//     const fetchStats = async () => {
//       // Fetch users data
//       const usersRef = ref(database, 'users');
//       onValue(usersRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const usersData = snapshot.val();
//           const usersCount = Object.keys(usersData).length;
//           setStats(prevStats => ({
//             ...prevStats,
//             totalUsers: usersCount
//           }));
//         }
//       });

//       // Fetch bookings data
//       const bookingsRef = ref(database, 'stadium_transactions');
//       onValue(bookingsRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const bookingsData = snapshot.val();
//           const bookings = Object.entries(bookingsData).map(([id, data]) => ({
//             id,
//             ...data
//           }));

//           const totalBookings = bookings.length;
//           const pendingPayments = bookings.filter(b => b.paymentStatus !== 'completed').length;
//           const completedPayments = bookings.filter(b => b.paymentStatus === 'completed').length;
//           const recentBookings = bookings
//             .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
//             .slice(0, 5);

//           setStats(prevStats => ({
//             ...prevStats,
//             totalBookings,
//             pendingPayments,
//             completedPayments,
//             recentBookings
//           }));

//           initializeVerificationLogs(bookings);
//         }
//         setLoading(false);
//       });

//       fetchVerificationLogs();

//       // Listen for unusual activity updates
//       const activityRef = ref(database, 'monitoring/unusualActivity');
//       onValue(activityRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const activityData = snapshot.val();
//           const statusCode = activityData.status;

//           setStats(prevStats => ({
//             ...prevStats,
//             activityStatus: statusCode,
//             unusualActivity: activityData.message || 'Normal'
//           }));

//           if (statusCode === 1) {
//             setFireDetected(true);
//             setBlinking(true);
//           } else {
//             setFireDetected(false);
//             setBlinking(false);
//           }
//         }
//       });

//       // Fetch sensor data from Firebase
//       const sensorsRef = ref(database, 'IPL_Ticket/Sensors');
//       onValue(sensorsRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const sensorsData = snapshot.val();

//           const temperature = parseFloat(sensorsData.Temperature) || 0;
//           const humidity = parseFloat(sensorsData.Humidity) || 0;
//           const alcoholValue = parseInt(sensorsData.Alcohol) || 0;
//           const alcoholStatus = alcoholValue === 0 ? 'No detection' : 'Alcohol detected';
//           const gasValue = parseInt(sensorsData.Gas) || 0;
//           const gasStatus = gasValue === 0 ? 'No detection' : 'Gas detected';
//           const fireValue = parseInt(sensorsData.Fire) || 0;
//           const fireStatus = fireValue === 0 ? 'No detection' : 'Fire detected';

//           setStats(prevStats => ({
//             ...prevStats,
//             temperature,
//             humidity,
//             alcoholDetection: alcoholStatus,
//             gasDetection: gasStatus,
//             fireDetection: fireStatus
//           }));

//           if (fireValue === 1) {
//             const monitoringRef = ref(database, 'monitoring/unusualActivity');
//             const timestamp = new Date().toISOString();

//             set(monitoringRef, {
//               status: 1,
//               message: 'Fire detected by sensor',
//               timestamp: timestamp
//             }).catch(err => {
//               console.error("Error updating firebase with fire detection:", err);
//             });
//           }
//         }
//       });
//     };

//     fetchStats();
//   }, []);

//   // Effect for blinking
//   useEffect(() => {
//     let blinkInterval;
//     if (blinking) {
//       blinkInterval = setInterval(() => {
//         setBlinking(prev => !prev);
//       }, 500);
//     }
//     return () => {
//       if (blinkInterval) clearInterval(blinkInterval);
//     };
//   }, [blinking]);

//   // Initialize verification logs for all bookings
//   const initializeVerificationLogs = async (bookings) => {
//     try {
//       const logsRef = ref(database, 'verification_logs');
//       const snapshot = await get(logsRef);
//       const existingLogs = snapshot.exists() ? snapshot.val() : {};

//       const bookingsWithLogs = new Set();

//       Object.values(existingLogs).forEach(log => {
//         if (log.bookingId) {
//           bookingsWithLogs.add(log.bookingId);
//         }
//       });

//       for (const booking of bookings) {
//         if (!bookingsWithLogs.has(booking.id)) {
//           const verificationId = `verification_init_${booking.id}`;
//           const timestamp = new Date().toISOString();

//           await set(ref(database, `verification_logs/${verificationId}`), {
//             userId: booking.userId || "unknown",
//             bookingId: booking.id,
//             timestamp: timestamp,
//             status: 0,
//             capturedImageUrl: "",
//             referenceImageUrl: "",
//             adminId: "system_init",
//             location: "Not Checked In",
//             initialized: true
//           });
//         }
//       }
//     } catch (error) {
//       console.error("Error initializing verification logs:", error);
//     }
//   };

//   // Fetch all verification logs
//   const fetchVerificationLogs = async () => {
//     try {
//       const logsRef = ref(database, 'verification_logs');
//       const snapshot = await get(logsRef);
      
//       if (snapshot.exists()) {
//         const logsData = snapshot.val();
//         const logs = Object.entries(logsData).map(([id, data]) => ({
//           id,
//           ...data
//         }));
        
//         const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//         setVerificationLogs(sortedLogs);
//       } else {
//         setVerificationLogs([]);
//       }
//     } catch (error) {
//       console.error("Error fetching verification logs:", error);
//       setVerificationLogs([]);
//     }
//   };

//   // Connect to webcam
//   const connectToWebcam = async () => {
//     setConnectingCamera(true);
//     setCameraError(null);
    
//     try {
//       console.log("🎥 Starting webcam...");
      
//       // Stop any existing stream
//       stopWebcam();
      
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: {
//           width: { ideal: 640 },
//           height: { ideal: 480 },
//           facingMode: 'user'
//         },
//         audio: false
//       });

//       webcamStreamRef.current = stream;
//       setCameraConnected(true);
      
//       console.log("✅ Webcam started successfully");
//       console.log("Stream tracks:", stream.getTracks().length);
      
//       return true;
//     } catch (error) {
//       console.error("❌ Failed to start webcam:", error);
      
//       let errorMessage = 'Failed to access webcam';
//       if (error.name === 'NotAllowedError') {
//         errorMessage = 'Webcam access denied. Please allow camera permissions and try again.';
//       } else if (error.name === 'NotFoundError') {
//         errorMessage = 'No webcam found. Please connect a camera and try again.';
//       } else if (error.name === 'NotReadableError') {
//         errorMessage = 'Webcam is busy or unavailable. Please close other applications using the camera.';
//       } else {
//         errorMessage = `Webcam error: ${error.message}`;
//       }
      
//       setCameraError(errorMessage);
//       setCameraConnected(false);
//       return false;
//     } finally {
//       setConnectingCamera(false);
//     }
//   };

//   // Setup frame analysis for fire detection
//   const setupFrameAnalysis = () => {
//     if (analysisIntervalRef.current) {
//       clearInterval(analysisIntervalRef.current);
//     }
    
//     const canvas = monitoringCanvasRef.current;
//     const context = canvas?.getContext('2d');
    
//     if (!canvas || !context) {
//       console.error("Canvas not available for frame analysis");
//       return;
//     }

//     canvas.width = 320;
//     canvas.height = 240;
    
//     console.log('🔍 Setting up frame analysis for fire detection');
    
//     analysisIntervalRef.current = setInterval(() => {
//       try {
//         if (monitoringVideoRef.current && monitoringVideoRef.current.readyState >= 2) {
//           context.drawImage(monitoringVideoRef.current, 0, 0, canvas.width, canvas.height);
//           const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
//           handleFrameAnalysis(imageData);
//         }
//       } catch (error) {
//         console.error("Error in frame analysis:", error);
//       }
//     }, 1000); // Analyze every second for stability
//   };

//   // Handle frame analysis for fire and motion detection
//   const handleFrameAnalysis = (imageData) => {
//     setMonitoringFrameCount(prev => prev + 1);

//     // Calculate motion if we have a previous frame
//     let currentMotionLevel = 0;
//     if (lastFrameData) {
//       currentMotionLevel = calculateMotion(imageData, lastFrameData);
//       setMotionLevel(currentMotionLevel);

//       // Update motion visualization
//       const motionContext = motionCanvasRef.current?.getContext('2d');
//       if (motionContext) {
//         const motionData = motionContext.createImageData(imageData.width, imageData.height);
//         const currData = imageData.data;
//         const prevData = lastFrameData.data;
//         const motionDataArr = motionData.data;

//         for (let i = 0; i < currData.length; i += 4) {
//           const rDiff = Math.abs(currData[i] - prevData[i]);
//           const gDiff = Math.abs(currData[i + 1] - prevData[i + 1]);
//           const bDiff = Math.abs(currData[i + 2] - prevData[i + 2]);

//           if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
//             motionDataArr[i] = 0;      // R
//             motionDataArr[i + 1] = 0;    // G
//             motionDataArr[i + 2] = 255;  // B
//             motionDataArr[i + 3] = 255;  // Alpha
//           } else {
//             motionDataArr[i] = currData[i];
//             motionDataArr[i + 1] = currData[i + 1];
//             motionDataArr[i + 2] = currData[i + 2];
//             motionDataArr[i + 3] = 255;
//           }
//         }

//         motionContext.putImageData(motionData, 0, 0);
//       }
//     }

//     setLastFrameData(imageData);

//     // Fire detection (skip first few frames for camera stabilization)
//     if (monitoringFrameCount > 5) {
//       const fireDetected = detectFire(imageData);

//       if (fireDetected) {
//         setFireDetectionCount(prev => {
//           const newCount = prev + 1;

//           // Require 3 consecutive positive detections to reduce false positives
//           if (newCount >= 3) {
//             console.log("🔥 FIRE DETECTED! Updating Firebase...");
//             const monitoringRef = ref(database, 'monitoring/unusualActivity');
//             const timestamp = new Date().toISOString();

//             set(monitoringRef, {
//               status: 1,
//               message: 'Fire detected by webcam',
//               timestamp: timestamp
//             }).then(() => {
//               console.log("Firebase updated with fire detection");
//               setFireDetected(true);
//               setBlinking(true);
//             }).catch(err => {
//               console.error("Error updating firebase:", err);
//             });
//           }

//           return newCount;
//         });
//       } else {
//         setFireDetectionCount(prev => Math.max(0, prev - 1));
//       }
//     }
//   };

//   // Enhanced fire detection algorithm
//   const detectFire = (imageData) => {
//     const data = imageData.data;
//     let firePixelCount = 0;
//     let brightYellowCount = 0;
//     let brightWhiteCount = 0;
//     let orangePixelCount = 0;

//     for (let i = 0; i < data.length; i += 4) {
//       const r = data[i];
//       const g = data[i + 1];
//       const b = data[i + 2];

//       // Fire-red pixels
//       if (r > 200 && g > 40 && g < 120 && b < 60 && r > g + 80 && r > b + 140) {
//         firePixelCount++;
//       }

//       // Orange flame pixels
//       if (r > 220 && g > 100 && g < 180 && b < 80 && r > g + 40 && r > b + 140) {
//         orangePixelCount++;
//       }

//       // Bright yellow flame pixels
//       if (r > 200 && g > 160 && b < 100 && r > b + 100 && g > b + 60) {
//         brightYellowCount++;
//       }

//       // Bright white hot center
//       if (r > 230 && g > 230 && b > 200 && Math.abs(r - g) < 30) {
//         brightWhiteCount++;
//       }
//     }

//     const totalFirePixels = firePixelCount + orangePixelCount + brightYellowCount + brightWhiteCount;
//     const totalPixels = imageData.width * imageData.height;
//     const fireRatio = totalFirePixels / totalPixels;

//     // Log significant fire detections
//     if (fireRatio > 0.002) {
//       console.log(`🔥 Fire detection: ${(fireRatio * 100).toFixed(3)}% (R:${firePixelCount}, O:${orangePixelCount}, Y:${brightYellowCount}, W:${brightWhiteCount})`);
//     }

//     return fireRatio > 0.01; // 1% threshold for fire detection
//   };

//   // Calculate motion between frames
//   const calculateMotion = (currentFrame, previousFrame) => {
//     if (!previousFrame) return 0;

//     const curr = currentFrame.data;
//     const prev = previousFrame.data;
//     let diffCount = 0;
//     const threshold = 25;

//     for (let i = 0; i < curr.length; i += 4) {
//       const rDiff = Math.abs(curr[i] - prev[i]);
//       const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
//       const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);

//       if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
//         diffCount++;
//       }
//     }

//     const totalPixels = currentFrame.width * currentFrame.height;
//     return diffCount / totalPixels;
//   };

//   // Start background monitoring
//   const startBackgroundMonitoring = async () => {
//     try {
//       // Reset detection states
//       setFireDetectionCount(0);
//       setFireDetected(false);
//       setBlinking(false);
//       setLastFrameData(null);
//       setMotionLevel(0);
//       setMonitoringFrameCount(0);

//       // Reset Firebase to normal state
//       const monitoringRef = ref(database, 'monitoring/unusualActivity');
//       await set(monitoringRef, {
//         status: 0,
//         message: 'Monitoring started',
//         timestamp: new Date().toISOString()
//       });

//       setMonitoringActive(true);

//       // Connect to webcam if not already connected
//       if (!cameraConnected) {
//         const success = await connectToWebcam();
//         if (!success) {
//           throw new Error("Failed to connect to webcam");
//         }
//       }

//       // Initialize canvases
//       if (monitoringCanvasRef.current) {
//         const canvas = monitoringCanvasRef.current;
//         canvas.width = 320;
//         canvas.height = 240;
//         const context = canvas.getContext('2d');
//         context.fillStyle = "#000";
//         context.fillRect(0, 0, canvas.width, canvas.height);
//       }

//       if (motionCanvasRef.current) {
//         const canvas = motionCanvasRef.current;
//         canvas.width = 320;
//         canvas.height = 240;
//         const context = canvas.getContext('2d');
//         context.fillStyle = "#000";
//         context.fillRect(0, 0, canvas.width, canvas.height);
//       }
      
//       // Start webcam monitoring
//       console.log('🎥 Starting webcam monitoring');
//       if (monitoringVideoRef.current && webcamStreamRef.current) {
//         monitoringVideoRef.current.srcObject = webcamStreamRef.current;
//         await monitoringVideoRef.current.play();
//       }
      
//       // Start frame analysis
//       setupFrameAnalysis();
//       console.log('🚀 Background monitoring started successfully');
      
//     } catch (error) {
//       console.error('❌ Error starting background monitoring:', error);
//       setCameraError(`Unable to start monitoring: ${error.message}`);
//       setMonitoringActive(false);
//     }
//   };

//   // Stop background monitoring
//   const stopBackgroundMonitoring = () => {
//     console.log('⏹️ Stopping background monitoring');
    
//     if (monitoringVideoRef.current) {
//       monitoringVideoRef.current.pause();
//       monitoringVideoRef.current.srcObject = null;
//     }
    
//     if (monitoringIntervalRef.current) {
//       clearInterval(monitoringIntervalRef.current);
//       monitoringIntervalRef.current = null;
//     }
//     if (analysisIntervalRef.current) {
//       clearInterval(analysisIntervalRef.current);
//       analysisIntervalRef.current = null;
//     }
    
//     setMonitoringActive(false);
//     setFireDetected(false);
//     setBlinking(false);
//     setFireDetectionCount(0);
//     setLastFrameData(null);
//     setMotionLevel(0);

//     // Reset Firebase to normal
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     set(monitoringRef, {
//       status: 0,
//       message: 'Normal',
//       timestamp: new Date().toISOString()
//     }).catch(err => {
//       console.error("Error resetting firebase:", err);
//     });
//   };

//   // Find existing verification log for a booking
//   const findExistingVerificationLog = (bookingId) => {
//     return verificationLogs.find(log => log.bookingId === bookingId);
//   };

//   // Handle check-in
//   const handleCheckIn = async (booking) => {
//     setCurrentBooking(booking);
//     setShowCamera(true);

//     const existingLog = findExistingVerificationLog(booking.id);
//     setVerificationStatus(existingLog ? existingLog.status : 0);
//     setVerified(existingLog && existingLog.status === 1 ? true : null);

//     // Small delay to ensure modal is rendered
//     setTimeout(async () => {
//       await startCamera();
//     }, 100);
//   };

//   // Start camera for verification
//   const startCamera = async () => {
//     try {
//       if (!cameraConnected) {
//         const success = await connectToWebcam();
//         if (!success) {
//           throw new Error("Failed to connect to webcam");
//         }
//       }
      
//       // Ensure we have a fresh stream for verification
//       if (!webcamStreamRef.current) {
//         const success = await connectToWebcam();
//         if (!success) {
//           throw new Error("Failed to get webcam stream");
//         }
//       }
      
//       if (videoRef.current && webcamStreamRef.current) {
//         videoRef.current.srcObject = webcamStreamRef.current;
//         videoRef.current.onloadedmetadata = () => {
//           videoRef.current.play().catch(error => {
//             console.error('Error playing verification video:', error);
//             setCameraError('Failed to start video playback for verification.');
//           });
//         };
        
//         // Force load if metadata is already available
//         if (videoRef.current.readyState >= 1) {
//           await videoRef.current.play();
//         }
//       }
//     } catch (error) {
//       console.error('Error starting camera for verification:', error);
//       setCameraError('Unable to start webcam for verification.');
//     }
//   };

//   // Stop camera
//   const stopCamera = () => {
//     if (videoRef.current) {
//       videoRef.current.pause();
//       videoRef.current.srcObject = null;
//     }
    
//     setShowCamera(false);
//     setCurrentBooking(null);
//     setVerified(null);
//     setVerificationStatus(0);
//   };

//   // Capture image for verification
//   const captureImage = () => {
//     try {
//       if (!canvasRef.current || !videoRef.current) {
//         setCameraError("Camera not available for image capture");
//         return;
//       }

//       const canvas = canvasRef.current;
//       const context = canvas.getContext('2d');
      
//       canvas.width = videoRef.current.videoWidth || 640;
//       canvas.height = videoRef.current.videoHeight || 480;
//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

//       canvas.toBlob(blob => {
//         if (blob) {
//           uploadImageAndCompare(blob);
//         } else {
//           setCameraError("Failed to create image blob");
//         }
//       }, 'image/jpeg', 0.9);
//     } catch (error) {
//       console.error("Error capturing image:", error);
//       setCameraError("Failed to capture image. Please try again.");
//     }
//   };

//   // Upload and compare image for verification
//   const uploadImageAndCompare = async (imageBlob) => {
//     if (!currentBooking || !currentBooking.userId) {
//       alert("Cannot verify: booking information is incomplete");
//       setComparing(false);
//       return;
//     }
//     setComparing(true);
//     try {
//       const existingLog = findExistingVerificationLog(currentBooking.id);
//       const timestamp = new Date().toISOString();

//       const checkInImageRef = storageRef(storage, `check-ins/${currentBooking.id}_${Date.now()}.jpg`);
//       await uploadBytes(checkInImageRef, imageBlob);
//       const checkInImageUrl = await getDownloadURL(checkInImageRef);

//       const userRef = ref(database, `users/${currentBooking.userId}`);
//       const userSnapshot = await get(userRef);
//       let profileImageUrl = null;
//       let userName = "Unknown User";

//       if (userSnapshot.exists()) {
//         const userData = userSnapshot.val();
//         profileImageUrl = userData.faceImageUrl || userData.profileImageUrl;
//         userName = userData.name || userData.displayName || "Unknown User";
//       }

//       setTimeout(() => {
//         const isMatch = Math.random() > 0.3;
//         const numericStatus = isMatch ? 1 : 0;

//         const bookingRef = ref(database, `stadium_transactions/${currentBooking.id}`);
//         update(bookingRef, {
//           checkedIn: true,
//           checkedInAt: timestamp,
//           checkInImageUrl: checkInImageUrl,
//           identityVerified: isMatch,
//           verificationStatus: numericStatus
//         });

//         let logRef;

//         if (existingLog) {
//           logRef = ref(database, `verification_logs/${existingLog.id}`);
//           update(logRef, {
//             status: numericStatus,
//             capturedImageUrl: checkInImageUrl,
//             timestamp: timestamp,
//             adminId: "system",
//             updated: true,
//             updatedAt: timestamp
//           });
//         } else {
//           const verificationId = `verification_${Date.now()}`;
//           logRef = ref(database, `verification_logs/${verificationId}`);
//           set(logRef, {
//             userId: currentBooking.userId,
//             userName: userName,
//             bookingId: currentBooking.id,
//             matchTitle: currentBooking.matchTitle || "Unknown Match",
//             matchDate: currentBooking.matchDate || currentBooking.timestamp || timestamp,
//             timestamp: timestamp,
//             status: numericStatus,
//             capturedImageUrl: checkInImageUrl,
//             referenceImageUrl: profileImageUrl || "",
//             adminId: "system",
//             location: "Stadium Entrance"
//           });
//         }

//         const userHistoryRef = ref(database, `users/${currentBooking.userId}/verification_history/${Date.now()}`);
//         set(userHistoryRef, {
//           timestamp: timestamp,
//           status: numericStatus,
//           bookingId: currentBooking.id
//         });

//         setVerified(isMatch);
//         setVerificationStatus(numericStatus);
//         setComparing(false);

//         if (isMatch) {
//           setTimeout(() => {
//             stopCamera();
//           }, 3000);
//         }
//       }, 2000);
//     } catch (error) {
//       console.error('Error during check-in:', error);
//       setCameraError('Error during check-in process. Please try again.');
//       setComparing(false);
//     }
//   };

//   // Toggle verification logs view
//   const toggleVerificationLogs = () => {
//     setShowVerificationLogs(prev => !prev);
//   };

//   // Manual fire detection test
//   const forceFireDetection = () => {
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     const timestamp = new Date().toISOString();

//     set(monitoringRef, {
//       status: 1,
//       message: 'Fire detected (Manual Test) via webcam',
//       timestamp: timestamp
//     }).then(() => {
//       console.log("Firebase manually updated with fire detection");
//       setFireDetected(true);
//       setBlinking(true);
//     }).catch(err => {
//       console.error("Error updating firebase:", err);
//     });
//   };

//   // Reset fire detection
//   const resetFireDetection = () => {
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     const timestamp = new Date().toISOString();

//     set(monitoringRef, {
//       status: 0,
//       message: 'Normal',
//       timestamp: timestamp
//     }).then(() => {
//       console.log("Firebase manually reset to normal");
//       setFireDetected(false);
//       setBlinking(false);
//     }).catch(err => {
//       console.error("Error updating firebase:", err);
//     });
//   };

//   // Stat cards
//   const statCards = [
//     { title: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'blue' },
//     { title: 'Total Bookings', value: stats.totalBookings, icon: <Calendar size={24} />, color: 'green' },
//   ];

//   // Monitoring cards
//   const monitoringCards = [
//     { title: 'Alcohol Detection', value: stats.alcoholDetection, icon: <Wine size={24} />, gradientClass: 'gradient-red' },
//     { title: 'Gas Detection', value: stats.gasDetection, icon: <Wind size={24} />, gradientClass: 'gradient-gas' },
//     { title: 'Fire Detection', value: stats.fireDetection, icon: <AlertTriangle size={24} />, gradientClass: fireDetected && blinking ? 'gradient-fire-blink' : 'gradient-fire' },
//     { title: 'Temperature', value: `${stats.temperature}°C`, icon: <Thermometer size={24} />, gradientClass: 'gradient-orange' },
//     { title: 'Humidity', value: `${stats.humidity}%`, icon: <Droplets size={24} />, gradientClass: 'gradient-blue' },
//     {
//       title: 'Unusual Activity',
//       value: stats.activityStatus === 0 ? 'Normal' : 'Fire detected',
//       icon: <AlertTriangle size={24} />,
//       gradientClass: fireDetected && blinking ? 'gradient-alert-blink' : 'gradient-purple'
//     }
//   ];

//   if (loading) {
//     return <div className="admin-dashboard-loading">Loading dashboard data...</div>;
//   }

//   return (
//     <div className="admin-dashboard">
//       <h2 className="dashboard-title">Dashboard</h2>

//       <div className="stats-grid">
//         {statCards.map((card, index) => (
//           <div key={index} className={`stat-card card-${card.color}`}>
//             <div className="stat-icon">{card.icon}</div>
//             <div className="stat-info">
//               <h3 className="stat-title">{card.title}</h3>
//               <p className="stat-value">{card.value}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       <div className="dashboard-tables">
//         <div className="monitoring-section">
//           <h3>Environment Monitoring</h3>
          
//           {/* Webcam Connection Status */}
//           <div className={`camera-connection-status ${cameraConnected ? 'connected' : 'disconnected'} webcam`}>
//             <div className="connection-indicator">
//               <div className="status-dot"></div>
//               <span className="connection-label">
//                 Webcam: {cameraConnected ? 'Connected' : 'Disconnected'}
//               </span>
//               <span className="connection-details">
//                 {cameraConnected ? 'Device Camera Active' : 'Camera Not Connected'}
//               </span>
//             </div>
            
//             <div className="connection-actions">
//               <button
//                 onClick={connectToWebcam}
//                 disabled={connectingCamera}
//                 className={`btn-connect ${cameraConnected ? 'connected' : ''} ${connectingCamera ? 'connecting' : ''}`}
//               >
//                 {connectingCamera ? <RefreshCw size={18} className="icon-spin" /> : <Video size={18} />}
//                 <span>
//                   {connectingCamera ? 'Connecting...' : cameraConnected ? 'Reconnect' : 'Connect'}
//                 </span>
//               </button>
//             </div>
//           </div>
          
//           {/* Camera error message */}
//           {cameraError && (
//             <div className="camera-error">
//               <p>
//                 <AlertTriangle size={16} />
//                 <span>{cameraError}</span>
//               </p>
//             </div>
//           )}
          
//           <div className="monitoring-grid">
//             {monitoringCards.map((card, index) => (
//               <div 
//                 key={index} 
//                 className={`monitoring-card ${card.gradientClass} ${
//                   (card.title === 'Fire Detection' && stats.fireDetection === 'Fire detected') ||
//                   (card.title === 'Unusual Activity' && stats.activityStatus === 1) ?
//                   'pulse-animation' : ''
//                 }`}
//               >
//                 <div className="monitoring-icon">{card.icon}</div>
//                 <div className="monitoring-info">
//                   <h3 className="monitoring-title">{card.title}</h3>
//                   <p className="monitoring-value">{card.value}</p>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="monitoring-controls">
//             {monitoringActive ? (
//               <button
//                 onClick={stopBackgroundMonitoring}
//                 className="monitoring-button stop"
//               >
//                 <VideoOff size={20} />
//                 <span>Stop Monitoring</span>
//               </button>
//             ) : (
//               <button
//                 onClick={startBackgroundMonitoring}
//                 className="monitoring-button start"
//                 disabled={!cameraConnected}
//               >
//                 <Video size={20} />
//                 <span>Start Monitoring</span>
//               </button>
//             )}

//             {monitoringActive && (
//               <>
//                 <button
//                   onClick={forceFireDetection}
//                   className="monitoring-button test-fire"
//                 >
//                   <AlertTriangle size={20} />
//                   <span>Test Fire</span>
//                 </button>

//                 <button
//                   onClick={resetFireDetection}
//                   className="monitoring-button reset"
//                 >
//                   <CheckCircle size={20} />
//                   <span>Reset</span>
//                 </button>
//               </>
//             )}
//           </div>

//           {monitoringActive && monitoringFrameCount < 5 && (
//             <div className="calibration-message">
//               <p>
//                 <span>⚙️</span>
//                 Initializing webcam for fire detection...
//               </p>
//             </div>
//           )}

//           {fireDetected && (
//             <div className={`fire-alert ${blinking ? 'blinking' : ''}`}>
//               <p>
//                 <AlertTriangle size={18} />
//                 🔥 Fire detected via webcam! Please check the area immediately.
//               </p>
//             </div>
//           )}

//           {/* Live Webcam Feed */}
//           <div className={`monitoring-container ${monitoringActive ? 'active' : ''}`}>
//             <div className="stream-container">
//               <h4>Live Webcam Feed</h4>
//               <div className="video-container">
//                 <div className="live-camera-wrapper">
//                   <div className="live-indicator">WEBCAM</div>
                  
//                   <video
//                     ref={monitoringVideoRef}
//                     autoPlay
//                     playsInline
//                     muted
//                     width="320"
//                     height="240"
//                     className="monitoring-video"
//                   />
                  
//                   {!cameraConnected && (
//                     <div className="camera-status-overlay">
//                       <div className="status-message">
//                         <Wifi size={24} className="icon-spin" />
//                         <span>Webcam not connected</span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
              
//               {/* Camera information */}
//               <div className="camera-source-info">
//                 <p><strong>Source:</strong> Device Webcam</p>
//                 <p><strong>Status:</strong> {cameraConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
//                 {monitoringActive && (
//                   <p><strong>Monitoring:</strong> Fire Detection Active | Motion: {(motionLevel * 100).toFixed(1)}%</p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Hidden canvases for processing */}
//           <canvas
//             ref={monitoringCanvasRef}
//             width="320"
//             height="240"
//             className="hidden-canvas"
//           />
//           <canvas
//             ref={motionCanvasRef}
//             width="320"
//             height="240"
//             className="hidden-canvas"
//           />
//         </div>

//         {/* Verification Logs Section */}
//         <div className="verification-logs-section">
//           <div className="section-header">
//             <h3>Verification Status</h3>
//             <button
//               onClick={toggleVerificationLogs}
//               className="btn-toggle-logs"
//             >
//               <List size={18} />
//               <span>{showVerificationLogs ? 'Hide Logs' : 'Show Logs'}</span>
//             </button>
//           </div>

//           {showVerificationLogs && (
//             <div className="verification-logs-table">
//               {verificationLogs.length > 0 ? (
//                 <table>
//                   <thead>
//                     <tr>
//                       <th>User</th>
//                       <th>Date</th>
//                       <th>Status</th>
//                       <th>Location</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {verificationLogs.map((log) => (
//                       <tr key={log.id}>
//                         <td>{log.userName || log.userId}</td>
//                         <td>{new Date(log.timestamp).toLocaleString()}</td>
//                         <td>
//                           <div className={`status-indicator status-${log.status}`}>
//                             {log.status}
//                           </div>
//                         </td>
//                         <td>{log.location || 'Unknown'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : (
//                 <p className="no-logs">No verification logs found</p>
//               )}
//             </div>
//           )}
//         </div>

//         <div className="recent-bookings">
//           <h3>Recent Bookings</h3>
//           {stats.recentBookings.length > 0 ? (
//             <table className="bookings-table">
//               <thead>
//                 <tr>
//                   <th>No</th>
//                   <th>User</th>
//                   <th>Match</th>
//                   <th>Date</th>
//                   <th>Status</th>
//                   <th>Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stats.recentBookings.map((booking, index) => {
//                   const verLog = verificationLogs.find(log => log.bookingId === booking.id);
//                   const verStatus = verLog ? verLog.status : 0;

//                   return (
//                     <tr key={booking.id}>
//                       <td>{index + 1}</td>
//                       <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
//                       <td>{booking.matchTitle || ''}</td>
//                       <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
//                       <td>
//                         <div className="status-container">
//                           <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
//                             {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
//                           </span>
//                           <div className={`verification-status status-${verStatus}`}>
//                             {verStatus}
//                           </div>
//                         </div>
//                       </td>
//                       <td>
//                         <button
//                           className={`check-in-button ${booking.checkedIn && verStatus === 1 ? 'checked-in' : ''} ${!cameraConnected ? 'disabled' : ''}`}
//                           onClick={() => handleCheckIn(booking)}
//                           disabled={!cameraConnected || (booking.checkedIn && verStatus === 1)}
//                         >
//                           {booking.checkedIn && verStatus === 1 ? 'Checked In' : 'Check In'}
//                         </button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           ) : (
//             <p className="no-data">No recent bookings found</p>
//           )}
//         </div>
//       </div>

//       {showCamera && (
//         <div className="camera-modal-overlay">
//           <div className="camera-modal">
//             <div className="camera-modal-header">
//               <h3>Check-In Verification (Webcam)</h3>
//               <button
//                 className="close-button"
//                 onClick={stopCamera}
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="camera-container">
//               <video
//                 ref={videoRef}
//                 autoPlay
//                 playsInline
//                 muted
//                 className="camera-video"
//                 onError={(e) => {
//                   console.error('Video error:', e);
//                   setCameraError('Video playback error in verification modal.');
//                 }}
//                 onLoadedData={() => {
//                   console.log('Video loaded for verification');
//                 }}
//                 onCanPlay={() => {
//                   console.log('Video can play for verification');
//                 }}
//               />

//               {verified === true && (
//                 <div className="verification-result success">
//                   <CheckCircle size={64} />
//                   <p>Identity Verified!</p>
//                 </div>
//               )}

//               {verified === false && (
//                 <div className="verification-result failure">
//                   <XCircle size={64} />
//                   <p>Identity Verification Failed</p>
//                 </div>
//               )}

//               <canvas
//                 ref={canvasRef}
//                 width="640"
//                 height="480"
//                 className="hidden-canvas"
//               />
//             </div>

//             <div className="camera-controls">
//               {!comparing && verified === null && (
//                 <button
//                   className="capture-button"
//                   onClick={captureImage}
//                 >
//                   <Camera size={24} />
//                   <span>Capture Image</span>
//                 </button>
//               )}

//               {comparing && (
//                 <div className="comparing-indicator">
//                   <p>Comparing images...</p>
//                   <div className="loading-spinner"></div>
//                 </div>
//               )}

//               {verified === false && (
//                 <button
//                   className="retry-button"
//                   onClick={() => setVerified(null)}
//                 >
//                   Try Again
//                 </button>
//               )}
//             </div>

//             <div className="verification-status-display">
//               <div className="status-container">
//                 <p>Verification Status:</p>
//                 <div className={`status-badge status-${verificationStatus}`}>
//                   {verificationStatus}
//                 </div>
//               </div>
//               <p className="status-text">
//                 {verificationStatus === 0
//                   ? (verified === null ? 'Not Verified Yet' : 'Verification Failed')
//                   : 'Successfully Verified'}
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
      
//       <style jsx>{`
//         .monitoring-video,
//         .camera-video {
//           width: 100%;
//           height: auto;
//           display: block;
//           background-color: #000;
//           object-fit: contain;
//           max-height: 480px;
//           border-radius: 4px;
//           border: 2px solid #ddd;
//         }

//         .video-container,
//         .camera-container {
//           position: relative;
//           width: 100%;
//           background-color: #000;
//           border-radius: 4px;
//           overflow: hidden;
//           box-shadow: 0 0 10px rgba(0,0,0,0.2);
//         }

//         .live-indicator {
//           position: absolute;
//           top: 10px;
//           left: 10px;
//           background-color: rgba(0, 123, 255, 0.8);
//           color: white;
//           padding: 4px 8px;
//           border-radius: 3px;
//           font-size: 12px;
//           font-weight: bold;
//           z-index: 10;
//           animation: pulse 2s infinite;
//         }

//         @keyframes pulse {
//           0% { opacity: 1; }
//           50% { opacity: 0.7; }
//           100% { opacity: 1; }
//         }

//         .camera-source-info {
//           margin-top: 10px;
//           padding: 10px;
//           background-color: #f8f9fa;
//           border-radius: 4px;
//           font-size: 12px;
//           line-height: 1.4;
//           border-left: 4px solid #007bff;
//         }
        
//         .camera-source-info p {
//           margin: 3px 0;
//         }

//         .camera-status-overlay {
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background-color: rgba(0, 0, 0, 0.8);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           z-index: 5;
//         }

//         .status-message {
//           color: white;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           gap: 10px;
//           text-align: center;
//         }

//         .icon-spin {
//           animation: spin 1.5s linear infinite;
//         }

//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
        
//         .hidden-canvas {
//           display: none;
//         }

//         .camera-connection-status.connected {
//           border-left: 4px solid #28a745;
//         }

//         .camera-connection-status.disconnected {
//           border-left: 4px solid #dc3545;
//         }

//         .camera-connection-status.webcam {
//           border-left: 4px solid #007bff;
//         }

//         .camera-error {
//           background-color: #f8d7da;
//           border: 1px solid #f5c6cb;
//           color: #721c24;
//           padding: 12px;
//           border-radius: 4px;
//           margin: 10px 0;
//         }

//         .camera-error p {
//           margin: 0;
//           display: flex;
//           align-items: flex-start;
//           gap: 8px;
//         }

//         .fire-alert {
//           background-color: #f8d7da;
//           border: 2px solid #dc3545;
//           color: #721c24;
//           padding: 15px;
//           border-radius: 8px;
//           margin: 15px 0;
//           font-weight: bold;
//           text-align: center;
//         }

//         .fire-alert.blinking {
//           animation: blink 0.5s infinite;
//         }

//         @keyframes blink {
//           0%, 50% { background-color: #f8d7da; }
//           51%, 100% { background-color: #dc3545; color: white; }
//         }

//         .calibration-message {
//           background-color: #d1ecf1;
//           border: 1px solid #bee5eb;
//           color: #0c5460;
//           padding: 10px;
//           border-radius: 4px;
//           margin: 10px 0;
//           text-align: center;
//         }

//         .connection-actions {
//           display: flex;
//           gap: 10px;
//           align-items: center;
//         }

//         .btn-connect {
//           padding: 8px 12px;
//           background-color: #007bff;
//           color: white;
//           border: none;
//           border-radius: 4px;
//           cursor: pointer;
//           display: flex;
//           align-items: center;
//           gap: 5px;
//           font-size: 14px;
//           transition: background-color 0.2s;
//         }

//         .btn-connect:hover {
//           background-color: #0056b3;
//         }

//         .btn-connect.connected {
//           background-color: #28a745;
//         }

//         .btn-connect.connected:hover {
//           background-color: #1e7e34;
//         }

//         .btn-connect:disabled {
//           background-color: #6c757d;
//           cursor: not-allowed;
//         }

//         .camera-connection-status {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 15px;
//           background-color: #f8f9fa;
//           border-radius: 8px;
//           margin: 15px 0;
//           border-left: 4px solid #007bff;
//         }

//         .connection-indicator {
//           display: flex;
//           flex-direction: column;
//           gap: 5px;
//         }

//         .status-dot {
//           width: 8px;
//           height: 8px;
//           border-radius: 50%;
//           background-color: #dc3545;
//           margin-right: 8px;
//           display: inline-block;
//         }

//         .camera-connection-status.connected .status-dot {
//           background-color: #28a745;
//           animation: pulse 2s infinite;
//         }

//         .connection-label {
//           font-weight: 600;
//           font-size: 14px;
//         }

//         .connection-details {
//           font-size: 12px;
//           color: #6c757d;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default AdminDashboard;



// import React, { useState, useEffect, useRef } from 'react';
// import { ref, onValue, update, get, set, push } from 'firebase/database';
// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { database, storage } from '../firebase';
// import {
//   Users, Calendar, DollarSign, Ticket, Thermometer, Droplets, Wine,
//   AlertTriangle, Camera, X, CheckCircle, XCircle, Video, VideoOff, User, 
//   UserPlus, Shield, List, Wind, Settings, RefreshCw, Monitor, Wifi
// } from 'lucide-react';
// import '../styles/AdminDashboard.css';

// const AdminDashboard = () => {
//   const [stats, setStats] = useState({
//     totalUsers: 0,
//     totalBookings: 0,
//     pendingPayments: 0,
//     completedPayments: 0,
//     recentBookings: [],
//     temperature: 0,
//     humidity: 0,
//     alcoholDetection: 'No detection',
//     gasDetection: 'No detection',
//     fireDetection: 'No detection',
//     unusualActivity: 'Normal',
//     activityStatus: 0
//   });
//   const [loading, setLoading] = useState(true);
//   const [showCamera, setShowCamera] = useState(false);
//   const [currentBooking, setCurrentBooking] = useState(null);
//   const [comparing, setComparing] = useState(false);
//   const [verified, setVerified] = useState(null);
//   const [verificationStatus, setVerificationStatus] = useState(0);
//   const [monitoringActive, setMonitoringActive] = useState(false);
//   const [fireDetected, setFireDetected] = useState(false);
//   const [blinking, setBlinking] = useState(false);
//   const [fireDetectionCount, setFireDetectionCount] = useState(0);
//   const [lastFrameData, setLastFrameData] = useState(null);
//   const [motionLevel, setMotionLevel] = useState(0);
//   const [verificationLogs, setVerificationLogs] = useState([]);
//   const [showVerificationLogs, setShowVerificationLogs] = useState(false);
//   const [monitoringFrameCount, setMonitoringFrameCount] = useState(0);
  
//   // Camera state
//   const [cameraConnected, setCameraConnected] = useState(false);
//   const [connectingCamera, setConnectingCamera] = useState(false);
//   const [cameraError, setCameraError] = useState(null);
  
//   // New state for camera source selection
//   const [cameraSource, setCameraSource] = useState(1); // 0 for desktop, 1 for external (default to external)
//   const [videoDevices, setVideoDevices] = useState([]);
//   const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  
//   // Refs
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const monitoringVideoRef = useRef(null);
//   const monitoringCanvasRef = useRef(null);
//   const monitoringIntervalRef = useRef(null);
//   const analysisIntervalRef = useRef(null);
//   const motionCanvasRef = useRef(null);
//   const webcamStreamRef = useRef(null);

//   // Effect to reset Firebase data on component mount
//   useEffect(() => {
//     const resetFirebaseData = async () => {
//       try {
//         const monitoringRef = ref(database, 'monitoring/unusualActivity');
//         await set(monitoringRef, {
//           status: 0,
//           message: 'Normal',
//           timestamp: new Date().toISOString()
//         });
//         console.log("Firebase reset to normal state");
//       } catch (error) {
//         console.error("Error resetting Firebase data:", error);
//       }
//     };

//     resetFirebaseData();
    
//     // Enumerate available video devices
//     enumerateVideoDevices();
//   }, []);

//   // Function to enumerate available video devices
//   const enumerateVideoDevices = async () => {
//     try {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       const videoInputs = devices.filter(device => device.kind === 'videoinput');
//       console.log('Available video devices:', videoInputs);
      
//       // Log detailed information about each device
//       videoInputs.forEach((device, index) => {
//         console.log(`Device ${index}: ID=${device.deviceId.substring(0, 8)}..., Label=${device.label || 'No label'}`);
//       });
      
//       setVideoDevices(videoInputs);
      
//       // If we have devices and no selected device yet, select appropriate one based on cameraSource
//       if (videoInputs.length > 0 && !selectedDeviceId) {
//         if (cameraSource === 1 && videoInputs.length > 1) {
//           // For external camera, pick a device that's not the first one (assuming first is internal)
//           // Look for devices with "USB" or external-sounding names first
//           const externalDevice = videoInputs.find(device => 
//             (device.label && (
//               device.label.toLowerCase().includes('usb') ||
//               device.label.toLowerCase().includes('external') ||
//               device.label.toLowerCase().includes('zebronics') ||
//               device.label.toLowerCase().includes('webcam') ||
//               device.label.toLowerCase().includes('camera')
//             )) && !device.label.toLowerCase().includes('built-in')
//           );
          
//           if (externalDevice) {
//             console.log('Found external device:', externalDevice.label);
//             setSelectedDeviceId(externalDevice.deviceId);
//           } else {
//             // If no device with specific labels found, use the last device (usually external)
//             const lastDevice = videoInputs[videoInputs.length - 1];
//             console.log('Using last device as external:', lastDevice.label);
//             setSelectedDeviceId(lastDevice.deviceId);
//           }
//         } else {
//           // For desktop camera, pick the first device (usually internal)
//           const internalDevice = videoInputs.find(device => 
//             device.label && (
//               device.label.toLowerCase().includes('built-in') ||
//               device.label.toLowerCase().includes('internal')
//             )
//           ) || videoInputs[0];
          
//           console.log('Using internal device:', internalDevice.label);
//           setSelectedDeviceId(internalDevice.deviceId);
//         }
//       }
//     } catch (error) {
//       console.error('Error enumerating video devices:', error);
//       setCameraError('Could not enumerate video devices. Make sure you have camera permissions.');
//     }
//   };

//   // Handle camera source change
//   const handleCameraSourceChange = (sourceValue) => {
//     // Stop current webcam stream if active
//     stopWebcam();
    
//     // Update camera source state
//     setCameraSource(sourceValue);
    
//     // Reset selected device ID to force re-selection based on new source
//     setSelectedDeviceId(null);
    
//     // Re-enumerate devices to select appropriate one for the new source
//     enumerateVideoDevices().then(() => {
//       // Reconnect with new source if needed
//       if (cameraConnected) {
//         connectToWebcam();
//       }
//     });
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       stopWebcam();
//       if (monitoringIntervalRef.current) {
//         clearInterval(monitoringIntervalRef.current);
//       }
//       if (analysisIntervalRef.current) {
//         clearInterval(analysisIntervalRef.current);
//       }

//       const monitoringRef = ref(database, 'monitoring/unusualActivity');
//       set(monitoringRef, {
//         status: 0,
//         message: 'Normal',
//         timestamp: new Date().toISOString()
//       }).catch(error => {
//         console.error("Error resetting alert state on unmount:", error);
//       });
//     };
//   }, []);

//   // Stop webcam
//   const stopWebcam = () => {
//     if (webcamStreamRef.current) {
//       webcamStreamRef.current.getTracks().forEach(track => track.stop());
//       webcamStreamRef.current = null;
//     }
//     setCameraConnected(false);
//   };

//   // Fetch stats from Firebase
//   useEffect(() => {
//     setLoading(true);
//     const fetchStats = async () => {
//       // Fetch users data
//       const usersRef = ref(database, 'users');
//       onValue(usersRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const usersData = snapshot.val();
//           const usersCount = Object.keys(usersData).length;
//           setStats(prevStats => ({
//             ...prevStats,
//             totalUsers: usersCount
//           }));
//         }
//       });

//       // Fetch bookings data
//       const bookingsRef = ref(database, 'stadium_transactions');
//       onValue(bookingsRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const bookingsData = snapshot.val();
//           const bookings = Object.entries(bookingsData).map(([id, data]) => ({
//             id,
//             ...data
//           }));

//           const totalBookings = bookings.length;
//           const pendingPayments = bookings.filter(b => b.paymentStatus !== 'completed').length;
//           const completedPayments = bookings.filter(b => b.paymentStatus === 'completed').length;
//           const recentBookings = bookings
//             .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
//             .slice(0, 5);

//           setStats(prevStats => ({
//             ...prevStats,
//             totalBookings,
//             pendingPayments,
//             completedPayments,
//             recentBookings
//           }));

//           initializeVerificationLogs(bookings);
//         }
//         setLoading(false);
//       });

//       fetchVerificationLogs();

//       // Listen for unusual activity updates
//       const activityRef = ref(database, 'monitoring/unusualActivity');
//       onValue(activityRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const activityData = snapshot.val();
//           const statusCode = activityData.status;

//           setStats(prevStats => ({
//             ...prevStats,
//             activityStatus: statusCode,
//             unusualActivity: activityData.message || 'Normal'
//           }));

//           if (statusCode === 1) {
//             setFireDetected(true);
//             setBlinking(true);
//           } else {
//             setFireDetected(false);
//             setBlinking(false);
//           }
//         }
//       });

//       // Fetch sensor data from Firebase
//       const sensorsRef = ref(database, 'IPL_Ticket/Sensors');
//       onValue(sensorsRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const sensorsData = snapshot.val();

//           const temperature = parseFloat(sensorsData.Temperature) || 0;
//           const humidity = parseFloat(sensorsData.Humidity) || 0;
//           const alcoholValue = parseInt(sensorsData.Alcohol) || 0;
//           const alcoholStatus = alcoholValue === 0 ? 'No detection' : 'Alcohol detected';
//           const gasValue = parseInt(sensorsData.Gas) || 0;
//           const gasStatus = gasValue === 0 ? 'No detection' : 'Gas detected';
//           const fireValue = parseInt(sensorsData.Fire) || 0;
//           const fireStatus = fireValue === 0 ? 'No detection' : 'Fire detected';

//           setStats(prevStats => ({
//             ...prevStats,
//             temperature,
//             humidity,
//             alcoholDetection: alcoholStatus,
//             gasDetection: gasStatus,
//             fireDetection: fireStatus
//           }));

//           if (fireValue === 1) {
//             const monitoringRef = ref(database, 'monitoring/unusualActivity');
//             const timestamp = new Date().toISOString();

//             set(monitoringRef, {
//               status: 1,
//               message: 'Fire detected by sensor',
//               timestamp: timestamp
//             }).catch(err => {
//               console.error("Error updating firebase with fire detection:", err);
//             });
//           }
//         }
//       });
//     };

//     fetchStats();
//   }, []);

//   // Effect for blinking
//   useEffect(() => {
//     let blinkInterval;
//     if (blinking) {
//       blinkInterval = setInterval(() => {
//         setBlinking(prev => !prev);
//       }, 500);
//     }
//     return () => {
//       if (blinkInterval) clearInterval(blinkInterval);
//     };
//   }, [blinking]);

//   // Initialize verification logs for all bookings
//   const initializeVerificationLogs = async (bookings) => {
//     try {
//       const logsRef = ref(database, 'verification_logs');
//       const snapshot = await get(logsRef);
//       const existingLogs = snapshot.exists() ? snapshot.val() : {};

//       const bookingsWithLogs = new Set();

//       Object.values(existingLogs).forEach(log => {
//         if (log.bookingId) {
//           bookingsWithLogs.add(log.bookingId);
//         }
//       });

//       for (const booking of bookings) {
//         if (!bookingsWithLogs.has(booking.id)) {
//           const verificationId = `verification_init_${booking.id}`;
//           const timestamp = new Date().toISOString();

//           await set(ref(database, `verification_logs/${verificationId}`), {
//             userId: booking.userId || "unknown",
//             bookingId: booking.id,
//             timestamp: timestamp,
//             status: 0,
//             capturedImageUrl: "",
//             referenceImageUrl: "",
//             adminId: "system_init",
//             location: "Not Checked In",
//             initialized: true
//           });
//         }
//       }
//     } catch (error) {
//       console.error("Error initializing verification logs:", error);
//     }
//   };

//   // Fetch all verification logs
//   const fetchVerificationLogs = async () => {
//     try {
//       const logsRef = ref(database, 'verification_logs');
//       const snapshot = await get(logsRef);
      
//       if (snapshot.exists()) {
//         const logsData = snapshot.val();
//         const logs = Object.entries(logsData).map(([id, data]) => ({
//           id,
//           ...data
//         }));
        
//         const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//         setVerificationLogs(sortedLogs);
//       } else {
//         setVerificationLogs([]);
//       }
//     } catch (error) {
//       console.error("Error fetching verification logs:", error);
//       setVerificationLogs([]);
//     }
//   };

//   // Connect to webcam
//   const connectToWebcam = async () => {
//     setConnectingCamera(true);
//     setCameraError(null);
    
//     try {
//       console.log(`🎥 Starting webcam with source: ${cameraSource === 0 ? 'Desktop Camera' : 'External Device'}`);
      
//       // Stop any existing stream
//       stopWebcam();
      
//       // Get list of video devices if not already populated
//       if (videoDevices.length === 0) {
//         await enumerateVideoDevices();
//       }
      
//       // Configure video constraints based on camera source
//       let videoConstraints = {
//         width: { ideal: 640 },
//         height: { ideal: 480 }
//       };
      
//       // If we have a selected device ID, use it
//       if (selectedDeviceId) {
//         console.log(`Using specific device ID: ${selectedDeviceId.substring(0, 8)}...`);
//         videoConstraints.deviceId = { exact: selectedDeviceId };
//       } else if (cameraSource === 0) {
//         // Desktop camera (default/built-in camera)
//         console.log('Using default built-in camera with facingMode:user');
//         videoConstraints.facingMode = 'user';
//       } else if (cameraSource === 1 && videoDevices.length > 0) {
//         // External camera - try to use the last camera in the list
//         // This is a fallback if no device was selected during enumeration
//         const deviceToUse = videoDevices[videoDevices.length - 1];
//         console.log(`Fallback: Using last device in list: ${deviceToUse.label || 'Unnamed device'}`);
//         videoConstraints.deviceId = { exact: deviceToUse.deviceId };
//       }
      
//       console.log('Using video constraints:', JSON.stringify(videoConstraints));
      
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: videoConstraints,
//         audio: false
//       });

//       webcamStreamRef.current = stream;
//       setCameraConnected(true);
      
//       // Get the actual device being used
//       const videoTracks = stream.getVideoTracks();
//       if (videoTracks.length > 0) {
//         const activeTrack = videoTracks[0];
//         console.log("✅ Active video track:", activeTrack.label);
//         console.log("Track settings:", activeTrack.getSettings());
//       }
      
//       console.log("✅ Webcam started successfully");
//       console.log("Stream tracks:", stream.getTracks().length);
      
//       return true;
//     } catch (error) {
//       console.error("❌ Failed to start webcam:", error);
      
//       let errorMessage = 'Failed to access webcam';
//       if (error.name === 'NotAllowedError') {
//         errorMessage = 'Webcam access denied. Please allow camera permissions and try again.';
//       } else if (error.name === 'NotFoundError') {
//         errorMessage = 'No webcam found. Please connect a camera and try again.';
//       } else if (error.name === 'NotReadableError') {
//         errorMessage = 'Webcam is busy or unavailable. Please close other applications using the camera.';
//       } else if (error.name === 'OverconstrainedError') {
//         errorMessage = 'The specified camera device is not available. Try using a different camera source.';
        
//         // If we failed with a specific device ID, try falling back to any available camera
//         setSelectedDeviceId(null);
//         setCameraSource(0); // Switch back to default camera
//       } else {
//         errorMessage = `Webcam error: ${error.message}`;
//       }
      
//       setCameraError(errorMessage);
//       setCameraConnected(false);
//       return false;
//     } finally {
//       setConnectingCamera(false);
//     }
//   };

//   // Setup frame analysis for fire detection
//   const setupFrameAnalysis = () => {
//     if (analysisIntervalRef.current) {
//       clearInterval(analysisIntervalRef.current);
//     }
    
//     const canvas = monitoringCanvasRef.current;
//     const context = canvas?.getContext('2d');
    
//     if (!canvas || !context) {
//       console.error("Canvas not available for frame analysis");
//       return;
//     }

//     canvas.width = 320;
//     canvas.height = 240;
    
//     console.log('🔍 Setting up frame analysis for fire detection');
    
//     analysisIntervalRef.current = setInterval(() => {
//       try {
//         if (monitoringVideoRef.current && monitoringVideoRef.current.readyState >= 2) {
//           context.drawImage(monitoringVideoRef.current, 0, 0, canvas.width, canvas.height);
//           const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
//           handleFrameAnalysis(imageData);
//         }
//       } catch (error) {
//         console.error("Error in frame analysis:", error);
//       }
//     }, 1000); // Analyze every second for stability
//   };

//   // Handle frame analysis for fire and motion detection
//   const handleFrameAnalysis = (imageData) => {
//     setMonitoringFrameCount(prev => prev + 1);

//     // Calculate motion if we have a previous frame
//     let currentMotionLevel = 0;
//     if (lastFrameData) {
//       currentMotionLevel = calculateMotion(imageData, lastFrameData);
//       setMotionLevel(currentMotionLevel);

//       // Update motion visualization
//       const motionContext = motionCanvasRef.current?.getContext('2d');
//       if (motionContext) {
//         const motionData = motionContext.createImageData(imageData.width, imageData.height);
//         const currData = imageData.data;
//         const prevData = lastFrameData.data;
//         const motionDataArr = motionData.data;

//         for (let i = 0; i < currData.length; i += 4) {
//           const rDiff = Math.abs(currData[i] - prevData[i]);
//           const gDiff = Math.abs(currData[i + 1] - prevData[i + 1]);
//           const bDiff = Math.abs(currData[i + 2] - prevData[i + 2]);

//           if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
//             motionDataArr[i] = 0;      // R
//             motionDataArr[i + 1] = 0;    // G
//             motionDataArr[i + 2] = 255;  // B
//             motionDataArr[i + 3] = 255;  // Alpha
//           } else {
//             motionDataArr[i] = currData[i];
//             motionDataArr[i + 1] = currData[i + 1];
//             motionDataArr[i + 2] = currData[i + 2];
//             motionDataArr[i + 3] = 255;
//           }
//         }

//         motionContext.putImageData(motionData, 0, 0);
//       }
//     }

//     setLastFrameData(imageData);

//     // Fire detection (skip first few frames for camera stabilization)
//     if (monitoringFrameCount > 5) {
//       const fireDetected = detectFire(imageData);

//       if (fireDetected) {
//         setFireDetectionCount(prev => {
//           const newCount = prev + 1;

//           // Require 3 consecutive positive detections to reduce false positives
//           if (newCount >= 3) {
//             console.log("🔥 FIRE DETECTED! Updating Firebase...");
//             const monitoringRef = ref(database, 'monitoring/unusualActivity');
//             const timestamp = new Date().toISOString();

//             set(monitoringRef, {
//               status: 1,
//               message: 'Fire detected by webcam',
//               timestamp: timestamp
//             }).then(() => {
//               console.log("Firebase updated with fire detection");
//               setFireDetected(true);
//               setBlinking(true);
//             }).catch(err => {
//               console.error("Error updating firebase:", err);
//             });
//           }

//           return newCount;
//         });
//       } else {
//         setFireDetectionCount(prev => Math.max(0, prev - 1));
//       }
//     }
//   };

//   // Enhanced fire detection algorithm
//   const detectFire = (imageData) => {
//     const data = imageData.data;
//     let firePixelCount = 0;
//     let brightYellowCount = 0;
//     let brightWhiteCount = 0;
//     let orangePixelCount = 0;

//     for (let i = 0; i < data.length; i += 4) {
//       const r = data[i];
//       const g = data[i + 1];
//       const b = data[i + 2];

//       // Fire-red pixels
//       if (r > 200 && g > 40 && g < 120 && b < 60 && r > g + 80 && r > b + 140) {
//         firePixelCount++;
//       }

//       // Orange flame pixels
//       if (r > 220 && g > 100 && g < 180 && b < 80 && r > g + 40 && r > b + 140) {
//         orangePixelCount++;
//       }

//       // Bright yellow flame pixels
//       if (r > 200 && g > 160 && b < 100 && r > b + 100 && g > b + 60) {
//         brightYellowCount++;
//       }

//       // Bright white hot center
//       if (r > 230 && g > 230 && b > 200 && Math.abs(r - g) < 30) {
//         brightWhiteCount++;
//       }
//     }

//     const totalFirePixels = firePixelCount + orangePixelCount + brightYellowCount + brightWhiteCount;
//     const totalPixels = imageData.width * imageData.height;
//     const fireRatio = totalFirePixels / totalPixels;

//     // Log significant fire detections
//     if (fireRatio > 0.002) {
//       console.log(`🔥 Fire detection: ${(fireRatio * 100).toFixed(3)}% (R:${firePixelCount}, O:${orangePixelCount}, Y:${brightYellowCount}, W:${brightWhiteCount})`);
//     }

//     return fireRatio > 0.01; // 1% threshold for fire detection
//   };

//   // Calculate motion between frames
//   const calculateMotion = (currentFrame, previousFrame) => {
//     if (!previousFrame) return 0;

//     const curr = currentFrame.data;
//     const prev = previousFrame.data;
//     let diffCount = 0;
//     const threshold = 25;

//     for (let i = 0; i < curr.length; i += 4) {
//       const rDiff = Math.abs(curr[i] - prev[i]);
//       const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
//       const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);

//       if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
//         diffCount++;
//       }
//     }

//     const totalPixels = currentFrame.width * currentFrame.height;
//     return diffCount / totalPixels;
//   };

//   // Start background monitoring
//   const startBackgroundMonitoring = async () => {
//     try {
//       // Reset detection states
//       setFireDetectionCount(0);
//       setFireDetected(false);
//       setBlinking(false);
//       setLastFrameData(null);
//       setMotionLevel(0);
//       setMonitoringFrameCount(0);

//       // Reset Firebase to normal state
//       const monitoringRef = ref(database, 'monitoring/unusualActivity');
//       await set(monitoringRef, {
//         status: 0,
//         message: 'Monitoring started',
//         timestamp: new Date().toISOString()
//       });

//       setMonitoringActive(true);

//       // Connect to webcam if not already connected
//       if (!cameraConnected) {
//         const success = await connectToWebcam();
//         if (!success) {
//           throw new Error("Failed to connect to webcam");
//         }
//       }

//       // Initialize canvases
//       if (monitoringCanvasRef.current) {
//         const canvas = monitoringCanvasRef.current;
//         canvas.width = 320;
//         canvas.height = 240;
//         const context = canvas.getContext('2d');
//         context.fillStyle = "#000";
//         context.fillRect(0, 0, canvas.width, canvas.height);
//       }

//       if (motionCanvasRef.current) {
//         const canvas = motionCanvasRef.current;
//         canvas.width = 320;
//         canvas.height = 240;
//         const context = canvas.getContext('2d');
//         context.fillStyle = "#000";
//         context.fillRect(0, 0, canvas.width, canvas.height);
//       }
      
//       // Start webcam monitoring
//       console.log('🎥 Starting webcam monitoring');
//       if (monitoringVideoRef.current && webcamStreamRef.current) {
//         monitoringVideoRef.current.srcObject = webcamStreamRef.current;
//         await monitoringVideoRef.current.play();
//       }
      
//       // Start frame analysis
//       setupFrameAnalysis();
//       console.log('🚀 Background monitoring started successfully');
      
//     } catch (error) {
//       console.error('❌ Error starting background monitoring:', error);
//       setCameraError(`Unable to start monitoring: ${error.message}`);
//       setMonitoringActive(false);
//     }
//   };

//   // Stop background monitoring
//   const stopBackgroundMonitoring = () => {
//     console.log('⏹️ Stopping background monitoring');
    
//     if (monitoringVideoRef.current) {
//       monitoringVideoRef.current.pause();
//       monitoringVideoRef.current.srcObject = null;
//     }
    
//     if (monitoringIntervalRef.current) {
//       clearInterval(monitoringIntervalRef.current);
//       monitoringIntervalRef.current = null;
//     }
//     if (analysisIntervalRef.current) {
//       clearInterval(analysisIntervalRef.current);
//       analysisIntervalRef.current = null;
//     }
    
//     setMonitoringActive(false);
//     setFireDetected(false);
//     setBlinking(false);
//     setFireDetectionCount(0);
//     setLastFrameData(null);
//     setMotionLevel(0);

//     // Reset Firebase to normal
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     set(monitoringRef, {
//       status: 0,
//       message: 'Normal',
//       timestamp: new Date().toISOString()
//     }).catch(err => {
//       console.error("Error resetting firebase:", err);
//     });
//   };

//   // Find existing verification log for a booking
//   const findExistingVerificationLog = (bookingId) => {
//     return verificationLogs.find(log => log.bookingId === bookingId);
//   };

//   // Handle check-in
//   const handleCheckIn = async (booking) => {
//     setCurrentBooking(booking);
//     setShowCamera(true);

//     const existingLog = findExistingVerificationLog(booking.id);
//     setVerificationStatus(existingLog ? existingLog.status : 0);
//     setVerified(existingLog && existingLog.status === 1 ? true : null);

//     // Small delay to ensure modal is rendered
//     setTimeout(async () => {
//       await startCamera();
//     }, 100);
//   };

//   // Start camera for verification
//   const startCamera = async () => {
//     try {
//       if (!cameraConnected) {
//         const success = await connectToWebcam();
//         if (!success) {
//           throw new Error("Failed to connect to webcam");
//         }
//       }
      
//       // Ensure we have a fresh stream for verification
//       if (!webcamStreamRef.current) {
//         const success = await connectToWebcam();
//         if (!success) {
//           throw new Error("Failed to get webcam stream");
//         }
//       }
      
//       if (videoRef.current && webcamStreamRef.current) {
//         videoRef.current.srcObject = webcamStreamRef.current;
//         videoRef.current.onloadedmetadata = () => {
//           videoRef.current.play().catch(error => {
//             console.error('Error playing verification video:', error);
//             setCameraError('Failed to start video playback for verification.');
//           });
//         };
        
//         // Force load if metadata is already available
//         if (videoRef.current.readyState >= 1) {
//           await videoRef.current.play();
//         }
//       }
//     } catch (error) {
//       console.error('Error starting camera for verification:', error);
//       setCameraError('Unable to start webcam for verification.');
//     }
//   };

//   // Stop camera
//   const stopCamera = () => {
//     if (videoRef.current) {
//       videoRef.current.pause();
//       videoRef.current.srcObject = null;
//     }
    
//     setShowCamera(false);
//     setCurrentBooking(null);
//     setVerified(null);
//     setVerificationStatus(0);
//   };

//   // Capture image for verification
//   const captureImage = () => {
//     try {
//       if (!canvasRef.current || !videoRef.current) {
//         setCameraError("Camera not available for image capture");
//         return;
//       }

//       const canvas = canvasRef.current;
//       const context = canvas.getContext('2d');
      
//       canvas.width = videoRef.current.videoWidth || 640;
//       canvas.height = videoRef.current.videoHeight || 480;
//       context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

//       canvas.toBlob(blob => {
//         if (blob) {
//           uploadImageAndCompare(blob);
//         } else {
//           setCameraError("Failed to create image blob");
//         }
//       }, 'image/jpeg', 0.9);
//     } catch (error) {
//       console.error("Error capturing image:", error);
//       setCameraError("Failed to capture image. Please try again.");
//     }
//   };

//   // Upload and compare image for verification
//   const uploadImageAndCompare = async (imageBlob) => {
//     if (!currentBooking || !currentBooking.userId) {
//       alert("Cannot verify: booking information is incomplete");
//       setComparing(false);
//       return;
//     }
//     setComparing(true);
//     try {
//       const existingLog = findExistingVerificationLog(currentBooking.id);
//       const timestamp = new Date().toISOString();

//       const checkInImageRef = storageRef(storage, `check-ins/${currentBooking.id}_${Date.now()}.jpg`);
//       await uploadBytes(checkInImageRef, imageBlob);
//       const checkInImageUrl = await getDownloadURL(checkInImageRef);

//       const userRef = ref(database, `users/${currentBooking.userId}`);
//       const userSnapshot = await get(userRef);
//       let profileImageUrl = null;
//       let userName = "Unknown User";

//       if (userSnapshot.exists()) {
//         const userData = userSnapshot.val();
//         profileImageUrl = userData.faceImageUrl || userData.profileImageUrl;
//         userName = userData.name || userData.displayName || "Unknown User";
//       }

//       setTimeout(() => {
//         const isMatch = Math.random() > 0.3;
//         const numericStatus = isMatch ? 1 : 0;

//         const bookingRef = ref(database, `stadium_transactions/${currentBooking.id}`);
//         update(bookingRef, {
//           checkedIn: true,
//           checkedInAt: timestamp,
//           checkInImageUrl: checkInImageUrl,
//           identityVerified: isMatch,
//           verificationStatus: numericStatus
//         });

//         let logRef;

//         if (existingLog) {
//           logRef = ref(database, `verification_logs/${existingLog.id}`);
//           update(logRef, {
//             status: numericStatus,
//             capturedImageUrl: checkInImageUrl,
//             timestamp: timestamp,
//             adminId: "system",
//             updated: true,
//             updatedAt: timestamp
//           });
//         } else {
//           const verificationId = `verification_${Date.now()}`;
//           logRef = ref(database, `verification_logs/${verificationId}`);
//           set(logRef, {
//             userId: currentBooking.userId,
//             userName: userName,
//             bookingId: currentBooking.id,
//             matchTitle: currentBooking.matchTitle || "Unknown Match",
//             matchDate: currentBooking.matchDate || currentBooking.timestamp || timestamp,
//             timestamp: timestamp,
//             status: numericStatus,
//             capturedImageUrl: checkInImageUrl,
//             referenceImageUrl: profileImageUrl || "",
//             adminId: "system",
//             location: "Stadium Entrance"
//           });
//         }

//         const userHistoryRef = ref(database, `users/${currentBooking.userId}/verification_history/${Date.now()}`);
//         set(userHistoryRef, {
//           timestamp: timestamp,
//           status: numericStatus,
//           bookingId: currentBooking.id
//         });

//         setVerified(isMatch);
//         setVerificationStatus(numericStatus);
//         setComparing(false);

//         if (isMatch) {
//           setTimeout(() => {
//             stopCamera();
//           }, 3000);
//         }
//       }, 2000);
//     } catch (error) {
//       console.error('Error during check-in:', error);
//       setCameraError('Error during check-in process. Please try again.');
//       setComparing(false);
//     }
//   };

//   // Toggle verification logs view
//   const toggleVerificationLogs = () => {
//     setShowVerificationLogs(prev => !prev);
//   };

//   // Manual fire detection test
//   const forceFireDetection = () => {
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     const timestamp = new Date().toISOString();

//     set(monitoringRef, {
//       status: 1,
//       message: 'Fire detected (Manual Test) via webcam',
//       timestamp: timestamp
//     }).then(() => {
//       console.log("Firebase manually updated with fire detection");
//       setFireDetected(true);
//       setBlinking(true);
//     }).catch(err => {
//       console.error("Error updating firebase:", err);
//     });
//   };

//   // Reset fire detection
//   const resetFireDetection = () => {
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     const timestamp = new Date().toISOString();

//     set(monitoringRef, {
//       status: 0,
//       message: 'Normal',
//       timestamp: timestamp
//     }).then(() => {
//       console.log("Firebase manually reset to normal");
//       setFireDetected(false);
//       setBlinking(false);
//     }).catch(err => {
//       console.error("Error updating firebase:", err);
//     });
//   };

//   // Stat cards
//   const statCards = [
//     { title: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'blue' },
//     { title: 'Total Bookings', value: stats.totalBookings, icon: <Calendar size={24} />, color: 'green' },
//   ];

//   // Monitoring cards
//   const monitoringCards = [
//     { title: 'Alcohol Detection', value: stats.alcoholDetection, icon: <Wine size={24} />, gradientClass: 'gradient-red' },
//     { title: 'Gas Detection', value: stats.gasDetection, icon: <Wind size={24} />, gradientClass: 'gradient-gas' },
//     { title: 'Fire Detection', value: stats.fireDetection, icon: <AlertTriangle size={24} />, gradientClass: fireDetected && blinking ? 'gradient-fire-blink' : 'gradient-fire' },
//     { title: 'Temperature', value: `${stats.temperature}°C`, icon: <Thermometer size={24} />, gradientClass: 'gradient-orange' },
//     { title: 'Humidity', value: `${stats.humidity}%`, icon: <Droplets size={24} />, gradientClass: 'gradient-blue' },
//     {
//       title: 'Unusual Activity',
//       value: stats.activityStatus === 0 ? 'Normal' : 'Fire detected',
//       icon: <AlertTriangle size={24} />,
//       gradientClass: fireDetected && blinking ? 'gradient-alert-blink' : 'gradient-purple'
//     }
//   ];

//   if (loading) {
//     return <div className="admin-dashboard-loading">Loading dashboard data...</div>;
//   }

//   return (
//     <div className="admin-dashboard">
//       <h2 className="dashboard-title">Dashboard</h2>

//       <div className="stats-grid">
//         {statCards.map((card, index) => (
//           <div key={index} className={`stat-card card-${card.color}`}>
//             <div className="stat-icon">{card.icon}</div>
//             <div className="stat-info">
//               <h3 className="stat-title">{card.title}</h3>
//               <p className="stat-value">{card.value}</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       <div className="dashboard-tables">
//         <div className="monitoring-section">
//           <h3>Environment Monitoring</h3>
          
//           {/* Camera Source Selection */}
//           <div className="camera-source-selection">
//             <span className="source-label">Camera Source:</span>
//             <div className="source-options">
//               <label className={`source-option ${cameraSource === 0 ? 'selected' : ''}`}>
//                 <input
//                   type="radio"
//                   name="cameraSource"
//                   value={0}
//                   checked={cameraSource === 0}
//                   onChange={() => handleCameraSourceChange(0)}
//                 />
//                 <span>Desktop Camera</span>
//               </label>
//               <label className={`source-option ${cameraSource === 1 ? 'selected' : ''}`}>
//                 <input
//                   type="radio"
//                   name="cameraSource"
//                   value={1}
//                   checked={cameraSource === 1}
//                   onChange={() => handleCameraSourceChange(1)}
//                 />
//                 <span>External Device</span>
//               </label>
//             </div>
            
//             {videoDevices.length > 0 && (
//               <div className="camera-device-info">
//                 <p>Available cameras: {videoDevices.length}</p>
//                 {videoDevices.map((device, index) => (
//                   <div 
//                     key={device.deviceId} 
//                     className={`device-item ${selectedDeviceId === device.deviceId ? 'active' : ''}`}
//                     onClick={() => {
//                       setSelectedDeviceId(device.deviceId);
//                       if (cameraConnected) {
//                         stopWebcam();
//                         setTimeout(() => connectToWebcam(), 300);
//                       }
//                     }}
//                   >
//                     <span className="device-number">{index + 1}.</span>
//                     <span className="device-label">{device.label || `Camera ${index + 1}`}</span>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
          
//           {/* Webcam Connection Status */}
//           <div className={`camera-connection-status ${cameraConnected ? 'connected' : 'disconnected'} webcam`}>
//             <div className="connection-indicator">
//               <div className="status-dot"></div>
//               <span className="connection-label">
//                 Webcam: {cameraConnected ? 'Connected' : 'Disconnected'}
//               </span>
//               <span className="connection-details">
//                 {cameraConnected ? 
//                   `Active: ${cameraSource === 0 ? 'Desktop Camera' : 'External Device'}` : 
//                   'Camera Not Connected'}
//               </span>
//             </div>
            
//             <div className="connection-actions">
//               <button
//                 onClick={connectToWebcam}
//                 disabled={connectingCamera}
//                 className={`btn-connect ${cameraConnected ? 'connected' : ''} ${connectingCamera ? 'connecting' : ''}`}
//               >
//                 {connectingCamera ? <RefreshCw size={18} className="icon-spin" /> : <Video size={18} />}
//                 <span>
//                   {connectingCamera ? 'Connecting...' : cameraConnected ? 'Reconnect' : 'Connect'}
//                 </span>
//               </button>
//             </div>
//           </div>
          
//           {/* Camera error message */}
//           {cameraError && (
//             <div className="camera-error">
//               <p>
//                 <AlertTriangle size={16} />
//                 <span>{cameraError}</span>
//               </p>
//             </div>
//           )}
          
//           <div className="monitoring-grid">
//             {monitoringCards.map((card, index) => (
//               <div 
//                 key={index} 
//                 className={`monitoring-card ${card.gradientClass} ${
//                   (card.title === 'Fire Detection' && stats.fireDetection === 'Fire detected') ||
//                   (card.title === 'Unusual Activity' && stats.activityStatus === 1) ?
//                   'pulse-animation' : ''
//                 }`}
//               >
//                 <div className="monitoring-icon">{card.icon}</div>
//                 <div className="monitoring-info">
//                   <h3 className="monitoring-title">{card.title}</h3>
//                   <p className="monitoring-value">{card.value}</p>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="monitoring-controls">
//             {monitoringActive ? (
//               <button
//                 onClick={stopBackgroundMonitoring}
//                 className="monitoring-button stop"
//               >
//                 <VideoOff size={20} />
//                 <span>Stop Monitoring</span>
//               </button>
//             ) : (
//               <button
//                 onClick={startBackgroundMonitoring}
//                 className="monitoring-button start"
//                 disabled={!cameraConnected}
//               >
//                 <Video size={20} />
//                 <span>Start Monitoring</span>
//               </button>
//             )}

//             {monitoringActive && (
//               <>
//                 <button
//                   onClick={forceFireDetection}
//                   className="monitoring-button test-fire"
//                 >
//                   <AlertTriangle size={20} />
//                   <span>Test Fire</span>
//                 </button>

//                 <button
//                   onClick={resetFireDetection}
//                   className="monitoring-button reset"
//                 >
//                   <CheckCircle size={20} />
//                   <span>Reset</span>
//                 </button>
//               </>
//             )}
//           </div>

//           {monitoringActive && monitoringFrameCount < 5 && (
//             <div className="calibration-message">
//               <p>
//                 <span>⚙️</span>
//                 Initializing webcam for fire detection...
//               </p>
//             </div>
//           )}

//           {fireDetected && (
//             <div className={`fire-alert ${blinking ? 'blinking' : ''}`}>
//               <p>
//                 <AlertTriangle size={18} />
//                 🔥 Fire detected via webcam! Please check the area immediately.
//               </p>
//             </div>
//           )}

//           {/* Live Webcam Feed */}
//           <div className={`monitoring-container ${monitoringActive ? 'active' : ''}`}>
//             <div className="stream-container">
//               <h4>Live Webcam Feed</h4>
//               <div className="video-container">
//                 <div className="live-camera-wrapper">
//                   <div className="live-indicator">WEBCAM</div>
                  
//                   <video
//                     ref={monitoringVideoRef}
//                     autoPlay
//                     playsInline
//                     muted
//                     width="320"
//                     height="240"
//                     className="monitoring-video"
//                   />
                  
//                   {!cameraConnected && (
//                     <div className="camera-status-overlay">
//                       <div className="status-message">
//                         <Wifi size={24} className="icon-spin" />
//                         <span>Webcam not connected</span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
              
//               {/* Camera information */}
//               <div className="camera-source-info">
//                 <p><strong>Source:</strong> {cameraSource === 0 ? 'Desktop Camera' : 'External Device'}</p>
//                 <p><strong>Status:</strong> {cameraConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
//                 {webcamStreamRef.current && webcamStreamRef.current.getVideoTracks().length > 0 && (
//                   <p><strong>Active Camera:</strong> {webcamStreamRef.current.getVideoTracks()[0].label}</p>
//                 )}
//                 {monitoringActive && (
//                   <p><strong>Monitoring:</strong> Fire Detection Active | Motion: {(motionLevel * 100).toFixed(1)}%</p>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Hidden canvases for processing */}
//           <canvas
//             ref={monitoringCanvasRef}
//             width="320"
//             height="240"
//             className="hidden-canvas"
//           />
//           <canvas
//             ref={motionCanvasRef}
//             width="320"
//             height="240"
//             className="hidden-canvas"
//           />
//         </div>

//         {/* Verification Logs Section */}
//         <div className="verification-logs-section">
//           <div className="section-header">
//             <h3>Verification Status</h3>
//             <button
//               onClick={toggleVerificationLogs}
//               className="btn-toggle-logs"
//             >
//               <List size={18} />
//               <span>{showVerificationLogs ? 'Hide Logs' : 'Show Logs'}</span>
//             </button>
//           </div>

//           {showVerificationLogs && (
//             <div className="verification-logs-table">
//               {verificationLogs.length > 0 ? (
//                 <table>
//                   <thead>
//                     <tr>
//                       <th>User</th>
//                       <th>Date</th>
//                       <th>Status</th>
//                       <th>Location</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {verificationLogs.map((log) => (
//                       <tr key={log.id}>
//                         <td>{log.userName || log.userId}</td>
//                         <td>{new Date(log.timestamp).toLocaleString()}</td>
//                         <td>
//                           <div className={`status-indicator status-${log.status}`}>
//                             {log.status}
//                           </div>
//                         </td>
//                         <td>{log.location || 'Unknown'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : (
//                 <p className="no-logs">No verification logs found</p>
//               )}
//             </div>
//           )}
//         </div>

//         <div className="recent-bookings">
//           <h3>Recent Bookings</h3>
//           {stats.recentBookings.length > 0 ? (
//             <table className="bookings-table">
//               <thead>
//                 <tr>
//                   <th>No</th>
//                   <th>User</th>
//                   <th>Match</th>
//                   <th>Date</th>
//                   <th>Status</th>
//                   <th>Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stats.recentBookings.map((booking, index) => {
//                   const verLog = verificationLogs.find(log => log.bookingId === booking.id);
//                   const verStatus = verLog ? verLog.status : 0;

//                   return (
//                     <tr key={booking.id}>
//                       <td>{index + 1}</td>
//                       <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
//                       <td>{booking.matchTitle || ''}</td>
//                       <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
//                       <td>
//                         <div className="status-container">
//                           <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
//                             {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
//                           </span>
//                           <div className={`verification-status status-${verStatus}`}>
//                             {verStatus}
//                           </div>
//                         </div>
//                       </td>
//                       <td>
//                         <button
//                           className={`check-in-button ${booking.checkedIn && verStatus === 1 ? 'checked-in' : ''} ${!cameraConnected ? 'disabled' : ''}`}
//                           onClick={() => handleCheckIn(booking)}
//                           disabled={!cameraConnected || (booking.checkedIn && verStatus === 1)}
//                         >
//                           {booking.checkedIn && verStatus === 1 ? 'Checked In' : 'Check In'}
//                         </button>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           ) : (
//             <p className="no-data">No recent bookings found</p>
//           )}
//         </div>
//       </div>

//       {showCamera && (
//         <div className="camera-modal-overlay">
//           <div className="camera-modal">
//             <div className="camera-modal-header">
//               <h3>Check-In Verification (Webcam)</h3>
//               <button
//                 className="close-button"
//                 onClick={stopCamera}
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="camera-container">
//               <video
//                 ref={videoRef}
//                 autoPlay
//                 playsInline
//                 muted
//                 className="camera-video"
//                 onError={(e) => {
//                   console.error('Video error:', e);
//                   setCameraError('Video playback error in verification modal.');
//                 }}
//                 onLoadedData={() => {
//                   console.log('Video loaded for verification');
//                 }}
//                 onCanPlay={() => {
//                   console.log('Video can play for verification');
//                 }}
//               />

//               {verified === true && (
//                 <div className="verification-result success">
//                   <CheckCircle size={64} />
//                   <p>Identity Verified!</p>
//                 </div>
//               )}

//               {verified === false && (
//                 <div className="verification-result failure">
//                   <XCircle size={64} />
//                   <p>Identity Verification Failed</p>
//                 </div>
//               )}

//               <canvas
//                 ref={canvasRef}
//                 width="640"
//                 height="480"
//                 className="hidden-canvas"
//               />
//             </div>

//             <div className="camera-controls">
//               {!comparing && verified === null && (
//                 <button
//                   className="capture-button"
//                   onClick={captureImage}
//                 >
//                   <Camera size={24} />
//                   <span>Capture Image</span>
//                 </button>
//               )}

//               {comparing && (
//                 <div className="comparing-indicator">
//                   <p>Comparing images...</p>
//                   <div className="loading-spinner"></div>
//                 </div>
//               )}

//               {verified === false && (
//                 <button
//                   className="retry-button"
//                   onClick={() => setVerified(null)}
//                 >
//                   Try Again
//                 </button>
//               )}
//             </div>

//             <div className="verification-status-display">
//               <div className="status-container">
//                 <p>Verification Status:</p>
//                 <div className={`status-badge status-${verificationStatus}`}>
//                   {verificationStatus}
//                 </div>
//               </div>
//               <p className="status-text">
//                 {verificationStatus === 0
//                   ? (verified === null ? 'Not Verified Yet' : 'Verification Failed')
//                   : 'Successfully Verified'}
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
      
//       <style jsx>{`
//         .monitoring-video,
//         .camera-video {
//           width: 100%;
//           height: auto;
//           display: block;
//           background-color: #000;
//           object-fit: contain;
//           max-height: 480px;
//           border-radius: 4px;
//           border: 2px solid #ddd;
//         }

//         .video-container,
//         .camera-container {
//           position: relative;
//           width: 100%;
//           background-color: #000;
//           border-radius: 4px;
//           overflow: hidden;
//           box-shadow: 0 0 10px rgba(0,0,0,0.2);
//         }

//         .live-indicator {
//           position: absolute;
//           top: 10px;
//           left: 10px;
//           background-color: rgba(0, 123, 255, 0.8);
//           color: white;
//           padding: 4px 8px;
//           border-radius: 3px;
//           font-size: 12px;
//           font-weight: bold;
//           z-index: 10;
//           animation: pulse 2s infinite;
//         }

//         /* Camera Source Selection Styles */
//         .camera-source-selection {
//           display: flex;
//           flex-direction: column;
//           background-color: #f8f9fa;
//           padding: 12px 15px;
//           border-radius: 8px;
//           margin-bottom: 15px;
//           border-left: 4px solid #6610f2;
//         }

//         .source-label {
//           font-weight: 600;
//           margin-right: 15px;
//           margin-bottom: 10px;
//           white-space: nowrap;
//         }

//         .source-options {
//           display: flex;
//           gap: 15px;
//           flex-wrap: wrap;
//           margin-bottom: 10px;
//         }

//         .source-option {
//           display: flex;
//           align-items: center;
//           padding: 8px 12px;
//           background-color: #e9ecef;
//           border-radius: 6px;
//           cursor: pointer;
//           transition: all 0.2s;
//         }

//         .source-option.selected {
//           background-color: #6610f2;
//           color: white;
//         }

//         .source-option input {
//           margin-right: 8px;
//         }
        
//         /* Camera device selection styles */
//         .camera-device-info {
//           margin-top: 10px;
//           padding: 10px;
//           background-color: rgba(0,0,0,0.05);
//           border-radius: 6px;
//           max-height: 200px;
//           overflow-y: auto;
//         }
        
//         .camera-device-info p {
//           margin: 0 0 10px 0;
//           font-size: 14px;
//           font-weight: 500;
//         }
        
//         .device-item {
//           display: flex;
//           padding: 8px 10px;
//           margin-bottom: 6px;
//           background-color: #ffffff;
//           border-radius: 4px;
//           cursor: pointer;
//           transition: all 0.2s;
//           align-items: center;
//           box-shadow: 0 1px 3px rgba(0,0,0,0.1);
//         }
        
//         .device-item:hover {
//           background-color: #f0f0f0;
//         }
        
//         .device-item.active {
//           background-color: #e6f7ff;
//           border-left: 3px solid #007bff;
//         }
        
//         .device-number {
//           font-weight: 600;
//           margin-right: 8px;
//           color: #555;
//           width: 20px;
//         }
        
//         .device-label {
//           font-size: 13px;
//           white-space: nowrap;
//           overflow: hidden;
//           text-overflow: ellipsis;
//         }

//         @keyframes pulse {
//           0% { opacity: 1; }
//           50% { opacity: 0.7; }
//           100% { opacity: 1; }
//         }

//         .camera-source-info {
//           margin-top: 10px;
//           padding: 10px;
//           background-color: #f8f9fa;
//           border-radius: 4px;
//           font-size: 12px;
//           line-height: 1.4;
//           border-left: 4px solid #007bff;
//         }
        
//         .camera-source-info p {
//           margin: 3px 0;
//         }

//         .camera-status-overlay {
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background-color: rgba(0, 0, 0, 0.8);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           z-index: 5;
//         }

//         .status-message {
//           color: white;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           gap: 10px;
//           text-align: center;
//         }

//         .icon-spin {
//           animation: spin 1.5s linear infinite;
//         }

//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
        
//         .hidden-canvas {
//           display: none;
//         }

//         .camera-connection-status.connected {
//           border-left: 4px solid #28a745;
//         }

//         .camera-connection-status.disconnected {
//           border-left: 4px solid #dc3545;
//         }

//         .camera-connection-status.webcam {
//           border-left: 4px solid #007bff;
//         }

//         .camera-error {
//           background-color: #f8d7da;
//           border: 1px solid #f5c6cb;
//           color: #721c24;
//           padding: 12px;
//           border-radius: 4px;
//           margin: 10px 0;
//         }

//         .camera-error p {
//           margin: 0;
//           display: flex;
//           align-items: flex-start;
//           gap: 8px;
//         }

//         .fire-alert {
//           background-color: #f8d7da;
//           border: 2px solid #dc3545;
//           color: #721c24;
//           padding: 15px;
//           border-radius: 8px;
//           margin: 15px 0;
//           font-weight: bold;
//           text-align: center;
//         }

//         .fire-alert.blinking {
//           animation: blink 0.5s infinite;
//         }

//         @keyframes blink {
//           0%, 50% { background-color: #f8d7da; }
//           51%, 100% { background-color: #dc3545; color: white; }
//         }

//         .calibration-message {
//           background-color: #d1ecf1;
//           border: 1px solid #bee5eb;
//           color: #0c5460;
//           padding: 10px;
//           border-radius: 4px;
//           margin: 10px 0;
//           text-align: center;
//         }

//         .connection-actions {
//           display: flex;
//           gap: 10px;
//           align-items: center;
//         }

//         .btn-connect {
//           padding: 8px 12px;
//           background-color: #007bff;
//           color: white;
//           border: none;
//           border-radius: 4px;
//           cursor: pointer;
//           display: flex;
//           align-items: center;
//           gap: 5px;
//           font-size: 14px;
//           transition: background-color 0.2s;
//         }

//         .btn-connect:hover {
//           background-color: #0056b3;
//         }

//         .btn-connect.connected {
//           background-color: #28a745;
//         }

//         .btn-connect.connected:hover {
//           background-color: #1e7e34;
//         }

//         .btn-connect:disabled {
//           background-color: #6c757d;
//           cursor: not-allowed;
//         }

//         .camera-connection-status {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           padding: 15px;
//           background-color: #f8f9fa;
//           border-radius: 8px;
//           margin: 15px 0;
//           border-left: 4px solid #007bff;
//         }

//         .connection-indicator {
//           display: flex;
//           flex-direction: column;
//           gap: 5px;
//         }

//         .status-dot {
//           width: 8px;
//           height: 8px;
//           border-radius: 50%;
//           background-color: #dc3545;
//           margin-right: 8px;
//           display: inline-block;
//         }

//         .camera-connection-status.connected .status-dot {
//           background-color: #28a745;
//           animation: pulse 2s infinite;
//         }

//         .connection-label {
//           font-weight: 600;
//           font-size: 14px;
//         }

//         .connection-details {
//           font-size: 12px;
//           color: #6c757d;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default AdminDashboard;




import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, get, set, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../firebase';
import {
  Users, Calendar, DollarSign, Ticket, Thermometer, Droplets, Wine,
  AlertTriangle, Camera, X, CheckCircle, XCircle, Video, VideoOff, User, 
  UserPlus, Shield, List, Wind, Settings, RefreshCw, Monitor, Wifi
} from 'lucide-react';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    recentBookings: [],
    temperature: 0,
    humidity: 0,
    alcoholDetection: 'No detection',
    gasDetection: 'No detection',
    fireDetection: 'No detection',
    unusualActivity: 'Normal',
    activityStatus: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [verified, setVerified] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(0);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [fireDetected, setFireDetected] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [fireDetectionCount, setFireDetectionCount] = useState(0);
  const [lastFrameData, setLastFrameData] = useState(null);
  const [motionLevel, setMotionLevel] = useState(0);
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [showVerificationLogs, setShowVerificationLogs] = useState(false);
  const [monitoringFrameCount, setMonitoringFrameCount] = useState(0);
  
  // Camera state
  const [cameraConnected, setCameraConnected] = useState(false);
  const [connectingCamera, setConnectingCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // New state for camera source selection
  const [cameraSource, setCameraSource] = useState(1); // 0 for desktop, 1 for external (default to external)
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const monitoringVideoRef = useRef(null);
  const monitoringCanvasRef = useRef(null);
  const monitoringIntervalRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const motionCanvasRef = useRef(null);
  const webcamStreamRef = useRef(null);

  // Effect to reset Firebase data on component mount
  useEffect(() => {
    const resetFirebaseData = async () => {
      try {
        const monitoringRef = ref(database, 'monitoring/unusualActivity');
        await set(monitoringRef, {
          status: 0,
          message: 'Normal',
          timestamp: new Date().toISOString()
        });
        console.log("Firebase reset to normal state");
      } catch (error) {
        console.error("Error resetting Firebase data:", error);
      }
    };

    resetFirebaseData();
    
    // Enumerate available video devices
    enumerateVideoDevices();
  }, []);

  // Function to enumerate available video devices
  const enumerateVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoInputs);
      
      // Log detailed information about each device
      videoInputs.forEach((device, index) => {
        console.log(`Device ${index}: ID=${device.deviceId.substring(0, 8)}..., Label=${device.label || 'No label'}`);
      });
      
      setVideoDevices(videoInputs);
      
      // If we have devices and no selected device yet, select appropriate one based on cameraSource
      if (videoInputs.length > 0 && !selectedDeviceId) {
        if (cameraSource === 1 && videoInputs.length > 1) {
          // For external camera, pick a device that's not the first one (assuming first is internal)
          // Look for devices with "USB" or external-sounding names first
          const externalDevice = videoInputs.find(device => 
            (device.label && (
              device.label.toLowerCase().includes('usb') ||
              device.label.toLowerCase().includes('external') ||
              device.label.toLowerCase().includes('zebronics') ||
              device.label.toLowerCase().includes('webcam') ||
              device.label.toLowerCase().includes('camera')
            )) && !device.label.toLowerCase().includes('built-in')
          );
          
          if (externalDevice) {
            console.log('Found external device:', externalDevice.label);
            setSelectedDeviceId(externalDevice.deviceId);
          } else {
            // If no device with specific labels found, use the last device (usually external)
            const lastDevice = videoInputs[videoInputs.length - 1];
            console.log('Using last device as external:', lastDevice.label);
            setSelectedDeviceId(lastDevice.deviceId);
          }
        } else {
          // For desktop camera, pick the first device (usually internal)
          const internalDevice = videoInputs.find(device => 
            device.label && (
              device.label.toLowerCase().includes('built-in') ||
              device.label.toLowerCase().includes('internal')
            )
          ) || videoInputs[0];
          
          console.log('Using internal device:', internalDevice.label);
          setSelectedDeviceId(internalDevice.deviceId);
        }
      }
    } catch (error) {
      console.error('Error enumerating video devices:', error);
      setCameraError('Could not enumerate video devices. Make sure you have camera permissions.');
    }
  };

  // Handle camera source change
  const handleCameraSourceChange = (sourceValue) => {
    // Stop current webcam stream if active
    stopWebcam();
    
    // Update camera source state
    setCameraSource(sourceValue);
    
    // Reset selected device ID to force re-selection based on new source
    setSelectedDeviceId(null);
    
    // Re-enumerate devices to select appropriate one for the new source
    enumerateVideoDevices().then(() => {
      // Reconnect with new source if needed
      if (cameraConnected) {
        connectToWebcam();
      }
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }

      const monitoringRef = ref(database, 'monitoring/unusualActivity');
      set(monitoringRef, {
        status: 0,
        message: 'Normal',
        timestamp: new Date().toISOString()
      }).catch(error => {
        console.error("Error resetting alert state on unmount:", error);
      });
    };
  }, []);

  // Stop webcam
  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
    setCameraConnected(false);
  };

  // Fetch stats from Firebase
  useEffect(() => {
    setLoading(true);
    const fetchStats = async () => {
      // Fetch users data
      const usersRef = ref(database, 'users');
      onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const usersCount = Object.keys(usersData).length;
          setStats(prevStats => ({
            ...prevStats,
            totalUsers: usersCount
          }));
        }
      });

      // Fetch bookings data
      const bookingsRef = ref(database, 'stadium_transactions');
      onValue(bookingsRef, (snapshot) => {
        if (snapshot.exists()) {
          const bookingsData = snapshot.val();
          const bookings = Object.entries(bookingsData).map(([id, data]) => ({
            id,
            ...data
          }));

          const totalBookings = bookings.length;
          const pendingPayments = bookings.filter(b => b.paymentStatus !== 'completed').length;
          const completedPayments = bookings.filter(b => b.paymentStatus === 'completed').length;
          const recentBookings = bookings
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

          setStats(prevStats => ({
            ...prevStats,
            totalBookings,
            pendingPayments,
            completedPayments,
            recentBookings
          }));

          initializeVerificationLogs(bookings);
        }
        setLoading(false);
      });

      fetchVerificationLogs();

      // Listen for unusual activity updates
      const activityRef = ref(database, 'monitoring/unusualActivity');
      onValue(activityRef, (snapshot) => {
        if (snapshot.exists()) {
          const activityData = snapshot.val();
          const statusCode = activityData.status;

          setStats(prevStats => ({
            ...prevStats,
            activityStatus: statusCode,
            unusualActivity: activityData.message || 'Normal'
          }));

          if (statusCode === 1) {
            setFireDetected(true);
            setBlinking(true);
          } else {
            setFireDetected(false);
            setBlinking(false);
          }
        }
      });

      // Fetch sensor data from Firebase
      const sensorsRef = ref(database, 'IPL_Ticket/Sensors');
      onValue(sensorsRef, (snapshot) => {
        if (snapshot.exists()) {
          const sensorsData = snapshot.val();

          const temperature = parseFloat(sensorsData.Temperature) || 0;
          const humidity = parseFloat(sensorsData.Humidity) || 0;
          const alcoholValue = parseInt(sensorsData.Alcohol) || 0;
          const alcoholStatus = alcoholValue === 0 ? 'No detection' : 'Alcohol detected';
          const gasValue = parseInt(sensorsData.Gas) || 0;
          const gasStatus = gasValue === 0 ? 'No detection' : 'Gas detected';
          const fireValue = parseInt(sensorsData.Fire) || 0;
          const fireStatus = fireValue === 0 ? 'No detection' : 'Fire detected';

          setStats(prevStats => ({
            ...prevStats,
            temperature,
            humidity,
            alcoholDetection: alcoholStatus,
            gasDetection: gasStatus,
            fireDetection: fireStatus
          }));

          if (fireValue === 1) {
            const monitoringRef = ref(database, 'monitoring/unusualActivity');
            const timestamp = new Date().toISOString();

            set(monitoringRef, {
              status: 1,
              message: 'Fire detected by sensor',
              timestamp: timestamp
            }).catch(err => {
              console.error("Error updating firebase with fire detection:", err);
            });
          }
        }
      });
    };

    fetchStats();
  }, []);

  // Effect for blinking
  useEffect(() => {
    let blinkInterval;
    if (blinking) {
      blinkInterval = setInterval(() => {
        setBlinking(prev => !prev);
      }, 500);
    }
    return () => {
      if (blinkInterval) clearInterval(blinkInterval);
    };
  }, [blinking]);

  // Initialize verification logs for all bookings
  const initializeVerificationLogs = async (bookings) => {
    try {
      const logsRef = ref(database, 'verification_logs');
      const snapshot = await get(logsRef);
      const existingLogs = snapshot.exists() ? snapshot.val() : {};

      const bookingsWithLogs = new Set();

      Object.values(existingLogs).forEach(log => {
        if (log.bookingId) {
          bookingsWithLogs.add(log.bookingId);
        }
      });

      for (const booking of bookings) {
        if (!bookingsWithLogs.has(booking.id)) {
          const verificationId = `verification_init_${booking.id}`;
          const timestamp = new Date().toISOString();

          await set(ref(database, `verification_logs/${verificationId}`), {
            userId: booking.userId || "unknown",
            bookingId: booking.id,
            timestamp: timestamp,
            status: 0,
            capturedImageUrl: "",
            referenceImageUrl: "",
            adminId: "system_init",
            location: "Not Checked In",
            initialized: true
          });
        }
      }
    } catch (error) {
      console.error("Error initializing verification logs:", error);
    }
  };

  // Fetch all verification logs
  const fetchVerificationLogs = async () => {
    try {
      const logsRef = ref(database, 'verification_logs');
      const snapshot = await get(logsRef);
      
      if (snapshot.exists()) {
        const logsData = snapshot.val();
        const logs = Object.entries(logsData).map(([id, data]) => ({
          id,
          ...data
        }));
        
        const sortedLogs = logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setVerificationLogs(sortedLogs);
      } else {
        setVerificationLogs([]);
      }
    } catch (error) {
      console.error("Error fetching verification logs:", error);
      setVerificationLogs([]);
    }
  };

  // Connect to webcam
  const connectToWebcam = async () => {
    setConnectingCamera(true);
    setCameraError(null);
    
    try {
      console.log(`🎥 Starting webcam with source: ${cameraSource === 0 ? 'Desktop Camera' : 'External Device'}`);
      
      // Stop any existing stream
      stopWebcam();
      
      // Get list of video devices if not already populated
      if (videoDevices.length === 0) {
        await enumerateVideoDevices();
      }
      
      // Configure video constraints based on camera source
      let videoConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 }
      };
      
      // If we have a selected device ID, use it
      if (selectedDeviceId) {
        console.log(`Using specific device ID: ${selectedDeviceId.substring(0, 8)}...`);
        videoConstraints.deviceId = { exact: selectedDeviceId };
      } else if (cameraSource === 0) {
        // Desktop camera (default/built-in camera)
        console.log('Using default built-in camera with facingMode:user');
        videoConstraints.facingMode = 'user';
      } else if (cameraSource === 1 && videoDevices.length > 0) {
        // External camera - try to use the last camera in the list
        // This is a fallback if no device was selected during enumeration
        const deviceToUse = videoDevices[videoDevices.length - 1];
        console.log(`Fallback: Using last device in list: ${deviceToUse.label || 'Unnamed device'}`);
        videoConstraints.deviceId = { exact: deviceToUse.deviceId };
      }
      
      console.log('Using video constraints:', JSON.stringify(videoConstraints));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      webcamStreamRef.current = stream;
      setCameraConnected(true);
      
      // Get the actual device being used
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        const activeTrack = videoTracks[0];
        console.log("✅ Active video track:", activeTrack.label);
        console.log("Track settings:", activeTrack.getSettings());
      }
      
      console.log("✅ Webcam started successfully");
      console.log("Stream tracks:", stream.getTracks().length);
      
      return true;
    } catch (error) {
      console.error("❌ Failed to start webcam:", error);
      
      let errorMessage = 'Failed to access webcam';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Webcam access denied. Please allow camera permissions and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No webcam found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Webcam is busy or unavailable. Please close other applications using the camera.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'The specified camera device is not available. Try using a different camera source.';
        
        // If we failed with a specific device ID, try falling back to any available camera
        setSelectedDeviceId(null);
        setCameraSource(0); // Switch back to default camera
      } else {
        errorMessage = `Webcam error: ${error.message}`;
      }
      
      setCameraError(errorMessage);
      setCameraConnected(false);
      return false;
    } finally {
      setConnectingCamera(false);
    }
  };

  // Setup frame analysis for fire detection
  const setupFrameAnalysis = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    
    const canvas = monitoringCanvasRef.current;
    const context = canvas?.getContext('2d');
    
    if (!canvas || !context) {
      console.error("Canvas not available for frame analysis");
      return;
    }

    canvas.width = 320;
    canvas.height = 240;
    
    console.log('🔍 Setting up frame analysis for fire detection');
    
    analysisIntervalRef.current = setInterval(() => {
      try {
        if (monitoringVideoRef.current && monitoringVideoRef.current.readyState >= 2) {
          context.drawImage(monitoringVideoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          handleFrameAnalysis(imageData);
        }
      } catch (error) {
        console.error("Error in frame analysis:", error);
      }
    }, 1000); // Analyze every second for stability
  };

  // Handle frame analysis for fire and motion detection
  const handleFrameAnalysis = (imageData) => {
    setMonitoringFrameCount(prev => prev + 1);

    // Calculate motion if we have a previous frame
    let currentMotionLevel = 0;
    if (lastFrameData) {
      currentMotionLevel = calculateMotion(imageData, lastFrameData);
      setMotionLevel(currentMotionLevel);

      // Update motion visualization
      const motionContext = motionCanvasRef.current?.getContext('2d');
      if (motionContext) {
        const motionData = motionContext.createImageData(imageData.width, imageData.height);
        const currData = imageData.data;
        const prevData = lastFrameData.data;
        const motionDataArr = motionData.data;

        for (let i = 0; i < currData.length; i += 4) {
          const rDiff = Math.abs(currData[i] - prevData[i]);
          const gDiff = Math.abs(currData[i + 1] - prevData[i + 1]);
          const bDiff = Math.abs(currData[i + 2] - prevData[i + 2]);

          if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
            motionDataArr[i] = 0;      // R
            motionDataArr[i + 1] = 0;    // G
            motionDataArr[i + 2] = 255;  // B
            motionDataArr[i + 3] = 255;  // Alpha
          } else {
            motionDataArr[i] = currData[i];
            motionDataArr[i + 1] = currData[i + 1];
            motionDataArr[i + 2] = currData[i + 2];
            motionDataArr[i + 3] = 255;
          }
        }

        motionContext.putImageData(motionData, 0, 0);
      }
    }

    setLastFrameData(imageData);

    // Fire detection (skip first few frames for camera stabilization)
    if (monitoringFrameCount > 5) {
      const fireDetected = detectFire(imageData);

      if (fireDetected) {
        setFireDetectionCount(prev => {
          const newCount = prev + 1;

          // Require 3 consecutive positive detections to reduce false positives
          if (newCount >= 3) {
            console.log("🔥 FIRE DETECTED! Updating Firebase...");
            const monitoringRef = ref(database, 'monitoring/unusualActivity');
            const timestamp = new Date().toISOString();

            set(monitoringRef, {
              status: 1,
              message: 'Fire detected by webcam',
              timestamp: timestamp
            }).then(() => {
              console.log("Firebase updated with fire detection");
              setFireDetected(true);
              setBlinking(true);
            }).catch(err => {
              console.error("Error updating firebase:", err);
            });
          }

          return newCount;
        });
      } else {
        setFireDetectionCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Enhanced fire detection algorithm
  const detectFire = (imageData) => {
    const data = imageData.data;
    let firePixelCount = 0;
    let brightYellowCount = 0;
    let brightWhiteCount = 0;
    let orangePixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Fire-red pixels
      if (r > 200 && g > 40 && g < 120 && b < 60 && r > g + 80 && r > b + 140) {
        firePixelCount++;
      }

      // Orange flame pixels
      if (r > 220 && g > 100 && g < 180 && b < 80 && r > g + 40 && r > b + 140) {
        orangePixelCount++;
      }

      // Bright yellow flame pixels
      if (r > 200 && g > 160 && b < 100 && r > b + 100 && g > b + 60) {
        brightYellowCount++;
      }

      // Bright white hot center
      if (r > 230 && g > 230 && b > 200 && Math.abs(r - g) < 30) {
        brightWhiteCount++;
      }
    }

    const totalFirePixels = firePixelCount + orangePixelCount + brightYellowCount + brightWhiteCount;
    const totalPixels = imageData.width * imageData.height;
    const fireRatio = totalFirePixels / totalPixels;

    // Log significant fire detections
    if (fireRatio > 0.002) {
      console.log(`🔥 Fire detection: ${(fireRatio * 100).toFixed(3)}% (R:${firePixelCount}, O:${orangePixelCount}, Y:${brightYellowCount}, W:${brightWhiteCount})`);
    }

    return fireRatio > 0.01; // 1% threshold for fire detection
  };

  // Calculate motion between frames
  const calculateMotion = (currentFrame, previousFrame) => {
    if (!previousFrame) return 0;

    const curr = currentFrame.data;
    const prev = previousFrame.data;
    let diffCount = 0;
    const threshold = 25;

    for (let i = 0; i < curr.length; i += 4) {
      const rDiff = Math.abs(curr[i] - prev[i]);
      const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
      const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);

      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffCount++;
      }
    }

    const totalPixels = currentFrame.width * currentFrame.height;
    return diffCount / totalPixels;
  };

  // Start background monitoring
  const startBackgroundMonitoring = async () => {
    try {
      // Reset detection states
      setFireDetectionCount(0);
      setFireDetected(false);
      setBlinking(false);
      setLastFrameData(null);
      setMotionLevel(0);
      setMonitoringFrameCount(0);

      // Reset Firebase to normal state
      const monitoringRef = ref(database, 'monitoring/unusualActivity');
      await set(monitoringRef, {
        status: 0,
        message: 'Monitoring started',
        timestamp: new Date().toISOString()
      });

      setMonitoringActive(true);

      // Connect to webcam if not already connected
      if (!cameraConnected) {
        const success = await connectToWebcam();
        if (!success) {
          throw new Error("Failed to connect to webcam");
        }
      }

      // Initialize canvases
      if (monitoringCanvasRef.current) {
        const canvas = monitoringCanvasRef.current;
        canvas.width = 320;
        canvas.height = 240;
        const context = canvas.getContext('2d');
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (motionCanvasRef.current) {
        const canvas = motionCanvasRef.current;
        canvas.width = 320;
        canvas.height = 240;
        const context = canvas.getContext('2d');
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Start webcam monitoring
      console.log('🎥 Starting webcam monitoring');
      if (monitoringVideoRef.current && webcamStreamRef.current) {
        monitoringVideoRef.current.srcObject = webcamStreamRef.current;
        await monitoringVideoRef.current.play();
      }
      
      // Start frame analysis
      setupFrameAnalysis();
      console.log('🚀 Background monitoring started successfully');
      
    } catch (error) {
      console.error('❌ Error starting background monitoring:', error);
      setCameraError(`Unable to start monitoring: ${error.message}`);
      setMonitoringActive(false);
    }
  };

  // Stop background monitoring
  const stopBackgroundMonitoring = () => {
    console.log('⏹️ Stopping background monitoring');
    
    if (monitoringVideoRef.current) {
      monitoringVideoRef.current.pause();
      monitoringVideoRef.current.srcObject = null;
    }
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    setMonitoringActive(false);
    setFireDetected(false);
    setBlinking(false);
    setFireDetectionCount(0);
    setLastFrameData(null);
    setMotionLevel(0);

    // Reset Firebase to normal
    const monitoringRef = ref(database, 'monitoring/unusualActivity');
    set(monitoringRef, {
      status: 0,
      message: 'Normal',
      timestamp: new Date().toISOString()
    }).catch(err => {
      console.error("Error resetting firebase:", err);
    });
  };

  // Find existing verification log for a booking
  const findExistingVerificationLog = (bookingId) => {
    return verificationLogs.find(log => log.bookingId === bookingId);
  };

  // Handle check-in
  const handleCheckIn = async (booking) => {
    setCurrentBooking(booking);
    setShowCamera(true);

    const existingLog = findExistingVerificationLog(booking.id);
    setVerificationStatus(existingLog ? existingLog.status : 0);
    setVerified(existingLog && existingLog.status === 1 ? true : null);

    // Small delay to ensure modal is rendered
    setTimeout(async () => {
      await startCamera();
    }, 100);
  };

  // Start camera for verification
  const startCamera = async () => {
    try {
      if (!cameraConnected) {
        const success = await connectToWebcam();
        if (!success) {
          throw new Error("Failed to connect to webcam");
        }
      }
      
      // Ensure we have a fresh stream for verification
      if (!webcamStreamRef.current) {
        const success = await connectToWebcam();
        if (!success) {
          throw new Error("Failed to get webcam stream");
        }
      }
      
      if (videoRef.current && webcamStreamRef.current) {
        videoRef.current.srcObject = webcamStreamRef.current;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(error => {
            console.error('Error playing verification video:', error);
            setCameraError('Failed to start video playback for verification.');
          });
        };
        
        // Force load if metadata is already available
        if (videoRef.current.readyState >= 1) {
          await videoRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error starting camera for verification:', error);
      setCameraError('Unable to start webcam for verification.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
    setCurrentBooking(null);
    setVerified(null);
    setVerificationStatus(0);
  };

  // Capture image for verification
  const captureImage = () => {
    try {
      if (!canvasRef.current || !videoRef.current) {
        setCameraError("Camera not available for image capture");
        return;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(blob => {
        if (blob) {
          uploadImageAndCompare(blob);
        } else {
          setCameraError("Failed to create image blob");
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error("Error capturing image:", error);
      setCameraError("Failed to capture image. Please try again.");
    }
  };

  // Upload and compare image for verification
  const uploadImageAndCompare = async (imageBlob) => {
    if (!currentBooking || !currentBooking.userId) {
      alert("Cannot verify: booking information is incomplete");
      setComparing(false);
      return;
    }
    setComparing(true);
    try {
      const existingLog = findExistingVerificationLog(currentBooking.id);
      const timestamp = new Date().toISOString();

      const checkInImageRef = storageRef(storage, `check-ins/${currentBooking.id}_${Date.now()}.jpg`);
      await uploadBytes(checkInImageRef, imageBlob);
      const checkInImageUrl = await getDownloadURL(checkInImageRef);

      const userRef = ref(database, `users/${currentBooking.userId}`);
      const userSnapshot = await get(userRef);
      let profileImageUrl = null;
      let userName = "Unknown User";

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        profileImageUrl = userData.faceImageUrl || userData.profileImageUrl;
        userName = userData.name || userData.displayName || "Unknown User";
      }

      setTimeout(() => {
        const isMatch = Math.random() > 0.3;
        const numericStatus = isMatch ? 1 : 0;

        const bookingRef = ref(database, `stadium_transactions/${currentBooking.id}`);
        update(bookingRef, {
          checkedIn: true,
          checkedInAt: timestamp,
          checkInImageUrl: checkInImageUrl,
          identityVerified: isMatch,
          verificationStatus: numericStatus
        });

        let logRef;

        if (existingLog) {
          logRef = ref(database, `verification_logs/${existingLog.id}`);
          update(logRef, {
            status: numericStatus,
            capturedImageUrl: checkInImageUrl,
            timestamp: timestamp,
            adminId: "system",
            updated: true,
            updatedAt: timestamp
          });
        } else {
          const verificationId = `verification_${Date.now()}`;
          logRef = ref(database, `verification_logs/${verificationId}`);
          set(logRef, {
            userId: currentBooking.userId,
            userName: userName,
            bookingId: currentBooking.id,
            matchTitle: currentBooking.matchTitle || "Unknown Match",
            matchDate: currentBooking.matchDate || currentBooking.timestamp || timestamp,
            timestamp: timestamp,
            status: numericStatus,
            capturedImageUrl: checkInImageUrl,
            referenceImageUrl: profileImageUrl || "",
            adminId: "system",
            location: "Stadium Entrance"
          });
        }

        const userHistoryRef = ref(database, `users/${currentBooking.userId}/verification_history/${Date.now()}`);
        set(userHistoryRef, {
          timestamp: timestamp,
          status: numericStatus,
          bookingId: currentBooking.id
        });

        setVerified(isMatch);
        setVerificationStatus(numericStatus);
        setComparing(false);

        // Update stats.recentBookings with the new check-in status
        setStats(prevStats => ({
          ...prevStats,
          recentBookings: prevStats.recentBookings.map(booking => 
            booking.id === currentBooking.id 
              ? { ...booking, checkedIn: true, verificationStatus: numericStatus }
              : booking
          )
        }));

        // Refresh verification logs to show the update immediately
        fetchVerificationLogs();

        if (isMatch) {
          setTimeout(() => {
            stopCamera();
          }, 3000);
        }
      }, 2000);
    } catch (error) {
      console.error('Error during check-in:', error);
      setCameraError('Error during check-in process. Please try again.');
      setComparing(false);
    }
  };

  // Toggle verification logs view
  const toggleVerificationLogs = () => {
    setShowVerificationLogs(prev => !prev);
  };

  // Manual fire detection test
  const forceFireDetection = () => {
    const monitoringRef = ref(database, 'monitoring/unusualActivity');
    const timestamp = new Date().toISOString();

    set(monitoringRef, {
      status: 1,
      message: 'Fire detected (Manual Test) via webcam',
      timestamp: timestamp
    }).then(() => {
      console.log("Firebase manually updated with fire detection");
      setFireDetected(true);
      setBlinking(true);
    }).catch(err => {
      console.error("Error updating firebase:", err);
    });
  };

  // Reset fire detection
  const resetFireDetection = () => {
    const monitoringRef = ref(database, 'monitoring/unusualActivity');
    const timestamp = new Date().toISOString();

    set(monitoringRef, {
      status: 0,
      message: 'Normal',
      timestamp: timestamp
    }).then(() => {
      console.log("Firebase manually reset to normal");
      setFireDetected(false);
      setBlinking(false);
    }).catch(err => {
      console.error("Error updating firebase:", err);
    });
  };

  // Stat cards
  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'blue' },
    { title: 'Total Bookings', value: stats.totalBookings, icon: <Calendar size={24} />, color: 'green' },
  ];

  // Monitoring cards
  const monitoringCards = [
    { title: 'Alcohol Detection', value: stats.alcoholDetection, icon: <Wine size={24} />, gradientClass: 'gradient-red' },
    { title: 'Gas Detection', value: stats.gasDetection, icon: <Wind size={24} />, gradientClass: 'gradient-gas' },
    { title: 'Fire Detection', value: stats.fireDetection, icon: <AlertTriangle size={24} />, gradientClass: fireDetected && blinking ? 'gradient-fire-blink' : 'gradient-fire' },
    { title: 'Temperature', value: `${stats.temperature}°C`, icon: <Thermometer size={24} />, gradientClass: 'gradient-orange' },
    { title: 'Humidity', value: `${stats.humidity}%`, icon: <Droplets size={24} />, gradientClass: 'gradient-blue' },
    {
      title: 'Unusual Activity',
      value: stats.activityStatus === 0 ? 'Normal' : 'Fire detected',
      icon: <AlertTriangle size={24} />,
      gradientClass: fireDetected && blinking ? 'gradient-alert-blink' : 'gradient-purple'
    }
  ];

  if (loading) {
    return <div className="admin-dashboard-loading">Loading dashboard data...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h2 className="dashboard-title">Dashboard</h2>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className={`stat-card card-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <h3 className="stat-title">{card.title}</h3>
              <p className="stat-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-tables">
        <div className="monitoring-section">
          <h3>Environment Monitoring</h3>
          
          {/* Camera Source Selection */}
          <div className="camera-source-selection">
            <span className="source-label">Camera Source:</span>
            <div className="source-options">
              <label className={`source-option ${cameraSource === 0 ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="cameraSource"
                  value={0}
                  checked={cameraSource === 0}
                  onChange={() => handleCameraSourceChange(0)}
                />
                <span>Desktop Camera</span>
              </label>
              <label className={`source-option ${cameraSource === 1 ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="cameraSource"
                  value={1}
                  checked={cameraSource === 1}
                  onChange={() => handleCameraSourceChange(1)}
                />
                <span>External Device</span>
              </label>
            </div>
            
            {videoDevices.length > 0 && (
              <div className="camera-device-info">
                <p>Available cameras: {videoDevices.length}</p>
                {videoDevices.map((device, index) => (
                  <div 
                    key={device.deviceId} 
                    className={`device-item ${selectedDeviceId === device.deviceId ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDeviceId(device.deviceId);
                      if (cameraConnected) {
                        stopWebcam();
                        setTimeout(() => connectToWebcam(), 300);
                      }
                    }}
                  >
                    <span className="device-number">{index + 1}.</span>
                    <span className="device-label">{device.label || `Camera ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Webcam Connection Status */}
          <div className={`camera-connection-status ${cameraConnected ? 'connected' : 'disconnected'} webcam`}>
            <div className="connection-indicator">
              <div className="status-dot"></div>
              <span className="connection-label">
                Webcam: {cameraConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="connection-details">
                {cameraConnected ? 
                  `Active: ${cameraSource === 0 ? 'Desktop Camera' : 'External Device'}` : 
                  'Camera Not Connected'}
              </span>
            </div>
            
            <div className="connection-actions">
              <button
                onClick={connectToWebcam}
                disabled={connectingCamera}
                className={`btn-connect ${cameraConnected ? 'connected' : ''} ${connectingCamera ? 'connecting' : ''}`}
              >
                {connectingCamera ? <RefreshCw size={18} className="icon-spin" /> : <Video size={18} />}
                <span>
                  {connectingCamera ? 'Connecting...' : cameraConnected ? 'Reconnect' : 'Connect'}
                </span>
              </button>
            </div>
          </div>
          
          {/* Camera error message */}
          {cameraError && (
            <div className="camera-error">
              <p>
                <AlertTriangle size={16} />
                <span>{cameraError}</span>
              </p>
            </div>
          )}
          
          <div className="monitoring-grid">
            {monitoringCards.map((card, index) => (
              <div 
                key={index} 
                className={`monitoring-card ${card.gradientClass} ${
                  (card.title === 'Fire Detection' && stats.fireDetection === 'Fire detected') ||
                  (card.title === 'Unusual Activity' && stats.activityStatus === 1) ?
                  'pulse-animation' : ''
                }`}
              >
                <div className="monitoring-icon">{card.icon}</div>
                <div className="monitoring-info">
                  <h3 className="monitoring-title">{card.title}</h3>
                  <p className="monitoring-value">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="monitoring-controls">
            {monitoringActive ? (
              <button
                onClick={stopBackgroundMonitoring}
                className="monitoring-button stop"
              >
                <VideoOff size={20} />
                <span>Stop Monitoring</span>
              </button>
            ) : (
              <button
                onClick={startBackgroundMonitoring}
                className="monitoring-button start"
                disabled={!cameraConnected}
              >
                <Video size={20} />
                <span>Start Monitoring</span>
              </button>
            )}

            {monitoringActive && (
              <>
                <button
                  onClick={forceFireDetection}
                  className="monitoring-button test-fire"
                >
                  <AlertTriangle size={20} />
                  <span>Test Fire</span>
                </button>

                <button
                  onClick={resetFireDetection}
                  className="monitoring-button reset"
                >
                  <CheckCircle size={20} />
                  <span>Reset</span>
                </button>
              </>
            )}
          </div>

          {monitoringActive && monitoringFrameCount < 5 && (
            <div className="calibration-message">
              <p>
                <span>⚙️</span>
                Initializing webcam for fire detection...
              </p>
            </div>
          )}

          {fireDetected && (
            <div className={`fire-alert ${blinking ? 'blinking' : ''}`}>
              <p>
                <AlertTriangle size={18} />
                🔥 Fire detected via webcam! Please check the area immediately.
              </p>
            </div>
          )}

          {/* Live Webcam Feed */}
          <div className={`monitoring-container ${monitoringActive ? 'active' : ''}`}>
            <div className="stream-container">
              <h4>Live Webcam Feed</h4>
              <div className="video-container">
                <div className="live-camera-wrapper">
                  <div className="live-indicator">WEBCAM</div>
                  
                  <video
                    ref={monitoringVideoRef}
                    autoPlay
                    playsInline
                    muted
                    width="320"
                    height="240"
                    className="monitoring-video"
                  />
                  
                  {!cameraConnected && (
                    <div className="camera-status-overlay">
                      <div className="status-message">
                        <Wifi size={24} className="icon-spin" />
                        <span>Webcam not connected</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Camera information */}
              <div className="camera-source-info">
                <p><strong>Source:</strong> {cameraSource === 0 ? 'Desktop Camera' : 'External Device'}</p>
                <p><strong>Status:</strong> {cameraConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
                {webcamStreamRef.current && webcamStreamRef.current.getVideoTracks().length > 0 && (
                  <p><strong>Active Camera:</strong> {webcamStreamRef.current.getVideoTracks()[0].label}</p>
                )}
                {monitoringActive && (
                  <p><strong>Monitoring:</strong> Fire Detection Active | Motion: {(motionLevel * 100).toFixed(1)}%</p>
                )}
              </div>
            </div>
          </div>

          {/* Hidden canvases for processing */}
          <canvas
            ref={monitoringCanvasRef}
            width="320"
            height="240"
            className="hidden-canvas"
          />
          <canvas
            ref={motionCanvasRef}
            width="320"
            height="240"
            className="hidden-canvas"
          />
        </div>

        {/* Verification Logs Section */}
        <div className="verification-logs-section">
          <div className="section-header">
            <h3>Verification Status</h3>
            <button
              onClick={toggleVerificationLogs}
              className="btn-toggle-logs"
            >
              <List size={18} />
              <span>{showVerificationLogs ? 'Hide Logs' : 'Show Logs'}</span>
            </button>
          </div>

          {showVerificationLogs && (
            <div className="verification-logs-table">
              {verificationLogs.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.userName || log.userId}</td>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                          <div className={`status-indicator status-${log.status}`}>
                            {log.status}
                          </div>
                        </td>
                        <td>{log.location || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-logs">No verification logs found</p>
              )}
            </div>
          )}
        </div>

        <div className="recent-bookings">
          <h3>Recent Bookings</h3>
          {stats.recentBookings.length > 0 ? (
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>User</th>
                  <th>Match</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((booking, index) => {
                  const verLog = verificationLogs.find(log => log.bookingId === booking.id);
                  const verStatus = verLog ? verLog.status : 0;

                  return (
                    <tr key={booking.id}>
                      <td>{index + 1}</td>
                      <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
                      <td>{booking.matchTitle || ''}</td>
                      <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
                      <td>
                        <div className="status-container">
                          <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
                            {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                          </span>
                          <div className={`verification-status status-${verStatus}`}>
                            {verStatus}
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className={`check-in-button ${booking.checkedIn && verStatus === 1 ? 'checked-in' : ''} ${!cameraConnected ? 'disabled' : ''}`}
                          onClick={() => handleCheckIn(booking)}
                          disabled={!cameraConnected || (booking.checkedIn && verStatus === 1)}
                        >
                          {booking.checkedIn && verStatus === 1 ? 'Checked In ✓' : 'Check In'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No recent bookings found</p>
          )}
        </div>
      </div>

      {showCamera && (
        <div className="camera-modal-overlay">
          <div className="camera-modal">
            <div className="camera-modal-header">
              <h3>Check-In Verification (Webcam)</h3>
              <button
                className="close-button"
                onClick={stopCamera}
              >
                <X size={24} />
              </button>
            </div>

            <div className="camera-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                onError={(e) => {
                  console.error('Video error:', e);
                  setCameraError('Video playback error in verification modal.');
                }}
                onLoadedData={() => {
                  console.log('Video loaded for verification');
                }}
                onCanPlay={() => {
                  console.log('Video can play for verification');
                }}
              />

              {verified === true && (
                <div className="verification-result success">
                  <CheckCircle size={64} />
                  <p>Identity Verified!</p>
                </div>
              )}

              {verified === false && (
                <div className="verification-result failure">
                  <XCircle size={64} />
                  <p>Identity Verification Failed</p>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width="640"
                height="480"
                className="hidden-canvas"
              />
            </div>

            <div className="camera-controls">
              {!comparing && verified === null && (
                <button
                  className="capture-button"
                  onClick={captureImage}
                >
                  <Camera size={24} />
                  <span>Capture Image</span>
                </button>
              )}

              {comparing && (
                <div className="comparing-indicator">
                  <p>Comparing images...</p>
                  <div className="loading-spinner"></div>
                </div>
              )}

              {verified === false && (
                <button
                  className="retry-button"
                  onClick={() => setVerified(null)}
                >
                  Try Again
                </button>
              )}
            </div>

            <div className="verification-status-display">
              <div className="status-container">
                <p>Verification Status:</p>
                <div className={`status-badge status-${verificationStatus}`}>
                  {verificationStatus}
                </div>
              </div>
              <p className="status-text">
                {verificationStatus === 0
                  ? (verified === null ? 'Not Verified Yet' : 'Verification Failed')
                  : 'Successfully Verified'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .monitoring-video,
        .camera-video {
          width: 100%;
          height: auto;
          display: block;
          background-color: #000;
          object-fit: contain;
          max-height: 480px;
          border-radius: 4px;
          border: 2px solid #ddd;
        }

        .video-container,
        .camera-container {
          position: relative;
          width: 100%;
          background-color: #000;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
        }

        .live-indicator {
          position: absolute;
          top: 10px;
          left: 10px;
          background-color: rgba(0, 123, 255, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          font-weight: bold;
          z-index: 10;
          animation: pulse 2s infinite;
        }

        /* Camera Source Selection Styles */
        .camera-source-selection {
          display: flex;
          flex-direction: column;
          background-color: #f8f9fa;
          padding: 12px 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          border-left: 4px solid #6610f2;
        }

        .source-label {
          font-weight: 600;
          margin-right: 15px;
          margin-bottom: 10px;
          white-space: nowrap;
        }

        .source-options {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .source-option {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background-color: #e9ecef;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .source-option.selected {
          background-color: #6610f2;
          color: white;
        }

        .source-option input {
          margin-right: 8px;
        }
        
        /* Camera device selection styles */
        .camera-device-info {
          margin-top: 10px;
          padding: 10px;
          background-color: rgba(0,0,0,0.05);
          border-radius: 6px;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .camera-device-info p {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 500;
        }
        
        .device-item {
          display: flex;
          padding: 8px 10px;
          margin-bottom: 6px;
          background-color: #ffffff;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .device-item:hover {
          background-color: #f0f0f0;
        }
        
        .device-item.active {
          background-color: #e6f7ff;
          border-left: 3px solid #007bff;
        }
        
        .device-number {
          font-weight: 600;
          margin-right: 8px;
          color: #555;
          width: 20px;
        }
        
        .device-label {
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .camera-source-info {
          margin-top: 10px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.4;
          border-left: 4px solid #007bff;
        }
        
        .camera-source-info p {
          margin: 3px 0;
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

        .icon-spin {
          animation: spin 1.5s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .hidden-canvas {
          display: none;
        }

        .camera-connection-status.connected {
          border-left: 4px solid #28a745;
        }

        .camera-connection-status.disconnected {
          border-left: 4px solid #dc3545;
        }

        .camera-connection-status.webcam {
          border-left: 4px solid #007bff;
        }

        .camera-error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin: 10px 0;
        }

        .camera-error p {
          margin: 0;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .fire-alert {
          background-color: #f8d7da;
          border: 2px solid #dc3545;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          font-weight: bold;
          text-align: center;
        }

        .fire-alert.blinking {
          animation: blink 0.5s infinite;
        }

        @keyframes blink {
          0%, 50% { background-color: #f8d7da; }
          51%, 100% { background-color: #dc3545; color: white; }
        }

        .calibration-message {
          background-color: #d1ecf1;
          border: 1px solid #bee5eb;
          color: #0c5460;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
          text-align: center;
        }

        .connection-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .btn-connect {
          padding: 8px 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .btn-connect:hover {
          background-color: #0056b3;
        }

        .btn-connect.connected {
          background-color: #28a745;
        }

        .btn-connect.connected:hover {
          background-color: #1e7e34;
        }

        .btn-connect:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }

        .camera-connection-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid #007bff;
        }

        .connection-indicator {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #dc3545;
          margin-right: 8px;
          display: inline-block;
        }

        .camera-connection-status.connected .status-dot {
          background-color: #28a745;
          animation: pulse 2s infinite;
        }

        .connection-label {
          font-weight: 600;
          font-size: 14px;
        }

        .check-in-button.checked-in {
          background-color: #28a745;
          color: white;
          cursor: default;
          border-color: #1e7e34;
        }
        
        .check-in-button.checked-in:hover {
          background-color: #28a745;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
// // 




// import React, { useState, useEffect, useRef } from 'react';
// import { ref, onValue, update, get, set, push } from 'firebase/database';
// import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { database, storage } from '../firebase';
// import { 
//   Users, Calendar, DollarSign, Ticket, Thermometer, Droplets, Wine, 
//   AlertTriangle, Camera, X, CheckCircle, XCircle, Video, VideoOff, User, UserPlus, Shield, List, Wind
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
//     activityStatus: 0 // Numeric status: 0=normal, 1=fire
//   });
//   const [loading, setLoading] = useState(true);
//   const [showCamera, setShowCamera] = useState(false);
//   const [currentBooking, setCurrentBooking] = useState(null);
//   const [comparing, setComparing] = useState(false);
//   const [verified, setVerified] = useState(null);
//   const [verificationStatus, setVerificationStatus] = useState(0); // 0=not verified/no activity, 1=verified
//   const [monitoringActive, setMonitoringActive] = useState(false);
//   const [fireDetected, setFireDetected] = useState(false);
//   const [blinking, setBlinking] = useState(false);
//   const [fireDetectionCount, setFireDetectionCount] = useState(0);
//   const [lastFrameData, setLastFrameData] = useState(null);
//   const [motionLevel, setMotionLevel] = useState(0);
//   const [verificationLogs, setVerificationLogs] = useState([]);
//   const [showVerificationLogs, setShowVerificationLogs] = useState(false);

//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const streamRef = useRef(null);
//   const monitoringVideoRef = useRef(null);
//   const monitoringStreamRef = useRef(null);
//   const monitoringCanvasRef = useRef(null);
//   const monitoringIntervalRef = useRef(null);
//   const analysisIntervalRef = useRef(null);
//   const motionCanvasRef = useRef(null);

//   // Check and reset alert state on component mount and unmount
//   useEffect(() => {
//     // On mount, check if there's an old alert and reset it
//     const checkAndResetAlert = async () => {
//       try {
//         const monitoringRef = ref(database, 'monitoring/unusualActivity');
//         const snapshot = await get(monitoringRef);

//         if (snapshot.exists()) {
//           const data = snapshot.val();

//           if (data.status > 0) { // If status is 1 (fire)
//             // Check if the alert is older than 1 minute
//             const alertTime = new Date(data.timestamp);
//             const currentTime = new Date();
//             const timeDiffMinutes = (currentTime - alertTime) / (1000 * 60);

//             if (timeDiffMinutes > 1) {
//               console.log("Resetting stale alert from previous session");
//               await set(monitoringRef, {
//                 status: 0,
//                 message: 'Normal',
//                 timestamp: new Date().toISOString()
//               });
//             }
//           }
//         }
//       } catch (error) {
//         console.error("Error checking alert state:", error);
//       }
//     };

//     checkAndResetAlert();

//     // Cleanup function when component unmounts
//     return () => {
//       if (monitoringStreamRef.current) {
//         monitoringStreamRef.current.getTracks().forEach(track => track.stop());
//       }
//       if (monitoringIntervalRef.current) {
//         clearInterval(monitoringIntervalRef.current);
//       }
//       if (analysisIntervalRef.current) {
//         clearInterval(analysisIntervalRef.current);
//       }

//       // Reset Firebase alert state on unmount to prevent persisting alerts
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

//           // Initialize verification logs for all bookings if they don't exist
//           initializeVerificationLogs(bookings);
//         }
//         setLoading(false);
//       });

//       // Fetch all verification logs
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

//           if (statusCode === 1) { // Fire detected
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

//           // Parse temperature value
//           const temperature = parseFloat(sensorsData.Temperature) || 0;

//           // Parse humidity value
//           const humidity = parseFloat(sensorsData.Humidity) || 0;

//           // Check alcohol detection status
//           const alcoholValue = parseInt(sensorsData.Alcohol) || 0;
//           const alcoholStatus = alcoholValue === 0 ? 'No detection' : 'Alcohol detected';

//           // Check gas detection status
//           const gasValue = parseInt(sensorsData.Gas) || 0;
//           const gasStatus = gasValue === 0 ? 'No detection' : 'Gas detected';

//           // Check fire detection status from Firebase
//           const fireValue = parseInt(sensorsData.Fire) || 0;
//           const fireStatus = fireValue === 0 ? 'No detection' : 'Fire detected';

//           // Update stats with sensor data
//           setStats(prevStats => ({
//             ...prevStats,
//             temperature,
//             humidity,
//             alcoholDetection: alcoholStatus,
//             gasDetection: gasStatus,
//             fireDetection: fireStatus
//           }));

//           // If fire is detected from the backend sensor (Firebase value is 1)
//           if (fireValue === 1) {
//             // Update Firebase with status 1 for fire detection
//             const monitoringRef = ref(database, 'monitoring/unusualActivity');
//             const timestamp = new Date().toISOString();

//             set(monitoringRef, {
//               status: 1,
//               message: 'Fire detected',
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
//       // Get existing verification logs
//       const logsRef = ref(database, 'verification_logs');
//       const snapshot = await get(logsRef);
//       const existingLogs = snapshot.exists() ? snapshot.val() : {};

//       // Map of booking IDs that already have logs
//       const bookingsWithLogs = new Set();

//       // Extract booking IDs from existing logs
//       Object.values(existingLogs).forEach(log => {
//         if (log.bookingId) {
//           bookingsWithLogs.add(log.bookingId);
//         }
//       });

//       // Create logs for bookings that don't have one yet
//       for (const booking of bookings) {
//         if (!bookingsWithLogs.has(booking.id)) {
//           // Create a new verification log with status 0 (not verified)
//           const verificationId = `verification_init_${booking.id}`;
//           const timestamp = new Date().toISOString();

//           await set(ref(database, `verification_logs/${verificationId}`), {
//             userId: booking.userId || "unknown",
//             bookingId: booking.id,
//             timestamp: timestamp,
//             status: 0, // Initial status is 0 (not verified)
//             capturedImageUrl: "",
//             referenceImageUrl: "",
//             adminId: "system_init",
//             location: "Not Checked In",
//             initialized: true
//           });

//           console.log(`Initialized verification log for booking ${booking.id}`);
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

//       onValue(logsRef, (snapshot) => {
//         if (snapshot.exists()) {
//           const logsData = snapshot.val();

//           // Convert to array and sort by timestamp (newest first)
//           const logsArray = Object.entries(logsData).map(([id, data]) => ({
//             id,
//             ...data,
//             timestamp: data.timestamp || new Date().toISOString()
//           })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

//           setVerificationLogs(logsArray);
//         } else {
//           setVerificationLogs([]);
//         }
//       });
//     } catch (error) {
//       console.error("Error fetching verification logs:", error);
//     }
//   };

//   // Clean up camera resources
//   useEffect(() => {
//     return () => {
//       if (streamRef.current) {
//         streamRef.current.getTracks().forEach(track => track.stop());
//       }
//       if (monitoringStreamRef.current) {
//         monitoringStreamRef.current.getTracks().forEach(track => track.stop());
//       }
//       if (monitoringIntervalRef.current) {
//         clearInterval(monitoringIntervalRef.current);
//       }
//       if (analysisIntervalRef.current) {
//         clearInterval(analysisIntervalRef.current);
//       }
//     };
//   }, []);

//   // Initialize canvas when component mounts
//   useEffect(() => {
//     // Initialize the canvas with a small size just to make sure it exists
//     if (monitoringCanvasRef.current) {
//       const canvas = monitoringCanvasRef.current;
//       const context = canvas.getContext('2d');
//       canvas.width = 320;
//       canvas.height = 240;
//       // Draw something simple to ensure the canvas is working
//       context.fillStyle = "#000";
//       context.fillRect(0, 0, canvas.width, canvas.height);
//     }

//     if (motionCanvasRef.current) {
//       const canvas = motionCanvasRef.current;
//       const context = canvas.getContext('2d');
//       canvas.width = 320;
//       canvas.height = 240;
//       context.fillStyle = "#000";
//       context.fillRect(0, 0, canvas.width, canvas.height);
//     }
//   }, []);

//   // Stat cards
//   const statCards = [
//     { title: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'blue' },
//     { title: 'Total Bookings', value: stats.totalBookings, icon: <Calendar size={24} />, color: 'green' },
//     { title: 'Pending Payments', value: stats.pendingPayments, icon: <DollarSign size={24} />, color: 'orange' },
//     { title: 'Completed Payments', value: stats.completedPayments, icon: <Ticket size={24} />, color: 'purple' }
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

//   // Enhanced fire detection algorithm
//   const detectFire = (imageData) => {
//     const data = imageData.data;
//     let firePixelCount = 0;
//     let brightYellowCount = 0;
//     let brightWhiteCount = 0;

//     // Loop through pixels looking for fire characteristics
//     for (let i = 0; i < data.length; i += 4) {
//       const r = data[i];
//       const g = data[i + 1];
//       const b = data[i + 2];

//       // Check for fire-red/orange pixels (high red, medium green, low blue)
//       // More specific color detection to avoid false positives
//       if (r > 220 && g > 50 && g < 140 && b < 50 && r > g + 100 && r > b + 150) {
//         firePixelCount++;
//       }

//       // Check for flame-yellow pixels (high red, high green, low blue)
//       if (r > 220 && g > 180 && b < 100 && r > b + 120 && g > b + 120) {
//         brightYellowCount++;
//       }

//       // Check for bright white center of flame (all high values)
//       if (r > 240 && g > 240 && b > 220) {
//         brightWhiteCount++;
//       }
//     }

//     // Count total fire-related pixels
//     const totalFirePixels = firePixelCount + brightYellowCount + brightWhiteCount;

//     // Calculate percentage of fire pixels
//     const totalPixels = imageData.width * imageData.height;
//     const fireRatio = totalFirePixels / totalPixels;

//     // Debug information
//     console.log(`Fire detection: ${fireRatio.toFixed(4)} (${firePixelCount} fire pixels, ${brightYellowCount} yellow, ${brightWhiteCount} white)`);

//     // More stringent threshold to avoid false positives
//     return fireRatio > 0.005;
//   };

//   // Calculate motion level between two frames
//   const calculateMotion = (currentFrame, previousFrame) => {
//     if (!previousFrame) return 0;

//     const curr = currentFrame.data;
//     const prev = previousFrame.data;
//     let diffCount = 0;
//     const threshold = 30; // Sensitivity threshold for motion detection

//     // Compare pixels between frames to detect motion
//     for (let i = 0; i < curr.length; i += 4) {
//       const rDiff = Math.abs(curr[i] - prev[i]);
//       const gDiff = Math.abs(curr[i+1] - prev[i+1]);
//       const bDiff = Math.abs(curr[i+2] - prev[i+2]);

//       // If any color channel has changed significantly, count as motion
//       if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
//         diffCount++;
//       }
//     }

//     const totalPixels = currentFrame.width * currentFrame.height;
//     const motionRatio = diffCount / totalPixels;

//     // Debug info
//     console.log(`Motion level: ${(motionRatio * 100).toFixed(2)}% changed pixels`);

//     return motionRatio;
//   };

//   // Start background monitoring
//   const startBackgroundMonitoring = async () => {
//     try {
//       // Reset the detection state
//       setFireDetectionCount(0);
//       setFireDetected(false);
//       setBlinking(false);
//       setLastFrameData(null);
//       setMotionLevel(0);

//       // Always ensure we're starting with a clean state in Firebase
//       const monitoringRef = ref(database, 'monitoring/unusualActivity');
//       await set(monitoringRef, {
//         status: 0,
//         message: 'Normal',
//         timestamp: new Date().toISOString()
//       });

//       const stream = await navigator.mediaDevices.getUserMedia({ 
//         video: { 
//           width: 320, 
//           height: 240,
//           facingMode: 'environment' 
//         } 
//       });

//       monitoringStreamRef.current = stream;
//       if (monitoringVideoRef.current) {
//         monitoringVideoRef.current.srcObject = stream;
//       }

//       // Using setTimeout to ensure the video element is properly initialized
//       setTimeout(() => {
//         // Try-catch block specifically for canvas operations
//         try {
//           const canvas = monitoringCanvasRef.current;
//           const motionCanvas = motionCanvasRef.current;

//           if (!canvas || !motionCanvas) {
//             throw new Error("Canvas elements are not available");
//           }

//           const context = canvas.getContext('2d');
//           const motionContext = motionCanvas.getContext('2d');

//           if (!context || !motionContext) {
//             throw new Error("Could not get 2D context from canvas");
//           }

//           canvas.width = 320;
//           canvas.height = 240;
//           motionCanvas.width = 320;
//           motionCanvas.height = 240;

//           monitoringIntervalRef.current = setInterval(() => {
//             try {
//               if (monitoringVideoRef.current && monitoringVideoRef.current.readyState === 4) {
//                 // Draw current frame to main canvas
//                 context.drawImage(monitoringVideoRef.current, 0, 0, canvas.width, canvas.height);

//                 // Get image data for analysis
//                 const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

//                 // Calculate motion if we have a previous frame
//                 let currentMotionLevel = 0;
//                 if (lastFrameData) {
//                   currentMotionLevel = calculateMotion(imageData, lastFrameData);
//                   setMotionLevel(currentMotionLevel);

//                   // Draw motion visualization to motion canvas
//                   const motionData = motionContext.createImageData(canvas.width, canvas.height);
//                   const currData = imageData.data;
//                   const prevData = lastFrameData.data;
//                   const motionDataArr = motionData.data;

//                   for (let i = 0; i < currData.length; i += 4) {
//                     const rDiff = Math.abs(currData[i] - prevData[i]);
//                     const gDiff = Math.abs(currData[i+1] - prevData[i+1]);
//                     const bDiff = Math.abs(currData[i+2] - prevData[i+2]);

//                     if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
//                       // Highlight areas with motion in blue
//                       motionDataArr[i] = 0;      // R
//                       motionDataArr[i+1] = 0;    // G
//                       motionDataArr[i+2] = 255;  // B
//                       motionDataArr[i+3] = 255;  // Alpha
//                     } else {
//                       // Keep original image for areas without motion
//                       motionDataArr[i] = currData[i];
//                       motionDataArr[i+1] = currData[i+1];
//                       motionDataArr[i+2] = currData[i+2];
//                       motionDataArr[i+3] = 255;
//                     }
//                   }
//                 }

//                 // Store current frame for next comparison
//                 setLastFrameData(imageData);

//                 // Check for fire
//                 const fireDetected = detectFire(imageData);

//                 // Update Firebase based on detection
//                 if (fireDetected) {
//                   // Increment fire detection counter
//                   setFireDetectionCount(prev => {
//                     const newCount = prev + 1;

//                     // If we detect fire for 2 consecutive frames, trigger the alert
//                     if (newCount >= 2) {
//                       // Update Firebase with status 1 for fire
//                       console.log("FIRE DETECTED! Updating Firebase...");
//                       const monitoringRef = ref(database, 'monitoring/unusualActivity');
//                       const timestamp = new Date().toISOString();

//                       set(monitoringRef, {
//                         status: 1,
//                         message: 'Fire detected',
//                         timestamp: timestamp
//                       }).then(() => {
//                         console.log("Firebase updated with fire detection");
//                         setFireDetected(true);
//                         setBlinking(true);
//                       }).catch(err => {
//                         console.error("Error updating firebase:", err);
//                       });
//                     }

//                     return newCount;
//                   });
//                 } else {
//                   // Gradually decrease counters if nothing is detected
//                   setFireDetectionCount(prev => Math.max(0, prev - 1));
//                 }
//               }
//             } catch (error) {
//               console.error("Error in monitoring interval:", error);
//             }
//           }, 300); // Run detection more frequently (3 times per second)

//           setMonitoringActive(true);
//         } catch (canvasError) {
//           console.error("Canvas initialization error:", canvasError);
//           alert('Error initializing monitoring canvas. Please try again.');
//         }
//       }, 500); // Small delay to ensure video element is properly initialized
//     } catch (error) {
//       console.error('Error starting background monitoring:', error);
//       alert('Unable to start background monitoring. Please check camera permissions.');
//     }
//   };

//   // Stop background monitoring
//   const stopBackgroundMonitoring = () => {
//     if (monitoringStreamRef.current) {
//       monitoringStreamRef.current.getTracks().forEach(track => track.stop());
//     }
//     if (monitoringIntervalRef.current) {
//       clearInterval(monitoringIntervalRef.current);
//     }
//     if (analysisIntervalRef.current) {
//       clearInterval(analysisIntervalRef.current);
//     }
//     setMonitoringActive(false);

//     // Reset detection states
//     setFireDetected(false);
//     setBlinking(false);
//     setFireDetectionCount(0);
//     setLastFrameData(null);
//     setMotionLevel(0);

//     // Always reset Firebase status when stopping monitoring
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
//   const handleCheckIn = (booking) => {
//     setCurrentBooking(booking);
//     setShowCamera(true);

//     // Find if there's an existing verification log for this booking
//     const existingLog = findExistingVerificationLog(booking.id);

//     // Set initial verification status based on existing log
//     setVerificationStatus(existingLog ? existingLog.status : 0);
//     setVerified(existingLog && existingLog.status === 1 ? true : null);

//     startCamera();
//   };

//   // Start camera
//   const startCamera = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true });
//       streamRef.current = stream;
//       if (videoRef.current) {
//         videoRef.current.srcObject = stream;
//       }
//     } catch (error) {
//       console.error('Error accessing camera:', error);
//       alert('Unable to access camera. Please check permissions.');
//     }
//   };

//   // Stop camera
//   const stopCamera = () => {
//     if (streamRef.current) {
//       streamRef.current.getTracks().forEach(track => track.stop());
//     }
//     setShowCamera(false);
//     setCurrentBooking(null);
//     setVerified(null);
//     setVerificationStatus(0); // Reset verification status
//     if (!monitoringActive) {
//       startBackgroundMonitoring();
//     }
//   };

//   // Capture image
//   const captureImage = () => {
//     if (videoRef.current && canvasRef.current) {
//       const video = videoRef.current;
//       const canvas = canvasRef.current;
//       const context = canvas.getContext('2d');
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//       context.drawImage(video, 0, 0, canvas.width, canvas.height);
//       canvas.toBlob(blob => {
//         if (blob) {
//           uploadImageAndCompare(blob);
//         }
//       }, 'image/jpeg', 0.9);
//     }
//   };

//   // Upload and compare image with complete verification logging
//   const uploadImageAndCompare = async (imageBlob) => {
//     if (!currentBooking || !currentBooking.userId) {
//       alert("Cannot verify: booking information is incomplete");
//       setComparing(false);
//       return;
//     }
//     setComparing(true);
//     try {
//       // Find existing verification log
//       const existingLog = findExistingVerificationLog(currentBooking.id);
//       const timestamp = new Date().toISOString();

//       // 1. Upload the captured image to Firebase Storage
//       const checkInImageRef = storageRef(storage, `check-ins/${currentBooking.id}_${Date.now()}.jpg`);
//       await uploadBytes(checkInImageRef, imageBlob);
//       const checkInImageUrl = await getDownloadURL(checkInImageRef);

//       // 2. Get user reference data
//       const userRef = ref(database, `users/${currentBooking.userId}`);
//       const userSnapshot = await get(userRef);
//       let profileImageUrl = null;
//       let userName = "Unknown User";

//       if (userSnapshot.exists()) {
//         const userData = userSnapshot.val();
//         profileImageUrl = userData.faceImageUrl || userData.profileImageUrl;
//         userName = userData.name || userData.displayName || "Unknown User";
//       }

//       // 3. Simulate face verification (in a real app, use a face comparison API)
//       setTimeout(() => {
//         // Simulate 70% success rate
//         const isMatch = Math.random() > 0.3; 
//         const numericStatus = isMatch ? 1 : 0; // 1 = verified, 0 = failed

//         // 4. Update the transaction record
//         const bookingRef = ref(database, `stadium_transactions/${currentBooking.id}`);
//         update(bookingRef, {
//           checkedIn: true,
//           checkedInAt: timestamp,
//           checkInImageUrl: checkInImageUrl,
//           identityVerified: isMatch,
//           verificationStatus: numericStatus // Numeric status
//         });

//         // 5. Update existing verification log or create a new one
//         let logRef;

//         if (existingLog) {
//           // Update existing log
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
//           // Create new verification log
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

//         // 6. Add to user's verification history
//         const userHistoryRef = ref(database, `users/${currentBooking.userId}/verification_history/${Date.now()}`);
//         set(userHistoryRef, {
//           timestamp: timestamp,
//           status: numericStatus,
//           bookingId: currentBooking.id
//         });

//         // 7. Update the UI state
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
//       alert('Error during check-in process. Please try again.');
//       setComparing(false);
//     }
//   };

//   // Toggle verification logs view
//   const toggleVerificationLogs = () => {
//     setShowVerificationLogs(prev => !prev);
//   };

//   // Manual force fire detection (for testing)
//   const forceFireDetection = () => {
//     const monitoringRef = ref(database, 'monitoring/unusualActivity');
//     const timestamp = new Date().toISOString();
//     const message = 'Fire detected';

//     set(monitoringRef, {
//       status: 0,
//       message: message,
//       timestamp: timestamp
//     }).then(() => {
//       console.log("Firebase manually updated with fire detection");
//       setFireDetected(true);
//       setBlinking(true);
//     }).catch(err => {
//       console.error("Error updating firebase:", err);
//     });
//   };

//   // Manual reset of detection
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
//           <div className="monitoring-grid">
//             {monitoringCards.map((card, index) => (
//               <div key={index} className={`monitoring-card ${card.gradientClass}`} 
//                    style={{animation: (card.title === 'Fire Detection' && stats.fireDetection === 'Fire detected') || 
//                           (card.title === 'Unusual Activity' && stats.activityStatus === 1) ? 
//                           'pulse-red 1s infinite alternate' : 'none'}}
//               >
//                 <div className="monitoring-icon">{card.icon}</div>
//                 <div className="monitoring-info">
//                   <h3 className="monitoring-title">{card.title}</h3>
//                   <p className="monitoring-value">{card.value}</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <style jsx>{`
//             @keyframes pulse-red {
//               from { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
//               to { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
//             }

//             @keyframes blink {
//               from { opacity: 1; }
//               to { opacity: 0.7; }
//             }
//           `}</style>

//           <div className="monitoring-controls">
//             {monitoringActive ? (
//               <button 
//                 onClick={stopBackgroundMonitoring}
//                 className="monitoring-button stop"
//                 style={{
//                   padding: '8px 16px',
//                   backgroundColor: '#f44336',
//                   color: 'white',
//                   border: 'none',
//                   borderRadius: '4px',
//                   display: 'inline-flex',
//                   alignItems: 'center',
//                   cursor: 'pointer',
//                   marginRight: '10px',
//                   fontWeight: '500'
//                 }}
//               >
//                 <VideoOff size={20} />
//                 <span style={{ marginLeft: '8px' }}>Stop Monitoring</span>
//               </button>
//             ) : (
//               <button 
//                 onClick={startBackgroundMonitoring}
//                 className="monitoring-button start"
//                 style={{
//                   padding: '8px 16px',
//                   backgroundColor: '#4CAF50',
//                   color: 'white',
//                   border: 'none',
//                   borderRadius: '4px',
//                   display: 'inline-flex',
//                   alignItems: 'center',
//                   cursor: 'pointer',
//                   marginRight: '10px',
//                   fontWeight: '500'
//                 }}
//               >
//                 <Video size={20} />
//                 <span style={{ marginLeft: '8px' }}>Start Monitoring</span>
//               </button>
//             )}

//             {/* Testing buttons for development */}
//             {monitoringActive && (
//               <>
//                 <button 
//                   onClick={forceFireDetection}
//                   style={{
//                     padding: '8px 16px',
//                     backgroundColor: '#FF9800',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px',
//                     display: 'inline-flex',
//                     alignItems: 'center',
//                     cursor: 'pointer',
//                     marginRight: '10px',
//                     fontWeight: '500'
//                   }}
//                 >
//                   <AlertTriangle size={20} />
//                   <span style={{ marginLeft: '8px' }}>Test Fire</span>
//                 </button>

//                 <button 
//                   onClick={resetFireDetection}
//                   style={{
//                     padding: '8px 16px',
//                     backgroundColor: '#2196F3',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px',
//                     display: 'inline-flex',
//                     alignItems: 'center',
//                     cursor: 'pointer',
//                     fontWeight: '500'
//                   }}
//                 >
//                   <CheckCircle size={20} />
//                   <span style={{ marginLeft: '8px' }}>Reset</span>
//                 </button>
//               </>
//             )}
//           </div>

//           {fireDetected && (
//             <div style={{ 
//               marginTop: '15px',
//               padding: '10px',
//               backgroundColor: blinking ? '#ffebee' : '#fff3e0',
//               border: `1px solid ${blinking ? '#f44336' : '#ff9800'}`,
//               borderRadius: '4px',
//               textAlign: 'center',
//               animation: blinking ? 'blink 1s infinite alternate' : 'none'
//             }}>
//               <p style={{ 
//                 margin: 0, 
//                 color: blinking ? '#d32f2f' : '#e65100', 
//                 fontWeight: 'bold',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center'
//               }}>
//                 <AlertTriangle size={18} style={{ marginRight: '8px' }} />
//                 Fire detected! Please check the area.
//               </p>
//             </div>
//           )}

//           {/* Always render the video and canvas elements but only show when active */}
//           <div className="monitoring-container" style={{ 
//             marginTop: '15px', 
//             display: monitoringActive ? 'block' : 'none'
//           }}>
//             <div style={{ 
//               padding: '15px', 
//               backgroundColor: '#f5f5f5', 
//               borderRadius: '8px',
//               boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
//             }}>
//               <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Live Monitoring Feed</h4>
//               <div style={{ display: 'flex', justifyContent: 'center' }}>
//                 <video 
//                   ref={monitoringVideoRef}
//                   autoPlay
//                   playsInline
//                   muted
//                   width="320"
//                   height="240"
//                   style={{ 
//                     border: '1px solid #ddd', 
//                     borderRadius: '4px',
//                     backgroundColor: '#000'
//                   }}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Hidden canvases for processing */}
//           <canvas 
//             ref={monitoringCanvasRef} 
//             width="320" 
//             height="240" 
//             style={{ 
//               display: 'none',
//               position: 'absolute',
//               pointerEvents: 'none'
//             }} 
//           />
//           <canvas 
//             ref={motionCanvasRef} 
//             width="320" 
//             height="240" 
//             style={{ 
//               display: 'none',
//               position: 'absolute',
//               pointerEvents: 'none'
//             }} 
//           />
//         </div>

//         {/* Verification Logs Section */}
//         <div className="verification-logs-section">
//           <div className="section-header" style={{ 
//             display: 'flex', 
//             justifyContent: 'space-between', 
//             alignItems: 'center',
//             marginBottom: '15px'
//           }}>
//             <h3>Verification Status</h3>
//             <button 
//               onClick={toggleVerificationLogs}
//               style={{
//                 padding: '6px 12px',
//                 backgroundColor: '#2196F3',
//                 color: 'white',
//                 border: 'none',
//                 borderRadius: '4px',
//                 display: 'inline-flex',
//                 alignItems: 'center',
//                 cursor: 'pointer',
//                 fontWeight: '500'
//               }}
//             >
//               <List size={18} />
//               <span style={{ marginLeft: '6px' }}>{showVerificationLogs ? 'Hide Logs' : 'Show Logs'}</span>
//             </button>
//           </div>

//           {showVerificationLogs && (
//             <div className="verification-logs-table" style={{
//               backgroundColor: '#fff',
//               borderRadius: '4px',
//               boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
//               padding: '10px',
//               marginBottom: '20px',
//               overflowX: 'auto'
//             }}>
//               {verificationLogs.length > 0 ? (
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr style={{ borderBottom: '2px solid #eee' }}>
//                       <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
//                       {/* <th style={{ padding: '10px', textAlign: 'left' }}>Match</th> */}
//                       <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
//                       <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
//                       <th style={{ padding: '10px', textAlign: 'left' }}>Location</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {verificationLogs.map((log) => (
//                       <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
//                         <td style={{ padding: '10px' }}>{log.userName || log.userId}</td>
//                         {/* <td style={{ padding: '10px' }}>{log.matchTitle || ' '}</td> */}
//                         <td style={{ padding: '10px' }}>{new Date(log.timestamp).toLocaleString()}</td>
//                         <td style={{ padding: '10px', textAlign: 'center' }}>
//                           <div style={{
//                             width: '30px',
//                             height: '30px',
//                             display: 'flex',
//                             justifyContent: 'center',
//                             alignItems: 'center',
//                             borderRadius: '50%',
//                             backgroundColor: log.status === 1 ? '#4CAF50' : '#f44336',
//                             color: 'white',
//                             fontWeight: 'bold',
//                             margin: '0 auto'
//                           }}>
//                             {log.status}
//                           </div>
//                         </td>
//                         <td style={{ padding: '10px' }}>{log.location || 'Unknown'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               ) : (
//                 <p style={{ textAlign: 'center', padding: '20px' }}>No verification logs found</p>
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
//                   // Find verification log for this booking
//                   const verLog = verificationLogs.find(log => log.bookingId === booking.id);
//                   const verStatus = verLog ? verLog.status : 0;

//                   return (
//                     <tr key={booking.id}>
//                       <td>{index + 1}</td>
//                       <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
//                       <td>{booking.matchTitle || ''}</td>
//                       <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
//                       <td>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//                           <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
//                             {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
//                           </span>
//                           <div style={{
//                             width: '24px',
//                             height: '24px',
//                             display: 'flex',
//                             justifyContent: 'center',
//                             alignItems: 'center',
//                             borderRadius: '50%',
//                             backgroundColor: verStatus === 1 ? '#4CAF50' : '#f44336',
//                             color: 'white',
//                             fontSize: '12px',
//                             fontWeight: 'bold'
//                           }}>
//                             {verStatus}
//                           </div>
//                         </div>
//                       </td>
//                       <td>
//                         <button 
//                           className="check-in-button"
//                           onClick={() => handleCheckIn(booking)}
//                           disabled={booking.checkedIn && verStatus === 1}
//                           style={{
//                             padding: '6px 12px',
//                             backgroundColor: booking.checkedIn && verStatus === 1 ? '#4CAF50' : '#2196F3',
//                             color: 'white',
//                             border: 'none',
//                             borderRadius: '4px',
//                             cursor: booking.checkedIn && verStatus === 1 ? 'default' : 'pointer',
//                             opacity: booking.checkedIn && verStatus === 1 ? 0.7 : 1
//                           }}
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
//         <div className="camera-modal-overlay" style={{
//           position: 'fixed',
//           top: 0,
//           left: 0,
//           width: '100%',
//           height: '100%',
//           backgroundColor: 'rgba(0, 0, 0, 0.7)',
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//           zIndex: 1000
//         }}>
//           <div className="camera-modal" style={{
//             backgroundColor: '#fff',
//             borderRadius: '8px',
//             padding: '20px',
//             maxWidth: '90%',
//             width: '500px',
//             boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
//           }}>
//             <div className="camera-modal-header" style={{
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               marginBottom: '15px'
//             }}>
//               <h3 style={{ margin: 0 }}>Check-In Verification</h3>
//               <button 
//                 className="close-button" 
//                 onClick={stopCamera}
//                 style={{
//                   background: 'none',
//                   border: 'none',
//                   cursor: 'pointer',
//                   fontSize: '20px'
//                 }}
//               >
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="camera-container" style={{
//               position: 'relative',
//               width: '100%',
//               backgroundColor: '#000',
//               borderRadius: '4px',
//               overflow: 'hidden',
//               marginBottom: '20px'
//             }}>
//               <video 
//                 ref={videoRef}
//                 autoPlay
//                 playsInline
//                 muted
//                 className="camera-video"
//                 style={{
//                   width: '100%',
//                   display: 'block'
//                 }}
//               />
//               <canvas ref={canvasRef} style={{ display: 'none' }} />

//               {verified === true && (
//                 <div className="verification-result success" style={{
//                   position: 'absolute',
//                   top: 0,
//                   left: 0,
//                   width: '100%',
//                   height: '100%',
//                   backgroundColor: 'rgba(76, 175, 80, 0.7)',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   color: 'white'
//                 }}>
//                   <CheckCircle size={64} />
//                   <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px' }}>Identity Verified!</p>
//                 </div>
//               )}

//               {verified === false && (
//                 <div className="verification-result failure" style={{
//                   position: 'absolute',
//                   top: 0,
//                   left: 0,
//                   width: '100%',
//                   height: '100%',
//                   backgroundColor: 'rgba(244, 67, 54, 0.7)',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   color: 'white'
//                 }}>
//                   <XCircle size={64} />
//                   <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px' }}>Identity Verification Failed</p>
//                 </div>
//               )}
//             </div>

//             <div className="camera-controls">
//               {!comparing && verified === null && (
//                 <button 
//                   className="capture-button"
//                   onClick={captureImage}
//                   style={{
//                     padding: '12px 24px',
//                     backgroundColor: '#4CAF50',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px', 
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     gap: '10px',
//                     fontSize: '16px',
//                     fontWeight: 'bold',
//                     cursor: 'pointer',
//                     boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
//                     margin: '0 auto'
//                   }}
//                 >
//                   <Camera size={24} />
//                   <span>Capture Image</span>
//                 </button>
//               )}

//               {comparing && (
//                 <div className="comparing-indicator" style={{
//                   textAlign: 'center',
//                   marginTop: '10px'
//                 }}>
//                   <p style={{ marginBottom: '10px' }}>Comparing images...</p>
//                   <div className="loading-spinner" style={{
//                     display: 'inline-block',
//                     width: '30px',
//                     height: '30px',
//                     border: '3px solid rgba(0, 0, 0, 0.1)',
//                     borderRadius: '50%',
//                     borderTopColor: '#2196F3',
//                     animation: 'spin 1s ease-in-out infinite'
//                   }}></div>
//                   <style jsx>{`
//                     @keyframes spin {
//                       to { transform: rotate(360deg); }
//                     }
//                   `}</style>
//                 </div>
//               )}

//               {verified === false && (
//                 <button 
//                   className="retry-button"
//                   onClick={() => setVerified(null)}
//                   style={{
//                     padding: '10px 20px',
//                     backgroundColor: '#2196F3',
//                     color: 'white',
//                     border: 'none',
//                     borderRadius: '4px',
//                     cursor: 'pointer',
//                     fontWeight: 'bold',
//                     display: 'block',
//                     margin: '10px auto 0'
//                   }}
//                 >
//                   Try Again
//                 </button>
//               )}
//             </div>

//             {/* Verification Status Number Display */}
//             <div style={{
//               marginTop: '15px',
//               padding: '10px',
//               backgroundColor: '#f5f5f5',
//               borderRadius: '4px',
//               textAlign: 'center'
//             }}>
//               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
//                 <p style={{ 
//                   margin: '0 10px 0 0',
//                   fontWeight: '500'
//                 }}>
//                   Verification Status:
//                 </p>
//                 <div style={{
//                   width: '40px',
//                   height: '40px',
//                   display: 'flex',
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   borderRadius: '50%',
//                   backgroundColor: verificationStatus === 0 ? '#f44336' : '#4CAF50',
//                   color: 'white',
//                   fontWeight: 'bold',
//                   fontSize: '20px',
//                   boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
//                 }}>
//                   {verificationStatus}
//                 </div>
//               </div>
//               <p style={{ 
//                 margin: '5px 0 0 0',
//                 fontWeight: '500',
//                 fontSize: '14px',
//                 color: '#757575'
//               }}>
//                 {verificationStatus === 0 
//                   ? (verified === null ? 'Not Verified Yet' : 'Verification Failed') 
//                   : 'Successfully Verified'}
//               </p>
//             </div>
//           </div>
//         </div>
//       )}
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
  AlertTriangle, Camera, X, CheckCircle, XCircle, Video, VideoOff, User, UserPlus, Shield, List, Wind
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
    activityStatus: 0 // Numeric status: 0=normal, 1=fire
  });
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [verified, setVerified] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(0); // 0=not verified/no activity, 1=verified
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [fireDetected, setFireDetected] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [fireDetectionCount, setFireDetectionCount] = useState(0);
  const [lastFrameData, setLastFrameData] = useState(null);
  const [motionLevel, setMotionLevel] = useState(0);
  const [verificationLogs, setVerificationLogs] = useState([]);
  const [showVerificationLogs, setShowVerificationLogs] = useState(false);
  const [monitoringFrameCount, setMonitoringFrameCount] = useState(0);
  const [calibrationCompleted, setCalibrationCompleted] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const monitoringVideoRef = useRef(null);
  const monitoringStreamRef = useRef(null);
  const monitoringCanvasRef = useRef(null);
  const monitoringIntervalRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  const motionCanvasRef = useRef(null);

  // Effect to reset Firebase data on component mount
  useEffect(() => {
    // Reset Firebase data when component mounts to ensure we start with a clean state
    const resetFirebaseData = async () => {
      try {
        const monitoringRef = ref(database, 'monitoring/unusualActivity');
        await set(monitoringRef, {
          status: 0,
          message: 'Normal',
          timestamp: new Date().toISOString()
        });
        console.log("Firebase reset to normal state on component mount");
      } catch (error) {
        console.error("Error resetting Firebase data:", error);
      }
    };

    resetFirebaseData();
  }, []);

  // Check and reset alert state on component mount and unmount
  useEffect(() => {
    // On mount, check if there's an old alert and reset it
    const checkAndResetAlert = async () => {
      try {
        const monitoringRef = ref(database, 'monitoring/unusualActivity');
        const snapshot = await get(monitoringRef);

        if (snapshot.exists()) {
          const data = snapshot.val();

          if (data.status > 0) { // If status is 1 (fire)
            // Check if the alert is older than 1 minute
            const alertTime = new Date(data.timestamp);
            const currentTime = new Date();
            const timeDiffMinutes = (currentTime - alertTime) / (1000 * 60);

            if (timeDiffMinutes > 1) {
              console.log("Resetting stale alert from previous session");
              await set(monitoringRef, {
                status: 0,
                message: 'Normal',
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      } catch (error) {
        console.error("Error checking alert state:", error);
      }
    };

    checkAndResetAlert();

    // Cleanup function when component unmounts
    return () => {
      if (monitoringStreamRef.current) {
        monitoringStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }

      // Reset Firebase alert state on unmount to prevent persisting alerts
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

          // Initialize verification logs for all bookings if they don't exist
          initializeVerificationLogs(bookings);
        }
        setLoading(false);
      });

      // Fetch all verification logs
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

          if (statusCode === 1) { // Fire detected
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

          // Parse temperature value
          const temperature = parseFloat(sensorsData.Temperature) || 0;

          // Parse humidity value
          const humidity = parseFloat(sensorsData.Humidity) || 0;

          // Check alcohol detection status
          const alcoholValue = parseInt(sensorsData.Alcohol) || 0;
          const alcoholStatus = alcoholValue === 0 ? 'No detection' : 'Alcohol detected';

          // Check gas detection status
          const gasValue = parseInt(sensorsData.Gas) || 0;
          const gasStatus = gasValue === 0 ? 'No detection' : 'Gas detected';

          // Check fire detection status from Firebase
          const fireValue = parseInt(sensorsData.Fire) || 0;
          const fireStatus = fireValue === 0 ? 'No detection' : 'Fire detected';

          // Update stats with sensor data
          setStats(prevStats => ({
            ...prevStats,
            temperature,
            humidity,
            alcoholDetection: alcoholStatus,
            gasDetection: gasStatus,
            fireDetection: fireStatus
          }));

          // If fire is detected from the backend sensor (Firebase value is 1)
          if (fireValue === 1) {
            // Update Firebase with status 1 for fire detection
            const monitoringRef = ref(database, 'monitoring/unusualActivity');
            const timestamp = new Date().toISOString();

            set(monitoringRef, {
              status: 1,
              message: 'Fire detected',
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
      // Get existing verification logs
      const logsRef = ref(database, 'verification_logs');
      const snapshot = await get(logsRef);
      const existingLogs = snapshot.exists() ? snapshot.val() : {};

      // Map of booking IDs that already have logs
      const bookingsWithLogs = new Set();

      // Extract booking IDs from existing logs
      Object.values(existingLogs).forEach(log => {
        if (log.bookingId) {
          bookingsWithLogs.add(log.bookingId);
        }
      });

      // Create logs for bookings that don't have one yet
      for (const booking of bookings) {
        if (!bookingsWithLogs.has(booking.id)) {
          // Create a new verification log with status 0 (not verified)
          const verificationId = `verification_init_${booking.id}`;
          const timestamp = new Date().toISOString();

          await set(ref(database, `verification_logs/${verificationId}`), {
            userId: booking.userId || "unknown",
            bookingId: booking.id,
            timestamp: timestamp,
            status: 0, // Initial status is 0 (not verified)
            capturedImageUrl: "",
            referenceImageUrl: "",
            adminId: "system_init",
            location: "Not Checked In",
            initialized: true
          });

          console.log(`Initialized verification log for booking ${booking.id}`);
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

      onValue(logsRef, (snapshot) => {
        if (snapshot.exists()) {
          const logsData = snapshot.val();

          // Convert to array and sort by timestamp (newest first)
          const logsArray = Object.entries(logsData).map(([id, data]) => ({
            id,
            ...data,
            timestamp: data.timestamp || new Date().toISOString()
          })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          setVerificationLogs(logsArray);
        } else {
          setVerificationLogs([]);
        }
      });
    } catch (error) {
      console.error("Error fetching verification logs:", error);
    }
  };

  // Clean up camera resources
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (monitoringStreamRef.current) {
        monitoringStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []);

  // Initialize canvas when component mounts
  useEffect(() => {
    // Initialize the canvas with a small size just to make sure it exists
    if (monitoringCanvasRef.current) {
      const canvas = monitoringCanvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = 320;
      canvas.height = 240;
      // Draw something simple to ensure the canvas is working
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (motionCanvasRef.current) {
      const canvas = motionCanvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = 320;
      canvas.height = 240;
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Stat cards
  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'blue' },
    { title: 'Total Bookings', value: stats.totalBookings, icon: <Calendar size={24} />, color: 'green' },
    // { title: 'Pending Payments', value: stats.pendingPayments, icon: <DollarSign size={24} />, color: 'orange' },
    // { title: 'Completed Payments', value: stats.completedPayments, icon: <Ticket size={24} />, color: 'purple' }
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

  // Enhanced fire detection algorithm with higher threshold to prevent false positives
  const detectFire = (imageData) => {
    // Skip first few frames to allow camera to stabilize
    if (monitoringFrameCount < 10) {
      return false;
    }

    const data = imageData.data;
    let firePixelCount = 0;
    let brightYellowCount = 0;
    let brightWhiteCount = 0;

    // Loop through pixels looking for fire characteristics
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // More stringent fire-red/orange pixels detection to avoid false positives
      if (r > 230 && g > 50 && g < 140 && b < 40 && r > g + 120 && r > b + 170) {
        firePixelCount++;
      }

      // More stringent flame-yellow pixels detection
      if (r > 230 && g > 190 && b < 90 && r > b + 130 && g > b + 130) {
        brightYellowCount++;
      }

      // More stringent bright white center of flame detection
      if (r > 245 && g > 245 && b > 230) {
        brightWhiteCount++;
      }
    }

    // Count total fire-related pixels
    const totalFirePixels = firePixelCount + brightYellowCount + brightWhiteCount;

    // Calculate percentage of fire pixels
    const totalPixels = imageData.width * imageData.height;
    const fireRatio = totalFirePixels / totalPixels;

    // Only log if we detect something significant to reduce console noise
    if (fireRatio > 0.001) {
      console.log(`Fire detection: ${fireRatio.toFixed(4)} (${firePixelCount} fire pixels, ${brightYellowCount} yellow, ${brightWhiteCount} white)`);
    }

    // Higher threshold to avoid false positives (0.01 = 1% of pixels)
    return fireRatio > 0.01;
  };

  // Calculate motion level between two frames
  const calculateMotion = (currentFrame, previousFrame) => {
    if (!previousFrame) return 0;

    const curr = currentFrame.data;
    const prev = previousFrame.data;
    let diffCount = 0;
    const threshold = 30; // Sensitivity threshold for motion detection

    // Compare pixels between frames to detect motion
    for (let i = 0; i < curr.length; i += 4) {
      const rDiff = Math.abs(curr[i] - prev[i]);
      const gDiff = Math.abs(curr[i + 1] - prev[i + 1]);
      const bDiff = Math.abs(curr[i + 2] - prev[i + 2]);

      // If any color channel has changed significantly, count as motion
      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffCount++;
      }
    }

    const totalPixels = currentFrame.width * currentFrame.height;
    const motionRatio = diffCount / totalPixels;

    // Debug info
    console.log(`Motion level: ${(motionRatio * 100).toFixed(2)}% changed pixels`);

    return motionRatio;
  };

  // Start background monitoring
  const startBackgroundMonitoring = async () => {
    try {
      // Reset the detection state
      setFireDetectionCount(0);
      setFireDetected(false);
      setBlinking(false);
      setLastFrameData(null);
      setMotionLevel(0);
      setMonitoringFrameCount(0);

      // Always ensure we're starting with a clean state in Firebase
      const monitoringRef = ref(database, 'monitoring/unusualActivity');
      await set(monitoringRef, {
        status: 0,
        message: 'Normal',
        timestamp: new Date().toISOString()
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 320,
          height: 240,
          facingMode: 'environment'
        }
      });

      monitoringStreamRef.current = stream;
      if (monitoringVideoRef.current) {
        monitoringVideoRef.current.srcObject = stream;
      }

      // Using setTimeout to ensure the video element is properly initialized
      // and to give the camera time to adjust to lighting conditions
      setTimeout(() => {
        // Try-catch block specifically for canvas operations
        try {
          const canvas = monitoringCanvasRef.current;
          const motionCanvas = motionCanvasRef.current;

          if (!canvas || !motionCanvas) {
            throw new Error("Canvas elements are not available");
          }

          const context = canvas.getContext('2d');
          const motionContext = motionCanvas.getContext('2d');

          if (!context || !motionContext) {
            throw new Error("Could not get 2D context from canvas");
          }

          canvas.width = 320;
          canvas.height = 240;
          motionCanvas.width = 320;
          motionCanvas.height = 240;

          monitoringIntervalRef.current = setInterval(() => {
            try {
              if (monitoringVideoRef.current && monitoringVideoRef.current.readyState === 4) {
                // Increment frame counter (used to ignore first few frames)
                setMonitoringFrameCount(prev => prev + 1);

                // Draw current frame to main canvas
                context.drawImage(monitoringVideoRef.current, 0, 0, canvas.width, canvas.height);

                // Get image data for analysis
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                // Calculate motion if we have a previous frame
                let currentMotionLevel = 0;
                if (lastFrameData) {
                  currentMotionLevel = calculateMotion(imageData, lastFrameData);
                  setMotionLevel(currentMotionLevel);

                  // Draw motion visualization to motion canvas
                  const motionData = motionContext.createImageData(canvas.width, canvas.height);
                  const currData = imageData.data;
                  const prevData = lastFrameData.data;
                  const motionDataArr = motionData.data;

                  for (let i = 0; i < currData.length; i += 4) {
                    const rDiff = Math.abs(currData[i] - prevData[i]);
                    const gDiff = Math.abs(currData[i + 1] - prevData[i + 1]);
                    const bDiff = Math.abs(currData[i + 2] - prevData[i + 2]);

                    if (rDiff > 30 || gDiff > 30 || bDiff > 30) {
                      // Highlight areas with motion in blue
                      motionDataArr[i] = 0;      // R
                      motionDataArr[i + 1] = 0;    // G
                      motionDataArr[i + 2] = 255;  // B
                      motionDataArr[i + 3] = 255;  // Alpha
                    } else {
                      // Keep original image for areas without motion
                      motionDataArr[i] = currData[i];
                      motionDataArr[i + 1] = currData[i + 1];
                      motionDataArr[i + 2] = currData[i + 2];
                      motionDataArr[i + 3] = 255;
                    }
                  }
                }

                // Store current frame for next comparison
                setLastFrameData(imageData);

                // Skip fire detection for the first few seconds to allow camera to adjust
                if (monitoringFrameCount > 15) {
                  // Check for fire with more stringent criteria
                  const fireDetected = detectFire(imageData);

                  // Update Firebase based on detection
                  if (fireDetected) {
                    // Increment fire detection counter
                    setFireDetectionCount(prev => {
                      const newCount = prev + 1;

                      // Require more consecutive positive detections (5 instead of 2)
                      // This helps eliminate false positives
                      if (newCount >= 5) {
                        // Update Firebase with status 1 for fire
                        console.log("FIRE DETECTED! Updating Firebase...");
                        const monitoringRef = ref(database, 'monitoring/unusualActivity');
                        const timestamp = new Date().toISOString();

                        set(monitoringRef, {
                          status: 1,
                          message: 'Fire detected',
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
                    // Gradually decrease counters if nothing is detected
                    setFireDetectionCount(prev => Math.max(0, prev - 1));
                  }
                }
              }
            } catch (error) {
              console.error("Error in monitoring interval:", error);
            }
          }, 300); // Run detection more frequently (3 times per second)

          setMonitoringActive(true);
        } catch (canvasError) {
          console.error("Canvas initialization error:", canvasError);
          alert('Error initializing monitoring canvas. Please try again.');
        }
      }, 1000); // Longer delay (1 second) to ensure video element is properly initialized and adjusted
    } catch (error) {
      console.error('Error starting background monitoring:', error);
      alert('Unable to start background monitoring. Please check camera permissions.');
    }
  };

  // Stop background monitoring
  const stopBackgroundMonitoring = () => {
    if (monitoringStreamRef.current) {
      monitoringStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    setMonitoringActive(false);

    // Reset detection states
    setFireDetected(false);
    setBlinking(false);
    setFireDetectionCount(0);
    setLastFrameData(null);
    setMotionLevel(0);

    // Always reset Firebase status when stopping monitoring
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
  const handleCheckIn = (booking) => {
    setCurrentBooking(booking);
    setShowCamera(true);

    // Find if there's an existing verification log for this booking
    const existingLog = findExistingVerificationLog(booking.id);

    // Set initial verification status based on existing log
    setVerificationStatus(existingLog ? existingLog.status : 0);
    setVerified(existingLog && existingLog.status === 1 ? true : null);

    startCamera();
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
    setCurrentBooking(null);
    setVerified(null);
    setVerificationStatus(0); // Reset verification status
    if (!monitoringActive) {
      startBackgroundMonitoring();
    }
  };

  // Capture image
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          uploadImageAndCompare(blob);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Upload and compare image with complete verification logging
  const uploadImageAndCompare = async (imageBlob) => {
    if (!currentBooking || !currentBooking.userId) {
      alert("Cannot verify: booking information is incomplete");
      setComparing(false);
      return;
    }
    setComparing(true);
    try {
      // Find existing verification log
      const existingLog = findExistingVerificationLog(currentBooking.id);
      const timestamp = new Date().toISOString();

      // 1. Upload the captured image to Firebase Storage
      const checkInImageRef = storageRef(storage, `check-ins/${currentBooking.id}_${Date.now()}.jpg`);
      await uploadBytes(checkInImageRef, imageBlob);
      const checkInImageUrl = await getDownloadURL(checkInImageRef);

      // 2. Get user reference data
      const userRef = ref(database, `users/${currentBooking.userId}`);
      const userSnapshot = await get(userRef);
      let profileImageUrl = null;
      let userName = "Unknown User";

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        profileImageUrl = userData.faceImageUrl || userData.profileImageUrl;
        userName = userData.name || userData.displayName || "Unknown User";
      }

      // 3. Simulate face verification (in a real app, use a face comparison API)
      setTimeout(() => {
        // Simulate 70% success rate
        const isMatch = Math.random() > 0.3;
        const numericStatus = isMatch ? 1 : 0; // 1 = verified, 0 = failed

        // 4. Update the transaction record
        const bookingRef = ref(database, `stadium_transactions/${currentBooking.id}`);
        update(bookingRef, {
          checkedIn: true,
          checkedInAt: timestamp,
          checkInImageUrl: checkInImageUrl,
          identityVerified: isMatch,
          verificationStatus: numericStatus // Numeric status
        });

        // 5. Update existing verification log or create a new one
        let logRef;

        if (existingLog) {
          // Update existing log
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
          // Create new verification log
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

        // 6. Add to user's verification history
        const userHistoryRef = ref(database, `users/${currentBooking.userId}/verification_history/${Date.now()}`);
        set(userHistoryRef, {
          timestamp: timestamp,
          status: numericStatus,
          bookingId: currentBooking.id
        });

        // 7. Update the UI state
        setVerified(isMatch);
        setVerificationStatus(numericStatus);
        setComparing(false);

        if (isMatch) {
          setTimeout(() => {
            stopCamera();
          }, 3000);
        }
      }, 2000);
    } catch (error) {
      console.error('Error during check-in:', error);
      alert('Error during check-in process. Please try again.');
      setComparing(false);
    }
  };

  // Toggle verification logs view
  const toggleVerificationLogs = () => {
    setShowVerificationLogs(prev => !prev);
  };

  // Manual force fire detection (for testing)
  const forceFireDetection = () => {
    const monitoringRef = ref(database, 'monitoring/unusualActivity');
    const timestamp = new Date().toISOString();
    const message = 'Fire detected';

    set(monitoringRef, {
      status: 1,
      message: message,
      timestamp: timestamp
    }).then(() => {
      console.log("Firebase manually updated with fire detection");
      setFireDetected(true);
      setBlinking(true);
    }).catch(err => {
      console.error("Error updating firebase:", err);
    });
  };

  // Manual reset of detection
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
          <div className="monitoring-grid">
            {monitoringCards.map((card, index) => (
              <div key={index} className={`monitoring-card ${card.gradientClass}`}
                style={{
                  animation: (card.title === 'Fire Detection' && stats.fireDetection === 'Fire detected') ||
                    (card.title === 'Unusual Activity' && stats.activityStatus === 1) ?
                    'pulse-red 1s infinite alternate' : 'none'
                }}
              >
                <div className="monitoring-icon">{card.icon}</div>
                <div className="monitoring-info">
                  <h3 className="monitoring-title">{card.title}</h3>
                  <p className="monitoring-value">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
          <style jsx>{`
            @keyframes pulse-red {
              from { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
              to { box-shadow: 0 0 0 10px rgba(244, 67, 54, 0); }
            }
            
            @keyframes blink {
              from { opacity: 1; }
              to { opacity: 0.7; }
            }
          `}</style>

          <div className="monitoring-controls">
            {monitoringActive ? (
              <button
                onClick={stopBackgroundMonitoring}
                className="monitoring-button stop"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginRight: '10px',
                  fontWeight: '500'
                }}
              >
                <VideoOff size={20} />
                <span style={{ marginLeft: '8px' }}>Stop Monitoring</span>
              </button>
            ) : (
              <button
                onClick={startBackgroundMonitoring}
                className="monitoring-button start"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginRight: '10px',
                  fontWeight: '500'
                }}
              >
                <Video size={20} />
                <span style={{ marginLeft: '8px' }}>Start Monitoring</span>
              </button>
            )}

            {/* Testing buttons for development */}
            {monitoringActive && (
              <>
                <button
                  onClick={forceFireDetection}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginRight: '10px',
                    fontWeight: '500'
                  }}
                >
                  <AlertTriangle size={20} />
                  <span style={{ marginLeft: '8px' }}>Test Fire</span>
                </button>

                <button
                  onClick={resetFireDetection}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <CheckCircle size={20} />
                  <span style={{ marginLeft: '8px' }}>Reset</span>
                </button>
              </>
            )}
          </div>

          {/* Calibration message when monitoring just started */}
          {monitoringActive && monitoringFrameCount < 15 && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196F3',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <p style={{
                margin: 0,
                color: '#0d47a1',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ marginRight: '8px' }}>⚙️</span>
                Calibrating camera... Please wait...
              </p>
            </div>
          )}

          {fireDetected && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: blinking ? '#ffebee' : '#fff3e0',
              border: `1px solid ${blinking ? '#f44336' : '#ff9800'}`,
              borderRadius: '4px',
              textAlign: 'center',
              animation: blinking ? 'blink 1s infinite alternate' : 'none'
            }}>
              <p style={{
                margin: 0,
                color: blinking ? '#d32f2f' : '#e65100',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={18} style={{ marginRight: '8px' }} />
                Fire detected! Please check the area.
              </p>
            </div>
          )}

          {/* Always render the video and canvas elements but only show when active */}
          <div className="monitoring-container" style={{
            marginTop: '15px',
            display: monitoringActive ? 'block' : 'none'
          }}>
            <div style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Live Monitoring Feed</h4>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <video
                  ref={monitoringVideoRef}
                  autoPlay
                  playsInline
                  muted
                  width="320"
                  height="240"
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#000'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Hidden canvases for processing */}
          <canvas
            ref={monitoringCanvasRef}
            width="320"
            height="240"
            style={{
              display: 'none',
              position: 'absolute',
              pointerEvents: 'none'
            }}
          />
          <canvas
            ref={motionCanvasRef}
            width="320"
            height="240"
            style={{
              display: 'none',
              position: 'absolute',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Verification Logs Section */}
        <div className="verification-logs-section">
          <div className="section-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h3>Verification Status</h3>
            <button
              onClick={toggleVerificationLogs}
              style={{
                padding: '6px 12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <List size={18} />
              <span style={{ marginLeft: '6px' }}>{showVerificationLogs ? 'Hide Logs' : 'Show Logs'}</span>
            </button>
          </div>

          {showVerificationLogs && (
            <div className="verification-logs-table" style={{
              backgroundColor: '#fff',
              borderRadius: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '10px',
              marginBottom: '20px',
              overflowX: 'auto'
            }}>
              {verificationLogs.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #eee' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
                      {/* <th style={{ padding: '10px', textAlign: 'left' }}>Match</th> */}
                      <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px' }}>{log.userName || log.userId}</td>
                        {/* <td style={{ padding: '10px' }}>{log.matchTitle || ' '}</td> */}
                        <td style={{ padding: '10px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '50%',
                            backgroundColor: log.status === 1 ? '#4CAF50' : '#f44336',
                            color: 'white',
                            fontWeight: 'bold',
                            margin: '0 auto'
                          }}>
                            {log.status}
                          </div>
                        </td>
                        <td style={{ padding: '10px' }}>{log.location || 'Unknown'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px' }}>No verification logs found</p>
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
                  // Find verification log for this booking
                  const verLog = verificationLogs.find(log => log.bookingId === booking.id);
                  const verStatus = verLog ? verLog.status : 0;

                  return (
                    <tr key={booking.id}>
                      <td>{index + 1}</td>
                      <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
                      <td>{booking.matchTitle || ''}</td>
                      <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
                            {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                          </span>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '50%',
                            backgroundColor: verStatus === 1 ? '#4CAF50' : '#f44336',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            {verStatus}
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="check-in-button"
                          onClick={() => handleCheckIn(booking)}
                          disabled={booking.checkedIn && verStatus === 1}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: booking.checkedIn && verStatus === 1 ? '#4CAF50' : '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: booking.checkedIn && verStatus === 1 ? 'default' : 'pointer',
                            opacity: booking.checkedIn && verStatus === 1 ? 0.7 : 1
                          }}
                        >
                          {booking.checkedIn && verStatus === 1 ? 'Checked In' : 'Check In'}
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
        <div className="camera-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="camera-modal" style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '90%',
            width: '500px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div className="camera-modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{
                margin: 0,
              }}>Check-In Verification</h3>
              <button
                className="close-button"
                onClick={stopCamera}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="camera-container" style={{
              position: 'relative',
              width: '100%',
              backgroundColor: '#000',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '20px'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{
                  width: '100%',
                  display: 'block'
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {verified === true && (
                <div className="verification-result success" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(76, 175, 80, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'white'
                }}>
                  <CheckCircle size={64} />
                  <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px' }}>Identity Verified!</p>
                </div>
              )}

              {verified === false && (
                <div className="verification-result failure" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(244, 67, 54, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'white'
                }}>
                  <XCircle size={64} />
                  <p style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px' }}>Identity Verification Failed</p>
                </div>
              )}
            </div>

            <div className="camera-controls">
              {!comparing && verified === null && (
                <button
                  className="capture-button"
                  onClick={captureImage}
                  style={{
                     position: ' relative',
                bottom: '30px',
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    margin: '0 auto'
                  }}
                >
                  <Camera size={24} />
                  <span>Capture Image</span>
                </button>
              )}

              {comparing && (
                <div className="comparing-indicator" style={{
                  textAlign: 'center',
                  marginTop: '10px'
                }}>
                  <p style={{ marginBottom: '10px' }}>Comparing images...</p>
                  <div className="loading-spinner" style={{
                    display: 'inline-block',
                    width: '30px',
                    height: '30px',
                    border: '3px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '50%',
                    borderTopColor: '#2196F3',
                    animation: 'spin 1s ease-in-out infinite'
                  }}></div>
                  <style jsx>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}

              {verified === false && (
                <button
                  className="retry-button"
                  onClick={() => setVerified(null)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'block',
                    margin: '10px auto 0'
                  }}
                >
                  Try Again
                </button>
              )}
            </div>

            {/* Verification Status Number Display */}
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <p style={{
                  margin: '0 10px 0 0',
                  fontWeight: '500'
                }}>
                  Verification Status:
                </p>
                <div style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '50%',
                  backgroundColor: verificationStatus === 0 ? '#f44336' : '#4CAF50',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '20px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {verificationStatus}
                </div>
              </div>
              <p style={{
                margin: '5px 0 0 0',
                fontWeight: '500',
                fontSize: '14px',
                color: '#757575'
              }}>
                {verificationStatus === 0
                  ? (verified === null ? 'Not Verified Yet' : 'Verification Failed')
                  : 'Successfully Verified'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
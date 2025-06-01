import React, { useState, useEffect } from 'react';
import { ref, onValue, remove, get, update, set } from 'firebase/database';
import { database } from '../firebase';
import '../styles/AdminBookings.css';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Fetch all bookings from Firebase
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    const bookingsRef = ref(database, 'stadium_transactions');
    
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        const bookingsArray = Object.entries(bookingsData).map(([id, data]) => ({
          id,
          ...data,
          transferStatus: data.transferStatus || 'not_transferred' // Default if not set
        }));
        
        // Sort bookings by date (most recent first)
        bookingsArray.sort((a, b) => {
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        });
        
        setBookings(bookingsArray);
      } else {
        setBookings([]);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  };

  // Show confirmation message
  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    
    // Clear message after 5 seconds
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  // Handle reset history button click
  const handleResetHistory = () => {
    // Ask for confirmation before proceeding
    if (!window.confirm('Are you sure you want to reset all booking history? This will delete all booking records and make all seats available again. This action cannot be undone.')) {
      return;
    }
    
    setIsResetting(true);
    resetAllBookings();
  };

  // Reset all bookings in the database
  const resetAllBookings = async () => {
    try {
      // 1. Get all match data to update seat availability
      const matchesRef = ref(database, 'stadium_matches');
      const matchesSnapshot = await get(matchesRef);
      
      if (!matchesSnapshot.exists()) {
        throw new Error('No matches found in the database');
      }

      // 2. Prepare batch updates for all seats
      const updates = {};
      
      // Process all matches and set all seats to available
      const matchesData = matchesSnapshot.val();
      Object.entries(matchesData).forEach(([matchId, matchData]) => {
        if (matchData.seats) {
          Object.keys(matchData.seats).forEach(seatId => {
            updates[`stadium_matches/${matchId}/seats/${seatId}/available`] = true;
          });
        }
      });
      
      // 3. Get all user booking references to delete
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      if (usersSnapshot.exists()) {
        const usersData = usersSnapshot.val();
        Object.entries(usersData).forEach(([userId, userData]) => {
          if (userData.stadium_bookings) {
            Object.keys(userData.stadium_bookings).forEach(bookingId => {
              updates[`users/${userId}/stadium_bookings/${bookingId}`] = null;
            });
          }
        });
      }
      
      // 4. Delete all transactions
      updates['stadium_transactions'] = null;
      
      // 5. Apply all updates in a single batch operation
      await update(ref(database), updates);
      
      // 6. Show success message
      showMessage('All booking history has been reset successfully!');
      
      // Refresh bookings list (should now be empty)
      fetchBookings();
    } catch (error) {
      console.error('Error resetting bookings:', error);
      showMessage(`Failed to reset booking history: ${error.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Get status display info based on booking status
  const getStatusDisplay = (booking) => {
    // First check transfer status
    if (booking.transferStatus === 'transferred') {
      return {
        label: 'Transferred',
        className: 'status-transferred'
      };
    }
    
    // Then check payment status
    if (booking.paymentStatus === 'completed') {
      return {
        label: 'Paid',
        className: 'status-completed'
      };
    }
    
    // Default to pending
    return {
      label: 'Pending',
      className: 'status-pending'
    };
  };

  // Filter bookings based on search term and filter status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      (booking.matchTitle && booking.matchTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.userId && booking.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.confirmationNumber && booking.confirmationNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesFilter = false;
    
    switch (filterStatus) {
      case 'all':
        matchesFilter = true;
        break;
      case 'completed':
        matchesFilter = booking.paymentStatus === 'completed' && booking.transferStatus !== 'transferred';
        break;
      case 'pending':
        matchesFilter = booking.paymentStatus !== 'completed' && booking.transferStatus !== 'transferred';
        break;
      case 'transferred':
        matchesFilter = booking.transferStatus === 'transferred';
        break;
      default:
        matchesFilter = true;
    }
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="admin-bookings">
      <h2 className="bookings-title">Booking History</h2>
      
      {message && (
        <div className={`admin-message ${messageType}`}>
          {message}
        </div>
      )}
      
      <div className="bookings-actions">
        <div className="bookings-filters">
          <div className="search-filter">
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="status-filter">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Paid</option>
              <option value="pending">Pending</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
        </div>
        
        <div className="reset-container">
          <button 
            className="reset-history-button"
            onClick={handleResetHistory}
            disabled={isResetting || loading || bookings.length === 0}
          >
            {isResetting ? 'Resetting...' : 'Reset All Booking History'}
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="bookings-loading">Loading bookings...</div>
      ) : filteredBookings.length > 0 ? (
        <div className="bookings-table-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Booking ID</th>
                <th>User ID</th>
                <th>Match Title</th>
                <th>Date</th>
                <th>Seats</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking, index) => {
                const statusDisplay = getStatusDisplay(booking);
                
                return (
                  <tr key={booking.id}>
                    <td>{index + 1}</td>
                    <td>{booking.confirmationNumber || booking.id.slice(0, 8)}</td>
                    <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
                    <td>{booking.matchTitle || ''}</td>
                    <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
                    <td>{booking.seats ? booking.seats.join(', ') : ''}</td>
                    <td>
                      <span className={`status-badge ${statusDisplay.className}`}>
                        {statusDisplay.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-bookings">
          <p>No bookings found</p>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;



// import React, { useState, useEffect } from 'react';
// import { ref, onValue, remove, get, update, set } from 'firebase/database';
// import { database } from '../firebase';
// import '../styles/AdminBookings.css';

// const AdminBookings = () => {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('all');
//   const [isResetting, setIsResetting] = useState(false);
//   const [message, setMessage] = useState('');
//   const [messageType, setMessageType] = useState('');

//   // Fetch all bookings from Firebase
//   useEffect(() => {
//     fetchBookings();
//   }, []);

//   const fetchBookings = () => {
//     setLoading(true);
//     const bookingsRef = ref(database, 'stadium_transactions');
    
//     const unsubscribe = onValue(bookingsRef, (snapshot) => {
//       if (snapshot.exists()) {
//         const bookingsData = snapshot.val();
//         const bookingsArray = Object.entries(bookingsData).map(([id, data]) => ({
//           id,
//           ...data
//         }));
        
//         // Sort bookings by date (most recent first)
//         bookingsArray.sort((a, b) => {
//           return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
//         });
        
//         setBookings(bookingsArray);
//       } else {
//         setBookings([]);
//       }
//       setLoading(false);
//     });
    
//     return () => unsubscribe();
//   };

//   // Show confirmation message
//   const showMessage = (text, type = 'success') => {
//     setMessage(text);
//     setMessageType(type);
    
//     // Clear message after 5 seconds
//     setTimeout(() => {
//       setMessage('');
//       setMessageType('');
//     }, 5000);
//   };

//   // Handle reset history button click
//   const handleResetHistory = () => {
//     // Ask for confirmation before proceeding
//     if (!window.confirm('Are you sure you want to reset all booking history? This will delete all booking records and make all seats available again. This action cannot be undone.')) {
//       return;
//     }
    
//     setIsResetting(true);
//     resetAllBookings();
//   };

//   // Reset all bookings in the database
//   const resetAllBookings = async () => {
//     try {
//       // 1. Get all match data to update seat availability
//       const matchesRef = ref(database, 'stadium_matches');
//       const matchesSnapshot = await get(matchesRef);
      
//       if (!matchesSnapshot.exists()) {
//         throw new Error('No matches found in the database');
//       }

//       // 2. Prepare batch updates for all seats
//       const updates = {};
      
//       // Process all matches and set all seats to available
//       const matchesData = matchesSnapshot.val();
//       Object.entries(matchesData).forEach(([matchId, matchData]) => {
//         if (matchData.seats) {
//           Object.keys(matchData.seats).forEach(seatId => {
//             updates[`stadium_matches/${matchId}/seats/${seatId}/available`] = true;
//           });
//         }
//       });
      
//       // 3. Get all user booking references to delete
//       const usersRef = ref(database, 'users');
//       const usersSnapshot = await get(usersRef);
      
//       if (usersSnapshot.exists()) {
//         const usersData = usersSnapshot.val();
//         Object.entries(usersData).forEach(([userId, userData]) => {
//           if (userData.stadium_bookings) {
//             Object.keys(userData.stadium_bookings).forEach(bookingId => {
//               updates[`users/${userId}/stadium_bookings/${bookingId}`] = null;
//             });
//           }
//         });
//       }
      
//       // 4. Delete all transactions
//       updates['stadium_transactions'] = null;
      
//       // 5. Apply all updates in a single batch operation
//       await update(ref(database), updates);
      
//       // 6. Show success message
//       showMessage('All booking history has been reset successfully!');
      
//       // Refresh bookings list (should now be empty)
//       fetchBookings();
//     } catch (error) {
//       console.error('Error resetting bookings:', error);
//       showMessage(`Failed to reset booking history: ${error.message}`, 'error');
//     } finally {
//       setIsResetting(false);
//     }
//   };

//   // Filter bookings based on search term and filter status
//   const filteredBookings = bookings.filter(booking => {
//     const matchesSearch = searchTerm === '' || 
//       (booking.matchTitle && booking.matchTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (booking.userId && booking.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (booking.confirmationNumber && booking.confirmationNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
//     const matchesFilter = filterStatus === 'all' || 
//       (filterStatus === 'completed' && booking.paymentStatus === 'completed') ||
//       (filterStatus === 'pending' && booking.paymentStatus !== 'completed');
    
//     return matchesSearch && matchesFilter;
//   });

//   return (
//     <div className="admin-bookings">
//       <h2 className="bookings-title">Booking History</h2>
      
//       {message && (
//         <div className={`admin-message ${messageType}`}>
//           {message}
//         </div>
//       )}
      
//       <div className="bookings-actions">
//         <div className="bookings-filters">
//           <div className="search-filter">
//             <input
//               type="text"
//               placeholder="Search bookings..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
          
//           <div className="status-filter">
//             <select 
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//             >
//               <option value="all">All Status</option>
//               <option value="completed">Paid</option>
//               <option value="pending">Pending</option>
//             </select>
//           </div>
//         </div>
        
//         <div className="reset-container">
//           <button 
//             className="reset-history-button"
//             onClick={handleResetHistory}
//             disabled={isResetting || loading || bookings.length === 0}
//           >
//             {isResetting ? 'Resetting...' : 'Reset All Booking History'}
//           </button>
//         </div>
//       </div>
      
//       {loading ? (
//         <div className="bookings-loading">Loading bookings...</div>
//       ) : filteredBookings.length > 0 ? (
//         <div className="bookings-table-container">
//           <table className="bookings-table">
//             <thead>
//               <tr>
//                 <th>No</th>
//                 <th>Booking ID</th>
//                 <th>User ID</th>
//                 <th>Match Title</th>
//                 <th>Date</th>
//                 <th>Seats</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredBookings.map((booking, index) => (
//                 <tr key={booking.id}>
//                   <td>{index + 1}</td>
//                   <td>{booking.confirmationNumber || booking.id.slice(0, 8)}</td>
//                   <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
//                   <td>{booking.matchTitle || ''}</td>
//                   <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
//                   <td>{booking.seats ? booking.seats.join(', ') : ''}</td>
//                   <td>
//                     <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
//                       {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       ) : (
//         <div className="no-bookings">
//           <p>No bookings found</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminBookings;
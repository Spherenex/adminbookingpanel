// import React, { useState, useEffect } from 'react';
// import { ref, onValue } from 'firebase/database';
// import { database } from '../firebase';
// import '../styles/AdminBookings.css';

// const AdminBookings = () => {
//   const [bookings, setBookings] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterStatus, setFilterStatus] = useState('all');

//   // Fetch all bookings from Firebase
//   useEffect(() => {
//     setLoading(true);
//     const bookingsRef = ref(database, 'bookings');
    
//     const unsubscribe = onValue(bookingsRef, (snapshot) => {
//       if (snapshot.exists()) {
//         const bookingsData = snapshot.val();
//         const bookingsArray = Object.entries(bookingsData).map(([id, data]) => ({
//           id,
//           ...data
//         }));
        
//         // Sort bookings by date (most recent first)
//         bookingsArray.sort((a, b) => {
//           return new Date(b.timestamp) - new Date(a.timestamp);
//         });
        
//         setBookings(bookingsArray);
//       } else {
//         setBookings([]);
//       }
//       setLoading(false);
//     });
    
//     return () => unsubscribe();
//   }, []);

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
      
//       <div className="bookings-filters">
//         <div className="search-filter">
//           <input
//             type="text"
//             placeholder="Search bookings..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
        
//         <div className="status-filter">
//           <select 
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//           >
//             <option value="all">All Statuses</option>
//             <option value="completed">Paid</option>
//             <option value="pending">Pending</option>
//           </select>
//         </div>
//       </div>
      
//       {loading ? (
//         <div className="bookings-loading">Loading bookings...</div>
//       ) : filteredBookings.length > 0 ? (
//         <div className="bookings-table-container">
//           <table className="bookings-table">
//             <thead>
//               <tr>
//                 <th>Booking ID</th>
//                 <th>User ID</th>
//                 <th>Match Title</th>
//                 <th>Date</th>
//                 <th>Seats</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredBookings.map(booking => (
//                 <tr key={booking.id}>
//                   <td>{booking.confirmationNumber || booking.id.slice(0, 8)}</td>
//                   <td>{booking.userId?.slice(0, 8) || 'N/A'}</td>
//                   <td>{booking.matchTitle || 'N/A'}</td>
//                   <td>{new Date(booking.timestamp).toLocaleDateString()}</td>
//                   <td>{booking.seats?.join(', ') || 'N/A'}</td>
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



import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import '../styles/AdminBookings.css';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch all bookings from Firebase
  useEffect(() => {
    setLoading(true);
    const bookingsRef = ref(database, 'stadium_transactions');
    
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookingsData = snapshot.val();
        const bookingsArray = Object.entries(bookingsData).map(([id, data]) => ({
          id,
          ...data
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
  }, []);

  // Filter bookings based on search term and filter status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      (booking.matchTitle && booking.matchTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.userId && booking.userId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (booking.confirmationNumber && booking.confirmationNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'completed' && booking.paymentStatus === 'completed') ||
      (filterStatus === 'pending' && booking.paymentStatus !== 'completed');
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="admin-bookings">
      <h2 className="bookings-title">Booking History</h2>
      
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
            <option value="all">All Statuses</option>
            <option value="completed">Paid</option>
            <option value="pending">Pending</option>
          </select>
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
              {filteredBookings.map((booking, index) => (
                <tr key={booking.id}>
                  <td>{index + 1}</td>
                  <td>{booking.confirmationNumber || booking.id.slice(0, 8)}</td>
                  <td>{booking.userId ? booking.userId.slice(0, 8) : ''}</td>
                  <td>{booking.matchTitle || ''}</td>
                  <td>{booking.timestamp ? new Date(booking.timestamp).toLocaleDateString() : ''}</td>
                  <td>{booking.seats ? booking.seats.join(', ') : ''}</td>
                  <td>
                    <span className={`status-badge ${booking.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}`}>
                      {booking.paymentStatus === 'completed' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
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
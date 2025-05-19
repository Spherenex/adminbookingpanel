


// import React, { useState, useEffect } from 'react';
// import { ref, onValue } from 'firebase/database';
// import { database } from '../firebase';
// import '../styles/AdminUsers.css';

// const AdminUsers = () => {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');

//   // Fetch all users from Firebase
//   useEffect(() => {
//     setLoading(true);
//     const usersRef = ref(database, 'users');
    
//     const unsubscribe = onValue(usersRef, (snapshot) => {
//       if (snapshot.exists()) {
//         const usersData = snapshot.val();
//         const usersArray = Object.entries(usersData).map(([id, data]) => ({
//           id,
//           ...data
//         }));
        
//         // Sort users by creation date (most recent first)
//         usersArray.sort((a, b) => {
//           return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
//         });
        
//         setUsers(usersArray);
//       } else {
//         setUsers([]);
//       }
//       setLoading(false);
//     });
    
//     return () => unsubscribe();
//   }, []);

//   // Filter users based on search term
//   const filteredUsers = users.filter(user => {
//     return searchTerm === '' || 
//       (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (user.id && user.id.toLowerCase().includes(searchTerm.toLowerCase()));
//   });

//   return (
//     <div className="admin-users">
//       <h2 className="users-title">User Data</h2>
      
//       <div className="users-filters">
//         <div className="search-filter">
//           <input
//             type="text"
//             placeholder="Search users..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>
//       </div>
      
//       {loading ? (
//         <div className="users-loading">Loading users...</div>
//       ) : filteredUsers.length > 0 ? (
//         <div className="users-table-container">
//           <table className="users-table">
//             <thead>
//               <tr>
//                 <th>No</th>
//                 <th>User ID</th>
//                 <th>Name</th>
//                 <th>Email</th>
//                 <th>Role</th>
//                 <th>Created Date</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredUsers.map((user, index) => (
//                 <tr key={user.id}>
//                   <td>{index + 1}</td>
//                   <td>{user.id.slice(0, 8)}</td>
//                   <td>{user.name || ''}</td>
//                   <td>{user.email || ''}</td>
//                   <td>{user.role || 'user'}</td>
//                   <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</td>
//                   <td>
//                     <span className={`role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
//                       {user.role === 'admin' ? 'Admin' : 'User'}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       ) : (
//         <div className="no-users">
//           <p>No users found</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminUsers;




import React, { useState, useEffect } from 'react';
import { ref, onValue, get, query, orderByChild } from 'firebase/database';
import { database } from '../firebase';
import { User, Search, Clock, Shield, Mail, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import '../styles/AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationCounts, setVerificationCounts] = useState({});
  const [bookingCounts, setBookingCounts] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // Function to refresh all data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    setLastUpdated(new Date().toLocaleTimeString());
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchVerificationData(),
        fetchBookingCounts(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch verification data
  const fetchVerificationData = async () => {
    try {
      const verificationRef = ref(database, 'verification_logs');
      const snapshot = await get(verificationRef);
      
      const counts = {};
      
      if (snapshot.exists()) {
        const verificationData = snapshot.val();
        
        // Count verified vs unverified users
        Object.values(verificationData).forEach(log => {
          const userId = log.userId;
          if (!userId) return;
          
          if (!counts[userId]) {
            counts[userId] = { verified: 0, unverified: 0 };
          }
          
          if (log.status === 1) {
            counts[userId].verified++;
          } else {
            counts[userId].unverified++;
          }
        });
      }
      
      setVerificationCounts(counts);
    } catch (error) {
      console.error("Error fetching verification data:", error);
    }
  };

  // Fetch booking counts
  const fetchBookingCounts = async () => {
    try {
      const transactionsRef = ref(database, 'stadium_transactions');
      const snapshot = await get(transactionsRef);
      
      const counts = {};
      
      if (snapshot.exists()) {
        const transactionsData = snapshot.val();
        
        // Count bookings per user
        Object.values(transactionsData).forEach(transaction => {
          const userId = transaction.userId;
          if (!userId) return;
          
          if (!counts[userId]) {
            counts[userId] = 0;
          }
          
          counts[userId]++;
        });
      }
      
      setBookingCounts(counts);
    } catch (error) {
      console.error("Error fetching booking counts:", error);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    return new Promise((resolve, reject) => {
      const usersRef = ref(database, 'users');
      
      const unsubscribe = onValue(usersRef, (snapshot) => {
        try {
          if (snapshot.exists()) {
            const usersData = snapshot.val();
            
            // Convert object to array
            const usersArray = Object.entries(usersData).map(([id, data]) => {
              // Ensure all necessary fields are present
              return {
                id,
                name: data.name || data.displayName || (data.email ? data.email.split('@')[0] : 'Unknown User'),
                email: data.email || 'No Email',
                role: data.role || data.isAdmin ? 'admin' : 'user',
                createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
                lastLogin: data.lastLogin || data.lastLoginAt || 'Never',
                profileImageUrl: data.profileImageUrl || data.photoURL || '',
                // Include any other useful fields
                ...data
              };
            });
            
            // Sort users by creation date (most recent first)
            usersArray.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return isNaN(dateA) || isNaN(dateB) ? 0 : dateB - dateA;
            });
            
            setUsers(usersArray);
            resolve();
          } else {
            setUsers([]);
            resolve();
          }
        } catch (error) {
          console.error("Error processing users data:", error);
          reject(error);
        }
      }, (error) => {
        console.error("Error fetching users:", error);
        reject(error);
      });
      
      // Cleanup function
      return () => unsubscribe();
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return searchTerm === '' || 
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.id && user.id.toLowerCase().includes(searchLower)) ||
      (user.phone && user.phone.includes(searchLower));
  });

  // Get verification status for display
  const getUserVerificationStatus = (userId) => {
    const counts = verificationCounts[userId];
    if (!counts) return { status: 'Never Verified', color: '#f44336' };
    
    if (counts.verified > 0) {
      return { status: `Verified (${counts.verified})`, color: '#4CAF50' };
    } else {
      return { status: 'Not Verified', color: '#f44336' };
    }
  };

  return (
    <div className="admin-users">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="users-title">User Management</h2>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666', marginRight: '10px' }}>
            Last updated: {lastUpdated}
          </span>
          <button 
            onClick={refreshData}
            disabled={refreshing}
            style={{
              padding: '8px 12px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.7 : 1
            }}
          >
            <RefreshCw size={16} style={{ 
              marginRight: '6px',
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      <div className="users-summary" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div className="summary-card" style={{
          backgroundColor: '#bbdefb',
          padding: '15px',
          borderRadius: '8px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <User size={20} style={{ marginRight: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Total Users</h3>
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>{users.length}</p>
        </div>
        
        <div className="summary-card" style={{
          backgroundColor: '#c8e6c9',
          padding: '15px',
          borderRadius: '8px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Shield size={20} style={{ marginRight: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Verified Users</h3>
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {Object.values(verificationCounts).filter(counts => counts.verified > 0).length}
          </p>
        </div>
        
        <div className="summary-card" style={{
          backgroundColor: '#ffecb3',
          padding: '15px',
          borderRadius: '8px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <Clock size={20} style={{ marginRight: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Users (24h)</h3>
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {users.filter(user => {
              const createdDate = new Date(user.createdAt || 0);
              const now = new Date();
              const diffHours = (now - createdDate) / (1000 * 60 * 60);
              return !isNaN(diffHours) && diffHours < 24;
            }).length}
          </p>
        </div>
        
        <div className="summary-card" style={{
          backgroundColor: '#e1bee7',
          padding: '15px',
          borderRadius: '8px',
          flex: '1',
          minWidth: '200px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <FileText size={20} style={{ marginRight: '8px' }} />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Total Bookings</h3>
          </div>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
            {Object.values(bookingCounts).reduce((sum, count) => sum + count, 0)}
          </p>
        </div>
      </div>
      
      <div className="users-filters" style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="search-filter" style={{
          position: 'relative',
          flex: '1',
          maxWidth: '400px'
        }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666'
          }} />
          <input
            type="text"
            placeholder="Search users by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 10px 10px 35px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{
          marginLeft: '10px',
          fontSize: '14px',
          color: '#666'
        }}>
          {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
        </div>
      </div>
      
      {loading && !refreshing ? (
        <div className="users-loading" style={{
          textAlign: 'center',
          padding: '30px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <div className="loading-spinner" style={{
            display: 'inline-block',
            width: '30px',
            height: '30px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '10px'
          }}></div>
          <p style={{ margin: '0', color: '#666' }}>Loading users data...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="users-table-container" style={{
          overflowX: 'auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <table className="users-table" style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f5f5f5',
                borderBottom: '2px solid #ddd'
              }}>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>No</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>User ID</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Created Date</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Bookings</th>
                <th style={{ padding: '12px 15px', textAlign: 'left' }}>Verification</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => {
                const verificationStatus = getUserVerificationStatus(user.id);
                const bookingCount = bookingCounts[user.id] || 0;
                
                return (
                  <tr key={user.id} style={{
                    borderBottom: '1px solid #eee'
                  }}>
                    <td style={{ padding: '12px 15px' }}>{index + 1}</td>
                    <td style={{ padding: '12px 15px' }}>{user.id.slice(0, 8)}...</td>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt={user.name} 
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              marginRight: '10px',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            backgroundColor: '#e0e0e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '10px'
                          }}>
                            <User size={16} />
                          </div>
                        )}
                        {user.name || 'Unknown User'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 15px' }}>{user.email || 'No Email'}</td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: user.role === 'admin' ? '#bbdefb' : '#f5f5f5',
                        color: user.role === 'admin' ? '#1565c0' : '#757575'
                      }}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      {user.createdAt ? (
                        <span title={new Date(user.createdAt).toLocaleString()}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      ) : 'Unknown'}
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: bookingCount > 0 ? '#e8f5e9' : '#f5f5f5',
                        color: bookingCount > 0 ? '#2e7d32' : '#757575'
                      }}>
                        {bookingCount} bookings
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: verificationStatus.color === '#4CAF50' ? '#e8f5e9' : '#ffebee',
                        color: verificationStatus.color
                      }}>
                        {verificationStatus.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-users" style={{
          textAlign: 'center',
          padding: '30px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <AlertCircle size={40} style={{ color: '#666', marginBottom: '10px' }} />
          <p style={{ margin: '0', color: '#666' }}>No users found matching your search criteria</p>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
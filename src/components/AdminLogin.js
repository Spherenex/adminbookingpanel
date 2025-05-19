// import React, { useState } from 'react';
// import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
// import { ref, set, get } from 'firebase/database';
// import { auth, database } from '../firebase';
// import '../styles/AdminLogin.css';

// const AdminLogin = ({ onLoginSuccess }) => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async (e) => {
//     e.preventDefault();
    
//     // Check if using default admin credentials
//     const isDefaultAdmin = email === 'admin@gmail.com' && password === 'admin123';
    
//     if (!email || !password) {
//       setError('Please enter both email and password');
//       return;
//     }
    
//     setLoading(true);
//     setError('');
    
//     try {
//       let userCredential;
      
//       if (isDefaultAdmin) {
//         // Try to sign in with default credentials
//         try {
//           userCredential = await signInWithEmailAndPassword(auth, email, password);
//         } catch (signInError) {
//           // If the admin account doesn't exist yet, create it
//           if (signInError.code === 'auth/user-not-found') {
//             userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
//             // Set admin role in the database
//             await set(ref(database, `users/${userCredential.user.uid}`), {
//               email: email,
//               role: 'admin',
//               name: 'Admin',
//               createdAt: new Date().toISOString()
//             });
//           } else {
//             throw signInError;
//           }
//         }
//       } else {
//         // For non-default credentials, just try to sign in
//         userCredential = await signInWithEmailAndPassword(auth, email, password);
        
//         // Check if the user has admin role
//         const userRef = ref(database, `users/${userCredential.user.uid}`);
//         const snapshot = await get(userRef);
        
//         if (!snapshot.exists() || snapshot.val().role !== 'admin') {
//           throw new Error('Not authorized as admin');
//         }
//       }
      
//       // Success - call the callback with the admin user
//       onLoginSuccess({
//         ...userCredential.user,
//         isAdmin: true
//       });
      
//     } catch (error) {
//       console.error('Login error:', error);
//       if (error.message === 'Not authorized as admin') {
//         setError('You do not have admin privileges');
//       } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
//         setError('Invalid email or password');
//       } else if (error.code === 'auth/too-many-requests') {
//         setError('Too many failed login attempts. Please try again later');
//       } else {
//         setError('Failed to login: ' + (error.message || 'Unknown error'));
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="admin-login-container">
//       <div className="admin-login-card">
//         <div className="admin-login-header">
//           <h2>Admin Login</h2>
//           <p>Login to access the admin dashboard</p>
//         </div>
        
//         {error && <div className="admin-login-error">{error}</div>}
        
//         <form className="admin-login-form" onSubmit={handleLogin}>
//           <div className="form-group">
//             <label htmlFor="email">Email</label>
//             <input
//               type="email"
//               id="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="Enter admin email"
//               disabled={loading}
//             />
//           </div>
          
//           <div className="form-group">
//             <label htmlFor="password">Password</label>
//             <input
//               type="password"
//               id="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="Enter password"
//               disabled={loading}
//             />
//           </div>
          
//           <button 
//             type="submit" 
//             className="admin-login-button"
//             disabled={loading}
//           >
//             {loading ? 'Logging in...' : 'Login'}
//           </button>
//         </form>
        
//         <div className="admin-login-help">
//           <p>Default admin credentials: admin@gmail.com / admin123</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdminLogin;



import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, database } from '../firebase';
import '../styles/AdminLogin.css';

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Check if using default admin credentials
    const isDefaultAdmin = email === 'admin@gmail.com' && password === 'admin123';
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      let userCredential;
      
      if (isDefaultAdmin) {
        // Try to sign in with default credentials
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInError) {
          // If the admin account doesn't exist yet, create it
          if (signInError.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Set admin role in the database
            await set(ref(database, `users/${userCredential.user.uid}`), {
              email: email,
              role: 'admin',
              name: 'Admin',
              createdAt: new Date().toISOString()
            });
          } else {
            throw signInError;
          }
        }
      } else {
        // For non-default credentials, just try to sign in
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if the user has admin role
        const userRef = ref(database, `users/${userCredential.user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists() || snapshot.val().role !== 'admin') {
          throw new Error('Not authorized as admin');
        }
      }
      
      // Success - call the callback with the admin user
      onLoginSuccess({
        ...userCredential.user,
        isAdmin: true
      });
      
    } catch (error) {
      console.error('Login error:', error);
      if (error.message === 'Not authorized as admin') {
        setError('You do not have admin privileges');
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later');
      } else {
        setError('Failed to login: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h2>Admin Login</h2>
          <p>Login to access the admin dashboard</p>
        </div>
        
        {error && <div className="admin-login-error">{error}</div>}
        
        <form className="admin-login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="admin-login-help">
          <p>Default admin credentials: admin@gmail.com / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
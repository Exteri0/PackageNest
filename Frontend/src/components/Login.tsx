import axios from 'axios';
import { useEffect, useState } from 'react';
import { storeToken, validateStoredToken } from '../utils';
import config from '../config';

export default function Login() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState([0, '']);

  useEffect(() => {
    (async () => {
      const user = await validateStoredToken();
      if (user) {
        console.log('User is logged in');
        console.log(user);
      } else {
        console.log('User is not logged in');
      }
    })();
  }, []);

  const handleSubmit = async () => {
    console.log(`user is ${user},\npassword is ${password}`);
    if (user === '' || password === '') {
      setErr([1, 'Please fill out all fields']);
      return;
    }
    if (typeof user !== 'string' || typeof password !== 'string') {
      setErr([1, 'Name and password must be strings']);
      return;
    }
    if (/^\d+$/.test(user) || /^\d+$/.test(password)) {
      setErr([1, 'Name and password cannot be just numbers']);
      return;
    }
    setErr([0, 'Submitting']);
    const body = {
      User: {
        name: user,
        isAdmin: false,
      },
      Secret: {
        password: password,
      },
    };
    axios
      .put(`${config.apiBaseUrl}/authenticate`, body)
      .then((response) => {
        console.log(response.data);
        setErr([2, 'Logged in successfully']);
        storeToken(response.data);
        window.location.reload();
      })
      .catch((error) => {
        console.error(error);
        setErr([1, 'Failed to login']);
      });
  };

  return (
    <div>
      <h1 style={{ color: 'black' }}>Login</h1>
      <input
        className="input-box"
        type="text"
        placeholder="Username"
        value={user}
        onChange={(e) => setUser(e.target.value)}
      />
      <input
        className="input-box"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div>
        {err[0] === 1 && <span style={{ color: 'red' }}>{err[1]}</span>}
        {err[0] === 0 && <span style={{ color: 'black' }}>{err[1]}</span>}
        {err[0] === 2 && <span style={{ color: 'green' }}>{err[1]}</span>}
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

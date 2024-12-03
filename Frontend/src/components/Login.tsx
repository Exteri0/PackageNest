import axios from 'axios';
import { useEffect, useState } from 'react';
import { storeToken, validateStoredToken } from '../utils';
import config from '../config';
import { message } from 'antd';

export default function Login() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
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
    axios
      .put(`${config.apiBaseUrl}/authenticate`, {
        User: {
          name: user,
          isAdmin: true,
        },
        Secret: {
          password: password,
        },
      })
      .then((response) => {
        console.log(response.data);
        message.success('Successfully logged in');
        storeToken(response.data.token);
        window.location.reload();
      })
      .catch((error) => {
        console.error(error);
        message.error('Failed to log in');
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
        type="text"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

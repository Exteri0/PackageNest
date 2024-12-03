import { useEffect, useState } from 'react';
import { validateStoredToken } from '../utils';
import { Switch, message } from 'antd';
import axios from 'axios';
import config from '../config';

export default function Regsiter() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBackend, setIsBackend] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(0);

  useEffect(() => {
    (async () => {
      const user = await validateStoredToken();
      if (user) {
        console.log('User is logged in');
        console.log(user);
        setIsLoggedIn(1);
      } else {
        console.log('User is not logged in');
        setIsLoggedIn(2);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    console.log('Submitting user:', name);
    axios
      .post(`${config.apiBaseUrl}/register`, {
        User: {
          name: name,
          isAdmin: isAdmin,
          isBackend: isBackend,
        },
        Secret: {
          password: password,
        },
      })
      .then((response) => {
        console.log(response.data);
        message.success('Successfully registered user');
      })
      .catch((error) => {
        console.error(error);
        message.error('Failed to register user');
      });
  };

  return (
    <div>
      <h1>Register users</h1>
      {isLoggedIn === 0 && <h2>Loading...</h2>}
      {isLoggedIn === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            className="input-box"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            className="input-box"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <span style={{ color: '#000', marginRight: '30px' }}>Admin</span>

            <Switch checked={isAdmin} onChange={(e) => setIsAdmin(e)} />
          </div>
          <div>
            <span style={{ color: '#000', marginRight: '17px' }}>Backend</span>
            <Switch checked={isBackend} onChange={(e) => setIsBackend(e)} />
          </div>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      )}
      {isLoggedIn === 2 && <h2>User is not logged in</h2>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { validateStoredToken } from '../utils';
import { Switch } from 'antd';
import axios from 'axios';
import config from '../config';

export default function Regsiter() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBackend, setIsBackend] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(0);
  const [error, setError] = useState([0, '']);

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

  const checkInput = () => {
    return new Promise((resolve, reject) => {
      if (name === '' || password === '') {
        setError([1, 'Please fill out all fields']);
        reject(new Error('Please fill out all fields'));
      }
      if (typeof name !== 'string' || typeof password !== 'string') {
        setError([1, 'Name and password must be strings']);
        reject(new Error('Name and password must be strings'));
      }
      if (/^\d+$/.test(name) || /^\d+$/.test(password)) {
        setError([1, 'Name and password cannot be just numbers']);
        reject(new Error('Name and password cannot be just numbers'));
      }

      resolve(true);
    });
  };

  const registerUser = () => {
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
        setError([2, 'Successfully registered user']);
      })
      .catch((error) => {
        console.error(error);
        setError([1, 'Failed to register user']);
      });
  };

  const handleSubmit = async () => {
    await checkInput()
      .then(() => {
        setError([0, 'Submitting user...']);
        registerUser();
      })
      .catch((err) => {
        console.error(err);
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

            <Switch
              title="set-admin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e)}
            />
          </div>
          <div>
            <span style={{ color: '#000', marginRight: '17px' }}>Backend</span>
            <Switch
              title="set-backend"
              checked={isBackend}
              onChange={(e) => setIsBackend(e)}
            />
          </div>
          <button onClick={handleSubmit}>Submit</button>
          {error[0] === 0 && <span style={{ color: 'black' }}>{error[1]}</span>}
          {error[0] === 1 && <span style={{ color: 'red' }}>{error[1]}</span>}
          {error[0] === 2 && <span style={{ color: 'green' }}>{error[1]}</span>}
        </div>
      )}
      {isLoggedIn === 2 && <h2>User is not logged in</h2>}
    </div>
  );
}

import { useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { useState } from 'react';
import { validateStoredToken } from '../utils';

export default function Reset() {
  const [status, setStatus] = useState(0);
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
    axios
      .delete(`${config.apiBaseUrl}/reset`, {
        headers: {
          'X-Authorization': localStorage.getItem('token'),
        },
      })
      .then((response) => {
        console.log(response.status);
        if (response.status === 200) {
          setStatus(2);
          setTimeout(() => window.location.reload(), 1500);
        } else setStatus(1);
      })
      .catch((error) => {
        console.error(error);
        setStatus(1);
      });
  };
  const message = [
    '',
    'An error happened, please check console',
    'DB IS RESET SUCCESSFULLY',
  ];
  return (
    <>
      {isLoggedIn === 0 && <h1>Loading</h1>}
      {isLoggedIn === 1 && (
        <>
          <h1>Do you want to reset Database?</h1>
          <button onClick={handleSubmit}>Reset</button>
          <h3>{message[status]}</h3>
        </>
      )}
      {isLoggedIn === 2 && <h1>Please Login First</h1>}
    </>
  );
}

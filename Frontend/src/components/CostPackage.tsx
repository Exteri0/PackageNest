import { useState, useEffect } from 'react';
import config from '../config';
import axios from 'axios';
import { validateStoredToken } from '../utils';

export default function CostPackage() {
  const [id, setId] = useState('');
  const [sCost, setSCost] = useState(0);
  const [tCost, setTCost] = useState(0);
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

  const handleSubmit = () => {
    if (id === '') {
      setError([0, 'Please enter a package id']);
      return;
    }
    setError([0, 'Fetching cost data...']);
    axios
      .get(`${config.apiBaseUrl}/package/${id}/cost`, {
        headers: {
          'X-Authorization': localStorage.getItem('token'),
        },
      })
      .then((res) => {
        // Access the data using the dynamic `id` key
        const costData = res.data[id];
        if (costData) {
          setSCost(costData.standaloneCost);
          setTCost(costData.totalCost);
          setError([2, '']);
        } else {
          setError([1, 'Invalid response structure']);
        }
      })
      .catch((err) => {
        console.error(err);
        setError([1, 'Failed to fetch cost data']);
      });
  };

  return (
    <>
      {isLoggedIn === 0 && <h1>Loading</h1>}
      {isLoggedIn === 1 && (
        <div
          style={{
            display: 'flex',
            gap: '25px',
            flexDirection: 'column',
            color: 'black',
          }}
        >
          <h1 style={{ color: 'black' }}>Cost of package with id:</h1>
          <div>
            <input
              className="input-box"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              style={{ margin: '0px' }}
              title="package-id"
            />
          </div>
          <div>
            <button onClick={handleSubmit}>Submit</button>
          </div>
          {error[0] == 0 && <span>{error[1]}</span>}
          {error[0] == 1 && <span style={{ color: 'red' }}>{error[1]}</span>}
          {error[0] == 2 && <h2>Standalone Cost: {sCost}</h2>}
          {error[0] == 2 && <h2>Total Cost: {tCost}</h2>}
        </div>
      )}
      {isLoggedIn === 2 && <h1>Please Login First</h1>}
    </>
  );
}

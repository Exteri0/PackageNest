import { useState, useEffect } from 'react';
import config from '../config';
import axios from 'axios';
import { message } from 'antd';
import { validateStoredToken } from '../utils';

export default function CostPackage() {
  const [id, setId] = useState('');
  const [sCost, setSCost] = useState(0);
  const [tCost, setTCost] = useState(0);
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

  const handleSubmit = () => {
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
        } else {
          console.error('Invalid response structure');
          message.error('Error: Cost data not found');
        }
      })
      .catch((err) => {
        console.error(err);
        message.error('Error fetching cost data');
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
            />
          </div>
          <div>
            <button onClick={handleSubmit}>Submit</button>
          </div>
          <h2>Standalone Cost: {sCost}</h2>
          <h2>Total Cost: {tCost}</h2>
        </div>
      )}
      {isLoggedIn === 2 && <h1>Please Login First</h1>}
    </>
  );
}

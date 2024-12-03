import { useState } from 'react';
import config from '../config';
import axios from 'axios';
import { message } from 'antd';

export default function CostPackage() {
  const [id, setId] = useState('');
  const [sCost, setSCost] = useState(0);
  const [tCost, setTCost] = useState(0);

  const handleSubmit = () => {
    axios
      .get(`${config.apiBaseUrl}/package/${id}/cost`)
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
  );
}

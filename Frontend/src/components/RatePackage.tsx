import { useState, useEffect } from 'react';
import config from '../config';
import { message } from 'antd';
import axios from 'axios';
import { validateStoredToken } from '../utils';

type RatePackage = {
  BusFactor: number;
  BusFactorLatency: number;
  Correctness: number;
  CorrectnessLatency: number;
  RampUp: number;
  RampUpLatency: number;
  ResponsiveMaintainer: number;
  ResponsiveMaintainerLatency: number;
  LicenseScore: number;
  LicenseScoreLatency: number;
  GoodPinningPractice: number;
  GoodPinningPracticeLatency: number;
  PullRequest: number;
  PullRequestLatency: number;
  NetScore: number;
  NetScoreLatency: number;
};

export default function RatePackage() {
  const [id, setId] = useState('');
  const [rate, setRate] = useState({} as RatePackage);
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
    setRate({} as RatePackage);
    if (id == '') {
      message.error('Please enter a package ID');
    } else {
      await axios
        .get(`${config.apiBaseUrl}/package/${id}/rate`, {
          headers: {
            'X-Authorization': localStorage.getItem('token'),
          },
        })
        .then((response) => {
          setRate(response.data);
        })
        .catch((error) => {
          message.error(error.message);
        });
    }
  };

  return (
    <>
      {isLoggedIn === 0 && <h1>Loading</h1>}
      {isLoggedIn === 2 && <h1>Please Login First</h1>}
      {isLoggedIn === 1 && (
        <div>
          <h1 style={{ color: 'black' }}>Rate Package</h1>
          <input
            className="input-box"
            placeholder="Enter Package ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <button className="action-buttons" onClick={handleSubmit}>
            Get Package Rating
          </button>
          {Object.entries(rate).map(([key, value]) => (
            <div key={key} style={{ margin: '10px 20px', color: 'black' }}>
              <span style={{ fontWeight: 'bold' }}>{key}: </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

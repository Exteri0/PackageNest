import { useState } from 'react';
import config from '../config';
import { message } from 'antd';
import axios from 'axios';

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

  const handleSubmit = async () => {
    setRate({} as RatePackage);
    if (id == '') {
      message.error('Please enter a package ID');
    } else {
      await axios
        .get(`${config.apiBaseUrl}/package/${id}/rate`)
        .then((response) => {
          setRate(response.data);
        })
        .catch((error) => {
          message.error(error.message);
        });
    }
  };

  return (
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
  );
}

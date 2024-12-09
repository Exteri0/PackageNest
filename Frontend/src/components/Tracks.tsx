import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';

export default function Tracks() {
  const [track, setTrack] = useState('Loading...');
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${config.apiBaseUrl}/tracks`)
      .then((response) => {
        console.log(response.data);
        setTrack(response.data.plannedTracks);
      })
      .catch((error) => {
        console.error(error);
        setError('Failed to fetch track data');
      });
  }, []);

  return (
    <div>
      <h1 style={{ color: 'black' }}>Our track is {track}</h1>
      {<span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
}

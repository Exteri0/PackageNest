import axios from 'axios';
import { useEffect, useState } from 'react';
import config from '../config';
import { message } from 'antd';

export default function Tracks() {
  const [track, setTrack] = useState('Loading...');

  useEffect(() => {
    axios
      .get(`${config.apiBaseUrl}/tracks`)
      .then((response) => {
        console.log(response.data);
        setTrack(response.data.plannedTracks);
      })
      .catch((error) => {
        message.error(error);
      });
  }, []);

  return (
    <div>
      <h1 style={{ color: 'black' }}>Our track is {track}</h1>
    </div>
  );
}

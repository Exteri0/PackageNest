import React, { useEffect, useState } from 'react';
import { validateStoredToken } from '../utils';

interface ButtonPanelProps {
  setSelectedAction: (action: string) => void;
}

const ButtonPanel: React.FC<ButtonPanelProps> = ({ setSelectedAction }) => {
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

  return (
    <div
      className="button-panel"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'flex-start',
        padding: '10px',
      }}
    >
      {isLoggedIn === 1 && (
        <button onClick={() => setSelectedAction('register')}>
          Register Users
        </button>
      )}
      <button onClick={() => setSelectedAction('getPackage')}>
        Get Package
      </button>
      <button onClick={() => setSelectedAction('uploadPackage')}>
        Upload Package
      </button>
      <button onClick={() => setSelectedAction('updatePackage')}>
        Update Package
      </button>
      <button onClick={() => setSelectedAction('resetRegistry')}>
        Reset Registry
      </button>
      <button onClick={() => setSelectedAction('costPackage')}>
        Cost package
      </button>
      <button onClick={() => setSelectedAction('ratePackage')}>
        Rate Package
      </button>
      <button onClick={() => setSelectedAction('tracks')}>Tracks</button>
      {isLoggedIn === 2 && (
        <button onClick={() => setSelectedAction('login')}>Login</button>
      )}
      {isLoggedIn === 1 && (
        <button onClick={() => setSelectedAction('logout')}>Logout</button>
      )}
    </div>
  );
};

export default ButtonPanel;

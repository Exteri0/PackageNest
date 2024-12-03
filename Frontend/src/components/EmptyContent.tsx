import React, { useEffect, useState } from 'react';
import { validateStoredToken } from '../utils';

const EmptyContent: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(0);
  const [name, setName] = useState('');

  useEffect(() => {
    (async () => {
      const user = await validateStoredToken();
      if (user) {
        console.log('User is logged in');
        console.log(user);
        setName(user.name);
        setIsLoggedIn(1);
      } else {
        console.log('User is not logged in');
        setIsLoggedIn(2);
      }
    })();
  }, []);
  return (
    <div>
      <div className="empty-content">Select an action to see details</div>
      {isLoggedIn === 0 && <h2>Loading...</h2>}
      {isLoggedIn === 1 && <h2>Hello {name}</h2>}
      {isLoggedIn === 2 && <h2>Please Login to access all endpoints</h2>}
    </div>
  );
};

export default EmptyContent;

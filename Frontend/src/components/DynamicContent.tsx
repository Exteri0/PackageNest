import React from 'react';
import GetPackage from './GetPackage';
import UploadPackage from './UploadPackage';
import EmptyContent from './EmptyContent';
import Reset from './Reset';
import RatePackage from './RatePackage';
import CostPackage from './CostPackage';
import Tracks from './Tracks';
import Login from './Login';
import Regsiter from './Register';
import Logout from './Logout';
import UpdatePackage from './UpdatePackage';
import DeleteUser from './DeleteUser';

interface DynamicContentProps {
  selectedAction: string;
}

const DynamicContent: React.FC<DynamicContentProps> = ({ selectedAction }) => {
  switch (selectedAction) {
    case 'getPackage':
      return <GetPackage />;
    case 'uploadPackage':
      return <UploadPackage />;
    case 'updatePackage':
      return <UpdatePackage />;
    case 'ratePackage':
      return <RatePackage />;
    case 'resetRegistry':
      return <Reset />;
    case 'authenticate':
      return <EmptyContent />;
    case 'costPackage':
      return <CostPackage />;
    case 'tracks':
      return <Tracks />;
    case 'login':
      return <Login />;
    case 'register':
      return <Regsiter />;
    case 'logout':
      return <Logout />;
    case 'deleteUser':
      return <DeleteUser />;
    default:
      return <EmptyContent />;
  }
};

export default DynamicContent;

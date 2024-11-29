import React from 'react';
import GetPackage from './GetPackage';
import UploadPackage from './UploadPackage';
import EmptyContent from './EmptyContent';
import Reset from './Reset';
import RatePackage from './RatePackage';

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
    case 'deletePackage':
    case 'ratePackage':
      return <RatePackage />;
    case 'resetRegistry':
      return <Reset />;
    case 'authenticate':
      return <EmptyContent />;
    case 'costPackage':
      return <EmptyContent />;
    case 'tracks':
      return <EmptyContent />;
    default:
      return <EmptyContent />;
  }
};

export default DynamicContent;

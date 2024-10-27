import React, { useState } from 'react';
import {Button,Upload} from 'antd'

const UploadPackage: React.FC = () => {
  const [uploadMethod, setUploadMethod] = useState<'uploadZip' | 'uploadGithub'>('uploadZip');

  return (
    <>
      <select className = 'dropdown' onChange={(e) => setUploadMethod(e.target.value as 'uploadZip' | 'uploadGithub')}>
        <option value="uploadZip">Upload Zip File</option>
        <option value="uploadGithub">Upload by GitHub URL</option>
      </select>
      {uploadMethod === 'uploadZip' ? (
        <div className="drag-drop-area">
          <Upload.Dragger multiple = {false} action = {'http://localhost:5173/'} /*accept = ".zip"*/>
          <Button>
            Upload File
          </Button>
          </Upload.Dragger>
        </div>
      ) : (
        <input type="text" placeholder="Enter GitHub URL" className = 'input-box'/>
      )}
      <button className = 'action-buttons'>Upload Package</button>
    </>
  );
};

export default UploadPackage;

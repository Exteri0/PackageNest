import React, { useState, useEffect } from 'react';
import { Button, Switch, Upload, message } from 'antd';
import axios from 'axios';
import config from '../config';
import { validateStoredToken } from '../utils';

const UploadPackage: React.FC = () => {
  const [uploadMethod, setUploadMethod] = useState<
    'uploadZip' | 'uploadGithub'
  >('uploadZip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [jsProgram, setJsProgram] = useState<string>('');
  const [debloat, setDebloat] = useState<boolean>(false);
  const [githubUrl, setGithubUrl] = useState<string>('');
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

  // Function to handle file upload
  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    return false; // Prevents automatic upload
  };

  // Function to convert file to base64 and send POST request
  const handleUpload = async () => {
    if (selectedFile && uploadMethod === 'uploadZip') {
      const base64String = await convertFileToBase64(selectedFile);
      console.log('this is my 64 encoded string', base64String);
      // Send the base64 string to your API
      axios
        .post(
          `${config.apiBaseUrl}/package`,
          {
            Content: base64String,
            Name: name,
            JSProgram: "console.log('Hello, World!');",
            debloat: false,
          },
          {
            headers: {
              'X-Authorization': localStorage.getItem('token'),
            },
          },
        )
        .then((response) => {
          message.success('File uploaded successfully!');
          console.log(response.data);
        })
        .catch((error) => {
          message.error('Failed to upload file.');
          console.error(error);
        });
    } else if (uploadMethod === 'uploadGithub') {
      message.info('Uploading file from GitHub URL...');
      axios
        .post(
          `${config.apiBaseUrl}/package`,
          {
            URL: githubUrl,
            JSProgram: "console.log('Hello, World!');",
          },
          {
            headers: {
              'X-Authorization': localStorage.getItem('token'),
            },
          },
        )
        .then((response) => {
          message.success('File uploaded successfully!');
          console.log(response.data);
        })
        .catch((error) => {
          message.error('Failed to upload file.');
          console.error(error);
        });
    } else {
      message.warning('Please select a file to upload.');
    }
  };

  // Function to convert file to base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]; // Remove the prefix (data:application/zip;base64,)
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <>
      {isLoggedIn === 0 && <div>Loading...</div>} {/* Show loading message */}
      {isLoggedIn === 1 /* Show content only if logged in */ && (
        <>
          <select
            className="dropdown"
            onChange={(e) =>
              setUploadMethod(e.target.value as 'uploadZip' | 'uploadGithub')
            }
          >
            <option value="uploadZip">Upload Zip File</option>
            <option value="uploadGithub">Upload by GitHub URL</option>
          </select>
          {uploadMethod === 'uploadZip' ? (
            <>
              <div className="drag-drop-area">
                <Upload.Dragger
                  multiple={false}
                  beforeUpload={handleFileChange}
                  accept=".zip"
                >
                  <Button>Upload File</Button>
                </Upload.Dragger>
              </div>
              <div>
                <input
                  className="input-box"
                  placeholder="Enter Package Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Enter JS Program"
                  className="input-box"
                  value={jsProgram}
                  onChange={(e) => setJsProgram(e.target.value)}
                />
                <span style={{ color: '#000', margin: '30px' }}>Debloat</span>
                <Switch checked={debloat} onChange={(e) => setDebloat(e)} />
              </div>
            </>
          ) : (
            <input
              type="text"
              placeholder="Enter GitHub URL"
              className="input-box"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          )}
          <button className="action-buttons" onClick={handleUpload}>
            Upload Package
          </button>
        </>
      )}
      {isLoggedIn === 2 && (
        <div style={{ color: 'red', textAlign: 'center' }}>
          You must be logged in to access this content.
        </div>
      )}
    </>
  );
};

export default UploadPackage;

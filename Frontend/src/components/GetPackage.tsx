import React, { useState } from 'react';
import axios from 'axios';
import config from '../config';
import '../styles/components/get-package.css';

type Package = {
  name: string;
  version: string;
  package_id: string;
  created_at?: string;
  updated_at?: string;
  content_type?: boolean;
  base64?: string;
};
export default function GetPackage() {
  const [selectedOption, setSelectedOption] = useState('id');
  const [status, setStatus] = useState(0);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [regex, setRegex] = useState('');
  const [version, setVersion] = useState('');
  const [offset, setOffset] = useState('');
  const [packageData, setPackageData] = useState<Package[]>([]);
  const [error, setError] = useState('');

  const handleOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(e.target.value);
    setPackageData([]);
  };

  const handleDownload = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    pkg: Package,
  ) => {
    // Decode Base64 content
    e.preventDefault();

    const binaryData = atob(pkg.base64 ? pkg.base64 : ''); // Decode Base64 to binary
    const arrayBuffer = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      arrayBuffer[i] = binaryData.charCodeAt(i);
    }

    // Create a Blob from the binary data
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });

    // Generate a download link
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${pkg.name}.zip`; // Default filename
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url); // Clean up
  };

  const checkInput = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      switch (selectedOption) {
        case 'id':
          if (id === '' || isNaN(Number(id))) {
            setError('Please enter a valid package ID');
            setStatus(1);
            resolve(true); // Error exists
          }
          break;
        case 'name':
          if (name === '' || version === '') {
            setError('Please enter all the fields');
            setStatus(1);
            resolve(true); // Error exists
          }
          break;
        case 'regex':
          if (regex === '') {
            setError('Please enter a valid regex');
            setStatus(1);
            resolve(true); // Error exists
          }
          break;
        default:
          setError('');
          setStatus(0);
          resolve(false); // No error
      }
      resolve(false); // No error by default
    });
  };

  const handleSubmit = async () => {
    let body = {};
    let params = {};
    let headers = {};
    const hasError = await checkInput(); // Wait for checkInput to complete
    if (hasError)
      return; // If there's an error, stop further execution    if (flag) return;
    else {
      setError('');
      switch (selectedOption) {
        case 'id':
          axios
            .get(`${config.apiBaseUrl}/package/${id}`)
            .then((response) => {
              console.log(response.data);
              setPackageData([
                {
                  name: response.data.metadata.Name,
                  version: response.data.metadata.Version,
                  package_id: response.data.metadata.ID,
                  base64: response.data.data.Content,
                },
              ]);
            })
            .catch((error) => {
              console.error(error);
              setStatus(1);
            });
          console.log('Get Package By ID');
          break;
        case 'name':
          body = [
            {
              Name: name,
              Version: version,
            },
          ];
          params = {
            offset: offset,
          };
          axios
            .post(`${config.apiBaseUrl}/packages`, body, { headers, params })
            .then((response) => {
              console.log(response.data);
              setPackageData(response.data);
            })
            .catch((error) => {
              console.error(error);
              setStatus(1);
            });
          console.log('Get Package By Name');
          break;
        case 'regex':
          body = {
            RegEx: regex,
          };
          axios
            .post(`${config.apiBaseUrl}/package/byRegex`, body, { headers })
            .then((response) => {
              // Map response data to match your Package type
              const packages = response.data.map((pkg) => ({
                name: pkg.Name,
                version: pkg.Version,
                package_id: pkg.ID,
              }));
              setPackageData(packages); // Update state once with all packages
              setError(''); // Clear any previous error
              setStatus(0); // Set status to success
            })
            .catch((error) => {
              console.error(error);
              setError('Failed to fetch packages by REGEX'); // Set error message
              setStatus(1); // Set status to error
            });
          console.log('Get Package By REGEX');
          break;
        default:
          console.error('Invalid option selected');
          console.log(selectedOption);
          setStatus(1);
      }
      console.log('Get Package');
    }
  };

  return (
    <div className="main-container">
      <select className="dropdown" onChange={(e) => handleOptionChange(e)}>
        <option value="id">Get by ID</option>
        <option value="name">Get by Name</option>
        <option value="regex">Get by REGEX</option>
      </select>
      {selectedOption === 'id' && (
        <input
          type="text"
          placeholder="Enter package ID..."
          className="input-box"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
      )}
      {selectedOption === 'name' && (
        <>
          <input
            type="text"
            placeholder="Enter package Offser..."
            className="input-box"
            onChange={(e) => setOffset(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter package name..."
            className="input-box"
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter package version..."
            className="input-box"
            onChange={(e) => setVersion(e.target.value)}
          />
        </>
      )}
      {selectedOption === 'regex' && (
        <input
          type="text"
          placeholder="Enter package regex..."
          className="input-box"
          value={regex}
          onChange={(e) => setRegex(e.target.value)}
        />
      )}
      <button className="action-buttons" onClick={handleSubmit}>
        Get Package
      </button>
      <span style={{ color: 'red', fontSize: '20px' }}>{error}</span>
      <h1 style={{ color: 'black', textAlign: 'center' }}>
        Result of the queries
      </h1>
      <div className="package-list">
        {packageData.map((pkg) => (
          <div key={pkg.package_id} className="package-card">
            <h3>{pkg.name}</h3>
            <p>Version: {pkg.version}</p>
            <p>Package ID: {pkg.package_id}</p>
            {pkg.created_at && <p>Created At: {pkg.created_at}</p>}
            {pkg.updated_at && <p>Updated At: {pkg.updated_at}</p>}
            {pkg.content_type && (
              <p>Content Type: {pkg.content_type ? 'True' : 'False'}</p>
            )}
            {pkg.base64 && (
              <button onClick={(e) => handleDownload(e, pkg)}>Download</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

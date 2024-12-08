import { useState, useEffect } from 'react';
import { validateStoredToken } from '../utils';
import axios from 'axios';
import config from '../config';
import { Upload, Switch } from 'antd';

export default function UpdatePackage() {
  const [uploadMethod, setUploadMethod] = useState<
    'uploadZip' | 'uploadGithub'
  >('uploadZip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [jsProgram, setJsProgram] = useState<string>('');
  const [debloat, setDebloat] = useState<boolean>(false);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(0);
  const [error, setError] = useState([0, '']);
  const [id, setId] = useState('');
  const [version, setVersion] = useState('');

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

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    return false; // Prevents automatic upload
  };

  // Function to convert file to base64 and send POST request
  const handleUpdate = async () => {
    if (id === '') {
      setError([1, 'Please enter a package ID.']);
      return;
    }
    if (isNaN(Number(id))) {
      setError([1, 'Please enter a valid package ID.']);
      return;
    }
    if (name === '' || jsProgram === '') {
      setError([1, 'Please enter a package name and JS program.']);
      return;
    }
    if (selectedFile && uploadMethod === 'uploadZip') {
      setError([0, 'Uploading package...']);
      const base64String = await convertFileToBase64(selectedFile);
      console.log('this is my 64 encoded string', base64String);
      // Send the base64 string to your API
      axios
        .post(
          `${config.apiBaseUrl}/package/${id}`,
          {
            metadata: {
              Name: name,
              Version: version,
              ID: id,
            },
            data: {
              Content: base64String,
              Name: name,
              JSProgram: "console.log('Hello, World!');",
              debloat: false,
            },
          },
          {
            headers: {
              'X-Authorization': localStorage.getItem('token'),
            },
          },
        )
        .then((response) => {
          setError([2, 'File uploaded successfully!']);
          console.log(response.data);
        })
        .catch((error) => {
          if (error.response.status === 400) {
            setError([
              1,
              'Failed to upload file, reason for this may be:\nInvalid update type: Existing package was uploaded with URL. Update must match the original type.\nThe name should be the same as the original package as well.\nVersion should not be already uploaded before',
            ]);
          } else setError([1, 'Failed to update package.']);
          setName('');
          setVersion('');
          setJsProgram('');
          setDebloat(false);
          setSelectedFile(null);
          console.error(error);
        });
    } else if (uploadMethod === 'uploadGithub') {
      if (githubUrl === '') {
        setError([1, 'Please enter a URL.']);
        return;
      }
      const urlPattern =
        /^(https:\/\/github\.com\/.+\/.+|https:\/\/www\.npmjs\.com\/package\/.+)$/;
      if (!urlPattern.test(githubUrl)) {
        setError([1, 'Please enter a valid GitHub or NPM URL.']);
        return;
      }
      setError([0, 'Uploading package...']);
      axios
        .post(
          `${config.apiBaseUrl}/package/${id}`,
          {
            metadata: {
              Name: name,
              Version: version,
              ID: id,
            },
            data: {
              URL: githubUrl,
              Name: name,
              JSProgram: "console.log('Hello, World!');",
              debloat: false,
            },
          },
          {
            headers: {
              'X-Authorization': localStorage.getItem('token'),
            },
          },
        )
        .then((response) => {
          setError([2, 'Package updated successfully!']);
          console.log(response.data);
        })
        .catch((error) => {
          if (error.response.status === 400) {
            setError([
              1,
              'Failed to upload file, reason for this may be:\nInvalid update type: Existing package was uploaded with URL. Update must match the original type.\nThe name should be the same as the original package as well.\nVersion should not be already uploaded before',
            ]);
          } else setError([1, 'Failed to update package.']);
          console.error(error);
        });
    } else {
      setError([1, 'Please select a file to upload.']);
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
      reader.onerror = () =>
        reject(new Error('Error converting file to base64'));
    });
  };

  return (
    <>
      {isLoggedIn === 0 && <div>Loading...</div>} {/* Show loading message */}
      {isLoggedIn === 1 /* Show content only if logged in */ && (
        <>
          <h1>Update Package</h1>
          <label htmlFor="package-id" style={{ fontSize: '20px' }}>
            Please put ID of the package you want to update
          </label>
          <input
            type="text"
            placeholder="Enter Package ID"
            className="input-box"
            value={id}
            onChange={(e) => setId(e.target.value)}
            style={{ marginTop: '10px', marginBottom: '30px' }}
            title="package-id"
          />
          <label style={{ fontSize: '20px' }} htmlFor="select-upload-method">
            Select the Method by which the original package was uploaded with
          </label>
          <select
            className="dropdown"
            onChange={(e) =>
              setUploadMethod(e.target.value as 'uploadZip' | 'uploadGithub')
            }
            title="select-upload-method"
            style={{ margin: '20px' }}
          >
            <option value="uploadZip">Upload Zip File</option>
            <option value="uploadGithub">Upload by GitHub or NPM URL</option>
          </select>
          {uploadMethod === 'uploadZip' ? (
            <div className="drag-drop-area">
              <Upload.Dragger
                multiple={false}
                beforeUpload={handleFileChange}
                accept=".zip"
                style={{ fontSize: '20px', color: '#000' }}
              >
                Upload File
              </Upload.Dragger>
            </div>
          ) : (
            <input
              type="text"
              placeholder="Enter GitHub or NPM URL"
              className="input-box"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          )}
          <div>
            <input
              className="input-box"
              placeholder="Enter Package Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input-box"
              placeholder="Enter New Package Version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
            <input
              type="text"
              placeholder="Enter New JS Program"
              className="input-box"
              value={jsProgram}
              onChange={(e) => setJsProgram(e.target.value)}
            />
            <span style={{ color: '#000', margin: '30px' }}>Debloat</span>
            <Switch
              title="select-debload"
              checked={debloat}
              onChange={(e) => setDebloat(e)}
            />
          </div>
          <button className="action-buttons" onClick={handleUpdate}>
            Update Package
          </button>
        </>
      )}
      {isLoggedIn === 2 && <h1>Please Login First</h1>}
      {error[0] === 0 && <span style={{ color: 'black' }}>{error[1]}</span>}
      {error[0] === 1 && <span style={{ color: 'red' }}>{error[1]}</span>}
      {error[0] === 2 && <span style={{ color: 'green' }}>{error[1]}</span>}
    </>
  );
}

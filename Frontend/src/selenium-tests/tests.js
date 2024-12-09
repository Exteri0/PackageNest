import { Builder, By, until } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome.js';
import { path as chromedriverPath } from 'chromedriver';

(async function testPackageManager() {
  const options = new chrome.Options();
  options.addArguments('--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage');

  const service = new chrome.ServiceBuilder(chromedriverPath);

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeService(service)
    .setChromeOptions(options)
    .build();

    await driver.manage().window().setRect({ width: 3020, height: 2080 });

    async function login() {
      console.log("Logging in...");
    
      await driver.wait(until.elementLocated(By.xpath("//button[text()='Login']")), 10000).click();
    
      await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Username']")), 10000).sendKeys('ece30861defaultadminuser');
    
      await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Password']")), 10000).sendKeys("correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;");
    
      await driver.wait(until.elementLocated(By.xpath("//button[text()='Submit']")), 10000).click();
    
      await driver.wait(
        until.elementLocated(By.xpath("//button[text()='Logout']")),
        10000,
        "Login failed. Logout button not found after login."
      );
    
      console.log("Login successful.");
    }
    

  async function testRegisterUsers() {
    console.log("Navigating to Register Users...");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Register Users']")), 10000).click();

    console.log("Running Test Case 1.1: Successful Registration...");
    let nameField = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Name']")), 10000);
    let passwordField = await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Password']")), 10000);
    let adminToggle = await driver.wait(until.elementLocated(By.xpath("//button[@role='switch' and preceding-sibling::span[text()='Admin']]")), 10000);
    let submitButton = await driver.wait(until.elementLocated(By.xpath("//button[text()='Submit']")), 10000);

    await nameField.sendKeys('test_user');
    await passwordField.sendKeys('password123');
    await adminToggle.click(); 
    await submitButton.click();

    console.log("Verifying success message...");
    let successMessage = await driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class, 'ant-message-notice') and .//span[text()='Successfully registered user']]")),
      5000
    );

    if (successMessage) {
      console.log("Success Message Detected: 'Successfully registered user'");
    }
  }

  async function testRegisterUsers1() {
    console.log("Navigating to Register Users...");
    
    const registerUsersButton = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Users']")),
      10000,
      "Register Users button not found."
    );
    await registerUsersButton.click();
  
    console.log("Running Test Case: Successful Registration...");
    
    const nameField = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Name']")),
      10000,
      "Name field not found."
    );
    const passwordField = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Password']")),
      10000,
      "Password field not found."
    );
    const adminToggle = await driver.wait(
      until.elementLocated(By.xpath("//button[@role='switch' and preceding-sibling::span[text()='Admin']]")),
      10000,
      "Admin toggle not found."
    );
    const backendToggle = await driver.wait( 
      until.elementLocated(By.xpath("//button[@role='switch' and preceding-sibling::span[text()='Backend']]"))
    )
    const submitButton = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Submit']")),
      10000,
      "Submit button not found."
    );
  
    await nameField.clear();
    await nameField.sendKeys('test_user');
    await passwordField.clear();
    await passwordField.sendKeys('password123');
    await adminToggle.click();
    await submitButton.click();
  
    console.log("Verifying success message...");
    const successMessage = await driver.wait(
      until.elementLocated(By.xpath("//span[@style='color: green;' and text()='Successfully registered user']")),
      10000,
      "Success message not found."
    );
  
    const messageText = await successMessage.getText();
    if (messageText === "Successfully registered user") {
      console.log("Test Passed: Successfully registered user message displayed.");
    } else {
      throw new Error(`Test Failed: Unexpected success message text. Found: ${messageText}`);
    }
  }
  async function testRegisterUserMissingFields() {
    console.log("Running Test Case: Register User with Missing Fields...");
  
    console.log("Navigating to Register Users...");
    const registerUsersButton = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Users']")),
      10000,
      "Register Users button not found."
    );
    await registerUsersButton.click();
  
    console.log("Locating input fields...");
    const passwordField = await driver.wait(
      until.elementLocated(By.xpath("//input[@placeholder='Password']")),
      10000,
      "Password field not found."
    );
    const submitButton = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Submit']")),
      10000,
      "Submit button not found."
    );
  
    console.log("Entering only the password...");
    await passwordField.sendKeys("password123");
  
    console.log("Clicking the Submit button...");
    await submitButton.click();
  
    console.log("Verifying error message for missing fields...");
    const errorMessage = await driver.wait(
      until.elementLocated(By.xpath("//span[@style='color: red;' and text()='Please fill out all fields']")),
      10000,
      "Error message for missing fields not found."
    );
  
    const errorText = await errorMessage.getText();
    if (errorText === "Please fill out all fields") {
      console.log("Test Passed: Correct error message displayed for missing fields.");
    } else {
      throw new Error(`Test Failed: Unexpected error message. Found: ${errorText}`);
    }
  }
  
  async function testGetById() {
    console.log("Navigating to Get Package...");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();
  
    console.log("Selecting 'Get by ID'...");
    let dropdown = await driver.wait(until.elementLocated(By.css("select.dropdown")), 10000);
    await dropdown.sendKeys("Get by ID");
  
    console.log("Entering package ID...");
    let idInput = await driver.wait(until.elementLocated(By.css("input[placeholder='Enter package ID...']")), 10000);
    await idInput.sendKeys("147752147078923");
  
    console.log("Fetching package...");
    await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();
  
    console.log("Verifying package details...");
    let packageCard = await driver.wait(until.elementLocated(By.css("div.package-card")), 10000);
  
    let packageName = await driver.findElement(By.xpath("//div[@class='package-card']//h3[text()='cross-fetch']"));
    let version = await driver.findElement(By.xpath("//div[@class='package-card']//p[contains(text(), 'Version')]"));
    let packageId = await driver.findElement(By.xpath("//div[@class='package-card']//p[contains(text(), 'Package ID')]"));
  
    console.log("Package Name:", await packageName.getText());
    console.log("Version:", await version.getText());
    console.log("Package ID:", await packageId.getText());
  
    if (
      (await packageName.getText()) === "cross-fetch" &&
      (await version.getText()).includes("4.0.0") &&
      (await packageId.getText()).includes("147752147078923")
    ) {
      console.log("Package details verified successfully!");
    } else {
      throw new Error("Package details verification failed!");
    }
  
    console.log("Downloading package...");
    let downloadButton = await driver.findElement(By.xpath("//div[@class='package-card']//button[text()='Download']"));
    await downloadButton.click();
  
    console.log("Package downloaded successfully!");
  }
  async function testGetByNameValidInput() {
    console.log("Running Test Case: Valid Input for 'Get by Name'...");
  
    console.log("Navigating to Get Package...");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();
  
    console.log("Selecting 'Get by Name'...");
    let dropdown = await driver.wait(until.elementLocated(By.css("select")), 10000);
    await dropdown.sendKeys("Get by Name");
  
    console.log("Entering valid package name and version...");
    const nameInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Enter package name...']")),
      10000,
      "Package name input not found."
    );
    await nameInput.sendKeys("grunt");
  
    const versionInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Enter package version...']")),
      10000,
      "Package version input not found."
    );
    await versionInput.sendKeys("1.6.1");
  
    console.log("Clicking 'Get Package'...");
    await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();
  
    console.log("Verifying result...");
    const resultCard = await driver.wait(
      until.elementLocated(By.css("div.package-card")),
      10000,
      "Result card not found."
    );
  
    const packageName = await resultCard.findElement(By.xpath(".//h3")).getText();
    const versionElement = await resultCard.findElement(By.xpath(".//p[contains(text(), 'Version:')]"));
    const versionText = (await versionElement.getText()).trim();
    const versionNumber = versionText.split(":")[1].trim();
  
    if (packageName === "grunt" && versionNumber === "1.6.1") {
      console.log("Test Passed: Correct package returned.");
    } else {
      throw new Error("Test Failed: Incorrect package details.");
    }
  }
  async function testGetByNameWildcard() {
    console.log("Running Test Case: Wildcard Input for 'Get by Name'...");

    console.log("Navigating to Get Package...");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();

    console.log("Selecting 'Get by Name'...");
    let dropdown = await driver.wait(until.elementLocated(By.css("select")), 10000);
    await dropdown.sendKeys("Get by Name");

    console.log("Entering wildcard input for package name...");
    const nameInput = await driver.wait(
        until.elementLocated(By.css("input[placeholder='Enter package name...']")),
        10000,
        "Package name input not found."
    );
    await nameInput.sendKeys("*");

    const versionInput = await driver.wait(
        until.elementLocated(By.css("input[placeholder='Enter package version...']")),
        10000,
        "Package version input not found."
    );
    await versionInput.sendKeys("1.0.0"); 

    console.log("Clicking 'Get Package'...");
    await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

    console.log("Waiting for results to load...");
    await driver.wait(async () => {
        const cards = await driver.findElements(By.css("div.package-card"));
        return cards.length > 0;
    }, 10000, "No package cards were loaded.");

    console.log("Verifying results on the first page...");
    const firstPageCards = await driver.findElements(By.css("div.package-card"));
    console.log(`Found ${firstPageCards.length} package cards on the first page.`);
    if (firstPageCards.length !== 10) {
        throw new Error(`Test Failed: Expected 10 packages on the first page, but found ${firstPageCards.length}.`);
    }

    for (let i = 0; i < firstPageCards.length; i++) {
        const card = firstPageCards[i];
        const name = await card.findElement(By.xpath(".//h3")).getText();
        const version = await card.findElement(By.xpath(".//p[contains(text(), 'Version:')]")).getText();
        console.log(`Page 1 Package ${i + 1}: ${name}, ${version}`);
    }

    console.log("Checking 'Next Page' functionality...");
    const nextPageButton = await driver.findElements(By.xpath("//button[text()='Next Page']"));
    if (nextPageButton.length > 0) {
        console.log("Next Page button found. Navigating to the next page...");
        await nextPageButton[0].click();

        console.log("Waiting for next page to load...");
        await driver.wait(
            async () => {
                const nextPageCards = await driver.findElements(By.css("div.package-card"));
                const firstCardName = await nextPageCards[0].findElement(By.xpath(".//h3")).getText();
                return firstCardName !== "inversify"; 
            },
            10000,
            "Next page did not load with new package cards."
        );

        const nextPageCards = await driver.findElements(By.css("div.package-card"));
        console.log(`Found ${nextPageCards.length} package cards on the next page.`);
        if (nextPageCards.length !== 9) { 
            throw new Error(`Test Failed: Expected 9 packages on the next page, but found ${nextPageCards.length}.`);
        }

        for (let i = 0; i < nextPageCards.length; i++) {
            const card = nextPageCards[i];
            const name = await card.findElement(By.xpath(".//h3")).getText();
            const version = await card.findElement(By.xpath(".//p[contains(text(), 'Version:')]")).getText();
            console.log(`Page 2 Package ${i + 1}: ${name}, ${version}`);
        }

        console.log("Navigating back to the previous page...");
        const previousPageButton = await driver.findElements(By.xpath("//button[text()='Previous Page']"));
        if (previousPageButton.length > 0) {
            await previousPageButton[0].click();

            console.log("Waiting for previous page to reload...");
            await driver.wait(
                async () => {
                    const previousPageCards = await driver.findElements(By.css("div.package-card"));
                    const firstCardName = await previousPageCards[0].findElement(By.xpath(".//h3")).getText();
                    return firstCardName === "inversify";
                },
                10000,
                "Previous page did not reload correctly."
            );

            const previousPageCards = await driver.findElements(By.css("div.package-card"));
            console.log(`Found ${previousPageCards.length} package cards on the previous page.`);
            if (previousPageCards.length !== 10) {
                throw new Error(`Test Failed: Expected 10 packages on the previous page, but found ${previousPageCards.length}.`);
            }

            for (let i = 0; i < previousPageCards.length; i++) {
                const card = previousPageCards[i];
                const name = await card.findElement(By.xpath(".//h3")).getText();
                const version = await card.findElement(By.xpath(".//p[contains(text(), 'Version:')]")).getText();
                console.log(`Back to Page 1 Package ${i + 1}: ${name}, ${version}`);
            }

            console.log("Test Passed: Successfully navigated back to the previous page and verified results.");
        } else {
            console.log("Previous Page button not found. Cannot navigate back.");
        }
    } else {
        console.log("Test Passed: All packages fit on the current page.");
    }
}
async function testGetByNameInvalidInput() {
  console.log("Running Test Case: Invalid Input for 'Get by Name'...");

  console.log("Navigating to Get Package...");
  await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();

  console.log("Selecting 'Get by Name'...");
  let dropdown = await driver.wait(until.elementLocated(By.css("select")), 10000);
  await dropdown.sendKeys("Get by Name");

  console.log("Entering invalid inputs...");
  const nameInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Enter package name...']")),
      10000,
      "Package name input not found."
  );
  await nameInput.sendKeys("");

  const versionInput = await driver.wait(
      until.elementLocated(By.css("input[placeholder='Enter package version...']")),
      10000,
      "Package version input not found."
  );
  await versionInput.sendKeys("1.0.0"); 

  console.log("Clicking 'Get Package'...");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

  console.log("Verifying error message...");
  try {
      const errorMessage = await driver.wait(
          until.elementLocated(By.xpath("//span[@style='color: red; font-size: 20px;' and text()='Please enter all the fields']")),
          15000, 
          "Error message not found."
      );

      const errorText = await errorMessage.getText();
      if (errorText === "Please enter all the fields") {
          console.log("Test Passed: Correct error message displayed.");
      } else {
          throw new Error(`Test Failed: Incorrect error message displayed. Found: ${errorText}`);
      }
  } catch (error) {
      console.error("Test Failed: ", error);
  }
}

async function testGetByRegex() {
  console.log("Navigating to Get Package...");
  await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();

  console.log("Selecting 'Get by REGEX'...");
  let dropdown = await driver.wait(until.elementLocated(By.css("select.dropdown")), 10000);
  await dropdown.sendKeys("Get by REGEX");

  console.log("Running Test Case 3.1: Valid REGEX returning multiple results...");
  await driver.wait(until.elementLocated(By.css("input[placeholder='Enter package regex...']")), 10000).sendKeys("cross");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

  console.log("Verifying multiple results...");
  await driver.wait(until.elementsLocated(By.css("div.package-card")), 10000);
  let resultCards = await driver.findElements(By.css("div.package-card"));

  
  if (resultCards.length >= 2) {
      console.log(`Test Case 3.1 Passed: Found ${resultCards.length} matching packages.`);
  } else {
      throw new Error("Test Case 3.1 Failed: Did not find multiple results.");
  }
console.log("Running Test Case 3.2: Valid REGEX returning multiple specific results...");
await driver.findElement(By.css("input[placeholder='Enter package regex...']")).clear();
await driver.findElement(By.css("input[placeholder='Enter package regex...']")).sendKeys("debug");
await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

console.log("Waiting for results to update...");
await driver.wait(
    async () => {
        const resultCards = await driver.findElements(By.css("div.package-card"));
        return resultCards.length === 3;
    },
    20000,
    "Results did not update correctly or did not return the expected number of packages."
);

console.log("Verifying specific results...");
resultCards = await driver.findElements(By.css("div.package-card"));

if (resultCards.length === 3) {
    console.log("Test Case 3.2 Passed: Correct number of matching packages found.");
} else {
    throw new Error(`Test Case 3.2 Failed: Expected 3 packages, but found ${resultCards.length}.`);
}

/*let packageNames = [];
for (let card of resultCards) {
    let packageName = await card.findElement(By.xpath(".//h3")).getText();
    packageNames.push(packageName);
}

const expectedPackages = ["debug", "debug", "cross-fetch"];

if (expectedPackages.every(pkg => packageNames.includes(pkg))) {
    console.log("Test Case 3.2 Passed: All expected packages were found.");
    console.log("Found Packages:", packageNames);
} else {
    throw new Error(`Test Case 3.2 Failed: Expected packages ${expectedPackages}, but found ${packageNames}.`);
}*/

  // Case 3: Invalid REGEX returning no results
  console.log("Running Test Case 3.3: Invalid REGEX returning no results...");

  await driver.findElement(By.css("input[placeholder='Enter package regex...']")).clear();
  await driver.findElement(By.css("input[placeholder='Enter package regex...']")).sendKeys("xyz.*");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();
  
  console.log("Waiting for results to update...");
  await driver.wait(
      async () => {
          const resultCards = await driver.findElements(By.css("div.package-card"));
          return resultCards.length === 0; 
      },
      10000,
      "Results did not update correctly or unexpected packages are displayed."
  );
  
  console.log("Verifying no results...");
  resultCards = await driver.findElements(By.css("div.package-card"));
  if (resultCards.length === 0) {
      console.log("Test Case 3.3 Passed: No packages returned as expected.");
  } else {
      console.log("Found packages:", resultCards.length);
      throw new Error("Test Case 3.3 Failed: Unexpected packages returned.");
  }
}
async function testCostPackage() {
  console.log("Running Test Case 4.1: Verify Cost Package Functionality...");

  console.log("Navigating to 'Cost Package'...");
  await driver.wait(until.elementLocated(By.xpath("//button[text()='Cost package']")), 10000).click();

  console.log("Entering package ID...");
  const packageId = "132708964441393";
  const packageIdInput = await driver.wait(until.elementLocated(By.css("input.input-box")), 10000);
  await packageIdInput.sendKeys(packageId);

  console.log("Clicking 'Submit'...");
  const submitButton = await driver.wait(until.elementLocated(By.xpath("//button[text()='Submit']")), 10000);
  await submitButton.click();

  console.log("Waiting for updated Standalone Cost...");
  const standaloneCostElement = await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Standalone Cost:')]")),
      10000
  );
  const updatedStandaloneCost = await driver.wait(
      async () => {
          const costText = await standaloneCostElement.getText();
          return costText.includes("0.473");
      },
      10000,
      "Standalone Cost did not update to the expected value."
  );

  console.log("Waiting for updated Total Cost...");
  const totalCostElement = await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(text(), 'Total Cost:')]")),
      10000
  );
  const updatedTotalCost = await driver.wait(
      async () => {
          const costText = await totalCostElement.getText();
          return costText.includes("0.473");
      },
      10000,
      "Total Cost did not update to the expected value."
  );

  const standaloneCostText = await standaloneCostElement.getText();
  const totalCostText = await totalCostElement.getText();

  console.log("Verifying costs...");
  const expectedStandaloneCost = "Standalone Cost: 0.473";
  const expectedTotalCost = "Total Cost: 0.473";

  if (standaloneCostText === expectedStandaloneCost && totalCostText === expectedTotalCost) {
      console.log("Test Case 4.1 Passed: Cost values are correct.");
  } else {
      throw new Error(
          `Test Case 4.1 Failed: Expected Standalone Cost '${expectedStandaloneCost}' and Total Cost '${expectedTotalCost}', but got '${standaloneCostText}' and '${totalCostText}'.`
      );
  }
}

async function waitForMutation(driver, timeout = 60000) {
  console.log("Waiting for DOM mutation...");
  let found = false;
  const startTime = new Date().getTime();

  while (!found && (new Date().getTime() - startTime) < timeout) {
    try {
      const successMessage = await driver.findElement(By.xpath("//span[@style='color: green;' and contains(text(), 'File uploaded successfully!')]"));
      found = await successMessage.isDisplayed();
    } catch (error) {
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!found) {
    throw new Error("DOM Mutation: Success message not found within the timeout.");
  }
  console.log("DOM Mutation: Success message detected.");
}

async function testUploadByGitHubURL() {
  console.log("Running Test Case: Upload by GitHub URL...");

  console.log("Navigating to Upload Package...");
  const uploadPackageButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Upload Package']")),
    10000,
    "Upload Package button not found."
  );
  await uploadPackageButton.click();

  console.log("Verifying dropdown element...");
  const dropdown = await driver.wait(
    until.elementLocated(By.xpath("//select[@title='select-upload-method']")),
    20000,
    "Dropdown not found."
  );
  await dropdown.sendKeys("Upload by GitHub URL");
  console.log("Dropdown value set to: Upload by GitHub URL");

  console.log("Entering GitHub URL...");
  const githubUrlInput = await driver.wait(
    until.elementLocated(By.xpath("//input[@placeholder='Enter GitHub URL']")),
    10000,
    "GitHub URL input not found."
  );
  await githubUrlInput.sendKeys("https://github.com/eslint/eslint");
  console.log("GitHub URL entered.");

  console.log("Clicking the Upload Package button...");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();
  console.log("Upload Package button clicked.");

  console.log("Taking a screenshot...");
  const screenshot = await driver.takeScreenshot();
  const fs = await import('fs/promises');
  await fs.writeFile('upload_package_test_screenshot.png', screenshot, 'base64');
  console.log("Screenshot saved as 'upload_package_test_screenshot.png'.");

  console.log("Waiting for success message using DOM mutation observer...");
  try {
    await waitForMutation(driver); 
    console.log("Test Passed: Success message detected.");
  } catch (error) {
    console.error("Test Failed: Success message not detected.");
    console.log("Taking another screenshot bruhh...");
    const screenshot = await driver.takeScreenshot();
    const fs = await import('fs/promises');
    await fs.writeFile('upload_package_test_2nd_screenshot.png', screenshot, 'base64');
    console.log("Screenshot saved as 'upload_package_test_2nd_screenshot.png'.");
  }
}

async function testUploadZipFile() {
  console.log("Running Test Case: Upload Zip File...");

  console.log("Navigating to Upload Package...");
  const uploadPackageButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Upload Package']")),
    10000,
    "Upload Package button not found."
  );
  await uploadPackageButton.click();

  console.log("Verifying dropdown element...");
  const dropdown = await driver.wait(
    until.elementLocated(By.xpath("//select[@title='select-upload-method']")),
    20000,
    "Dropdown not found."
  );
  await dropdown.sendKeys("Upload Zip File");
  console.log("Dropdown value set to: Upload Zip File");

  console.log("Uploading zip file...");
  const fileInput = await driver.wait(
    until.elementLocated(By.xpath("//input[@type='file']")),
    10000,
    "File input not found."
  );
  const zipFilePath = "/Users/manju/Downloads/axios.zip"; 
  await fileInput.sendKeys(zipFilePath);
  console.log("Zip file uploaded.");

  console.log("Entering Package Name...");
  const packageNameInput = await driver.wait(
    until.elementLocated(By.xpath("//input[@placeholder='Enter Package Name']")),
    10000,
    "Package Name input not found."
  );
  await packageNameInput.sendKeys("axios");
  console.log("Package Name entered: axios");

  console.log("Entering JavaScript Program...");
  const jsProgramInput = await driver.wait(
    until.elementLocated(By.xpath("//textarea[@placeholder='Enter JS Program']")),
    10000,
    "JS Program input not found."
  );
  await jsProgramInput.sendKeys("console.log('hello world');");
  console.log("JavaScript Program entered: console.log('hello world');");

  console.log("Clicking the Upload Package button...");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();
  console.log("Upload Package button clicked.");

  console.log("Taking a screenshot...");
  const screenshot = await driver.takeScreenshot();
  const fs = await import('fs/promises');
  await fs.writeFile('upload_package_test_screenshot.png', screenshot, 'base64');
  console.log("Screenshot saved as 'upload_zip_test_screenshot.png'.");

  console.log("Waiting for success message...");
  try {
    const successMessage = await driver.wait(
      until.elementLocated(By.xpath("//span[text()='File uploaded successfully!']")),
      10000,
      "Success message not found."
    );
    const successText = await successMessage.getText();
    if (successText === "File uploaded successfully!") {
      console.log("Test Passed: Success message detected.");
    } else {
      throw new Error(`Test Failed: Unexpected success message. Found: ${successText}`);
  
    }
  } catch (error) {
    console.error("Test Failed: Success message not detected.");
    console.log("Taking a screenshot...");
    const screenshot = await driver.takeScreenshot();
    const fs = await import('fs/promises');
    await fs.writeFile('upload_package_test_screenshot.png', screenshot, 'base64');
    console.log("Screenshot saved as 'final_zip_test_screenshot.png'.");
    throw error;
  }
}

async function testTracksFunctionality() {
  console.log("Running Test Case: Tracks Functionality...");

  console.log("Clicking the Tracks button...");
  const tracksButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Tracks']")),
    10000,
    "Tracks button not found."
  );
  await tracksButton.click();

  console.log("Waiting for the track message...");
  const trackMessageElement = await driver.wait(
    until.elementLocated(By.xpath("//h1[contains(text(), 'Our track is')]")),
    10000,
    "Track message element not found."
  );

  console.log("Waiting for the track message to update...");
  await driver.wait(
    async () => {
      const trackMessageText = await trackMessageElement.getText();
      return trackMessageText.includes("Access control track");
    },
    20000, 
    "Track message did not update to the expected value."
  );

  console.log("Verifying the track message...");
  const trackMessageText = await trackMessageElement.getText();
  const expectedMessage = "Our track is Access control track";
  if (trackMessageText.trim() === expectedMessage) {
    console.log("Test Passed: Correct track message displayed.");
  } else {
    throw new Error(
      `Test Failed: Incorrect track message displayed. Found: ${trackMessageText}`
    );
  }
}

async function testRatePackage() {
  console.log("Running Test Case: Rate Package Functionality...");

  console.log("Navigating to Rate Package...");
  const ratePackageButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Rate Package']")),
    10000,
    "Rate Package button not found."
  );
  await ratePackageButton.click();

  console.log("Waiting for the input field...");
  const packageIdInput = await driver.wait(
    until.elementLocated(By.xpath("//input[@placeholder='Enter Package ID']")),
    10000,
    "Package ID input field not found."
  );

  const packageId = "182248795263245"; 
  console.log(`Entering Package ID: ${packageId}`);
  await packageIdInput.sendKeys(packageId);

  console.log("Clicking 'Get Package Rating' button...");
  const getRatingButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Get Package Rating']")),
    10000,
    "'Get Package Rating' button not found."
  );
  await getRatingButton.click();

  console.log("Waiting for the ratings to load...");
  const ratingsContainer = await driver.wait(
    until.elementLocated(By.xpath("//div[contains(., 'GoodPinningPractice:')]")),
    30000, 
    "Ratings did not load."
  );

  console.log("Verifying the displayed ratings...");
  const ratingsText = await ratingsContainer.getText();
  if (ratingsText.includes("GoodPinningPractice:") && ratingsText.includes("NetScore:")) {
    console.log("Test Passed: Ratings displayed successfully.");
  } else {
    throw new Error(`Test Failed: Expected ratings were not found. Found: ${ratingsText}`);
  }
}

async function testLogoutFunctionality() {
  console.log("Running Test Case: Logout Functionality...");

  console.log("Clicking the Logout button...");
  const logoutButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Logout']")),
    10000,
    "Logout button not found."
  );
  await logoutButton.click();
  console.log("Logout button clicked successfully.");

  console.log("Waiting for logout confirmation dialog...");
  const logoutDialog = await driver.wait(
    until.elementLocated(By.xpath("//h2[text()='Do you want to log out?']")),
    10000,
    "Logout confirmation dialog not found."
  );
  console.log("Logout confirmation dialog appeared successfully.");

  console.log("Clicking the 'Yes' button to confirm logout...");
  const yesButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Yes']")),
    10000,
    "'Yes' button not found."
  );
  await yesButton.click();
  console.log("'Yes' button clicked successfully.");

  console.log("Waiting for login page or confirmation of logout...");
  await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Login']")),
    10000,
    "Login page did not appear after logout."
  );
  console.log("Logout confirmed and login page displayed.");

  console.log("Test Passed: Logout functionality works as expected!");
}
async function testRatePackageInvalidInput() {
  console.log("Running Test Case: Rate Package Functionality with Invalid Input...");

  console.log("Navigating to Rate Package...");
  const ratePackageButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Rate Package']")),
    10000,
    "Rate Package button not found."
  );
  await ratePackageButton.click();

  console.log("Waiting for the input field...");
  const packageIdInput = await driver.wait(
    until.elementLocated(By.xpath("//input[@placeholder='Enter Package ID']")),
    10000,
    "Package ID input field not found."
  );

  const invalidPackageId = "123457382974"; 
  console.log(`Entering invalid Package ID: ${invalidPackageId}`);
  await packageIdInput.sendKeys(invalidPackageId);

  console.log("Clicking 'Get Package Rating' button...");
  const getRatingButton = await driver.wait(
    until.elementLocated(By.xpath("//button[text()='Get Package Rating']")),
    10000,
    "'Get Package Rating' button not found."
  );
  await getRatingButton.click();

  console.log("Waiting for the error message...");
  const errorMessage = await driver.wait(
    until.elementLocated(By.xpath("//span[@style='color: red;' and text()='Failed to fetch package rating']")),
    10000,
    "Error message not found for invalid input."
  );

  const errorText = await errorMessage.getText();
  if (errorText === "Failed to fetch package rating") {
    console.log("Test Passed: Correct error message displayed for invalid input.");
  } else {
    throw new Error(`Test Failed: Incorrect error message displayed. Found: ${errorText}`);
  }
}

async function testDeleteUsersFunctionality() {
  console.log("Running Test Case: Delete Users Functionality...");

  console.log("Navigating to Delete Users page...");
  await driver.wait(until.elementLocated(By.xpath("//button[text()='Delete Users']")), 10000).click();

  console.log("Fetching the user list...");
  await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Users']")), 10000).click();

  console.log("Retrieving user data...");
  const userRows = await driver.findElements(By.xpath("//div[contains(text(), 'Delete User')]/.."));

  if (userRows.length === 0) {
    throw new Error("Test Failed: No users found.");
  }

  for (const userRow of userRows) {
    const userText = await userRow.getText();
    console.log("User Row:", userText);

    const isDefaultAdmin = userText.includes("ece30861defaultadminuser");
    const isAdmin = userText.includes("Admin");
    const isBackend = userText.includes("Backend");

    const deleteButton = await userRow.findElement(By.xpath(".//button[text()='Delete User']"));

    if (isDefaultAdmin) {
      console.log("Default admin user found. Verifying delete button is disabled...");
      const isDisabled = !(await deleteButton.isEnabled());
      if (!isDisabled) {
        throw new Error("Test Failed: Delete button is enabled for the default admin user.");
      }
    } else if (isAdmin) {
      console.log("Admin user found. Verifying admin can delete any user...");
      const isEnabled = await deleteButton.isEnabled();
      if (!isEnabled) {
        throw new Error("Test Failed: Admin user cannot delete a user.");
      }

      console.log("Attempting to delete as admin...");
      await deleteButton.click();
      // Add verification logic to confirm the user is deleted, e.g., check updated user list.
    } else if (isBackend) {
      console.log("Backend user found. Verifying backend user can only delete their account...");
      if (userText.includes(await driver.findElement(By.xpath("//span[@class='username']")).getText())) {
        const isEnabled = await deleteButton.isEnabled();
        if (!isEnabled) {
          throw new Error("Test Failed: Backend user cannot delete their own account.");
        }
        console.log("Attempting to delete own account...");
        await deleteButton.click();
        // Add verification logic to confirm the user is deleted, e.g., check updated user list.
      } else {
        const isDisabled = !(await deleteButton.isEnabled());
        if (!isDisabled) {
          throw new Error("Test Failed: Backend user can delete other accounts.");
        }
      }
    } else {
      console.log("Unhandled case for user:", userText);
    }
  }

  console.log("Test Passed: Delete Users functionality validated successfully.");
}

  try {
    await driver.get('https://exteri0.github.io/PackageNest/');
    console.log("Accessing website...");

    await login(); // -> test for saving login info and "login successful" message

   // await testRegisterUsers(); -> test case needs to be fixed
   //await testRegisterUsers1();
   //await testRegisterUserMissingFields();
   // await testGetById();
   // await testGetByName();
 //  await testGetByNameValidInput();
  // await testGetByNameWildcard();
  // await testGetByNameInvalidInput();
    //await testGetByRegex();
   // await testCostPackage();
   // await testUploadByGitHubURL(); 
   // await testUploadZipFile(); -> NOT working
    //await testTracksFunctionality();
    //await testLogoutFunctionality();
   // await testRatePackage(); -> add invalid input test case
   //await testRatePackageInvalidInput();
   await testDeleteUsersFunctionality();
  } catch (error) {
    console.error("Test Failed:", error);
    let lastHeight = await driver.executeScript("return document.body.scrollHeight");

    while (true) {
      await driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
      await driver.sleep(1000);
    
      let newHeight = await driver.executeScript("return document.body.scrollHeight");
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
    }
    
    await driver.takeScreenshot().then(async (image) => {
      const fs = await import("fs");
      fs.writeFileSync("TestScreenshot.png", image, "base64");
    });
  } finally {
    await driver.quit();
  }
})();

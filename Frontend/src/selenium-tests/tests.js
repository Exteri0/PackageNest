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

  async function login() {
    console.log("Logging in...");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Login']")), 10000).click();
    await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Username']")), 10000).sendKeys('ece30861defaultadminuser');
    await driver.wait(until.elementLocated(By.xpath("//input[@placeholder='Password']")), 10000).sendKeys("correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Submit']")), 10000).click();
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
    await adminToggle.click(); // Toggle Admin ON
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
    // Wait for the package card to render
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

  async function testGetByName() {
    console.log("Navigating to Get Package...");
    await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();

    console.log("Selecting 'Get by Name'...");
    let dropdown = await driver.wait(until.elementLocated(By.css("select.dropdown")), 10000);
    await dropdown.sendKeys("Get by Name");

    // Case 1: Valid package details with offset = 0
    console.log("Running Test Case 2.1: Valid package with offset 0...");
    await driver.wait(until.elementLocated(By.css("input[placeholder='Enter package Offset...']")), 10000).sendKeys("0");
    await driver.wait(until.elementLocated(By.css("input[placeholder='Enter package name...']")), 10000).sendKeys("cross-fetch");
    await driver.wait(until.elementLocated(By.css("input[placeholder='Enter package version...']")), 10000).sendKeys("4.0.0");
    await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

    console.log("Verifying result for offset 0...");
    try {
        let resultCard = await driver.wait(until.elementLocated(By.css("div.package-card")), 10000);

        let packageName = await resultCard.findElement(By.xpath(".//h3")).getText();
        let versionElement = await resultCard.findElement(By.xpath(".//p[contains(text(), 'Version:')]"));
        let versionText = (await versionElement.getText()).trim();
        let versionNumber = versionText.split(":")[1].trim();

        if (packageName === "cross-fetch" && versionNumber === "4.0.0") {
            console.log("Test Case 2.1 Passed: Correct package returned.");
        } else {
            throw new Error("Test Case 2.1 Failed: Incorrect package details.");
        }
    } catch (error) {
        console.error("Test Case 2.1 Failed: Error verifying package details -", error.message);
    }

    // Case 2: Valid package details with offset = 1 (no result expected)
    console.log("Running Test Case 2.2: Valid package with offset 1...");
    await driver.findElement(By.css("input[placeholder='Enter package Offset...']")).clear();
    await driver.findElement(By.css("input[placeholder='Enter package Offset...']")).sendKeys("1");
    await driver.findElement(By.css("input[placeholder='Enter package name...']")).clear();
    await driver.findElement(By.css("input[placeholder='Enter package name...']")).sendKeys("cross-fetch");
    await driver.findElement(By.css("input[placeholder='Enter package version...']")).clear();
    await driver.findElement(By.css("input[placeholder='Enter package version...']")).sendKeys("4.0.0");
    await driver.findElement(By.css("button.action-buttons")).click();

    console.log("Verifying result for offset 1...");
    let noResult = await driver.findElements(By.css("div.package-card"));
    if (noResult.length === 0) {
        console.log("Test Case 2.2 Passed: No package returned as expected.");
    } else {
        console.error("Test Case 2.2 Failed: Unexpected package returned.");
    }

    // Case 3: Fetch all packages with "*" as name and valid offset/version
    console.log("Running Test Case 2.3: Fetch all packages with '*'...");
    await driver.findElement(By.css("input[placeholder='Enter package Offset...']")).clear();
    await driver.findElement(By.css("input[placeholder='Enter package Offset...']")).sendKeys("0");
    await driver.findElement(By.css("input[placeholder='Enter package name...']")).clear();
    await driver.findElement(By.css("input[placeholder='Enter package name...']")).sendKeys("*");
    await driver.findElement(By.css("input[placeholder='Enter package version...']")).clear();
    await driver.findElement(By.css("input[placeholder='Enter package version...']")).sendKeys("4.0.0");
    await driver.findElement(By.css("button.action-buttons")).click();

    console.log("Verifying result for '*'...");
    let allPackages = await driver.findElements(By.css("div.package-card"));
    if (allPackages.length > 0) {
        console.log(`Test Case 2.3 Passed: ${allPackages.length} packages returned.`);
    } else {
        console.error("Test Case 2.3 Failed: No packages returned for '*'.");
    }
}
async function testGetByRegex() {
  console.log("Navigating to Get Package...");
  await driver.wait(until.elementLocated(By.xpath("//button[text()='Get Package']")), 10000).click();

  console.log("Selecting 'Get by REGEX'...");
  let dropdown = await driver.wait(until.elementLocated(By.css("select.dropdown")), 10000);
  await dropdown.sendKeys("Get by REGEX");

  // Case 1: Valid REGEX returning multiple results
  console.log("Running Test Case 3.1: Valid REGEX returning multiple results...");
  await driver.wait(until.elementLocated(By.css("input[placeholder='Enter package regex...']")), 10000).sendKeys("cross");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

  console.log("Verifying multiple results...");
  let resultCards = await driver.findElements(By.css("div.package-card"));
  if (resultCards.length >= 2) {
      console.log(`Test Case 3.1 Passed: Found ${resultCards.length} matching packages.`);
  } else {
      throw new Error("Test Case 3.1 Failed: Did not find multiple results.");
  }

  // Case 2: Valid REGEX returning a single result
  console.log("Running Test Case 3.2: Valid REGEX returning a single result...");
  await driver.findElement(By.css("input[placeholder='Enter package regex...']")).clear();
  await driver.findElement(By.css("input[placeholder='Enter package regex...']")).sendKeys("cross-fetch$");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

  console.log("Verifying single result...");
  resultCards = await driver.findElements(By.css("div.package-card"));
  if (resultCards.length === 1) {
      console.log("Test Case 3.2 Passed: Single matching package found.");
  } else {
      throw new Error("Test Case 3.2 Failed: Incorrect number of packages returned.");
  }

  // Case 3: Invalid REGEX returning no results
  console.log("Running Test Case 3.3: Invalid REGEX returning no results...");
  await driver.findElement(By.css("input[placeholder='Enter package regex...']")).clear();
  await driver.findElement(By.css("input[placeholder='Enter package regex...']")).sendKeys("xyz.*");
  await driver.wait(until.elementLocated(By.css("button.action-buttons")), 10000).click();

  console.log("Verifying no results...");
  resultCards = await driver.findElements(By.css("div.package-card"));
  if (resultCards.length === 0) {
      console.log("Test Case 3.3 Passed: No packages returned as expected.");
  } else {
      throw new Error("Test Case 3.3 Failed: Unexpected packages returned.");
  }
}

  
  
  try {
    // Step 1: Open the target website
    await driver.get('https://exteri0.github.io/PackageNest/');
    console.log("Accessing website...");

    // Step 2: Perform Login
    await login();

    // Step 3: Run Test Cases
    await testRegisterUsers();
    await testGetById();
    await testGetByName();
   // await testGetByRegex();
  } catch (error) {
    console.error("Test Failed:", error);

    // Take a debug screenshot for troubleshooting
    await driver.takeScreenshot().then(async (image) => {
      const fs = await import('fs');
      fs.writeFileSync('TestScreenshot.png', image, 'base64');
    });
  } finally {
    await driver.quit();
  }
})();

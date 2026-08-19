const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Wait 2.5 seconds to ensure Webpack completely exits and the OS write cache is fully flushed
setTimeout(() => {
  try {
    const dirPath = __dirname;
    const buildDir = path.join(dirPath, 'build');
    const buildZipPath = path.join(dirPath, 'build.zip');
    const laundryZipPath = path.join(dirPath, 'laundry.zip');
    const frontendZipPath = path.join(dirPath, 'frontend.zip');

    console.log('Clearing old zip files...');
    if (fs.existsSync(buildZipPath)) fs.unlinkSync(buildZipPath);
    if (fs.existsSync(laundryZipPath)) fs.unlinkSync(laundryZipPath);
    if (fs.existsSync(frontendZipPath)) fs.unlinkSync(frontendZipPath);

    console.log('Zipping build folder to build.zip...');
    execSync(`powershell -Command "Compress-Archive -Path '${buildDir}\\*' -DestinationPath '${buildZipPath}' -Force"`);
    console.log('Successfully created build.zip!');

    console.log('Zipping build folder to laundry.zip...');
    execSync(`powershell -Command "Compress-Archive -Path '${buildDir}\\*' -DestinationPath '${laundryZipPath}' -Force"`);
    console.log('Successfully created laundry.zip!');

    console.log('Zipping frontend folder to frontend.zip (excluding node_modules)...');
    execSync(`powershell -Command "Get-ChildItem -Path '${dirPath}\\*' -Exclude node_modules,*.zip | Compress-Archive -DestinationPath '${frontendZipPath}' -Force"`);
    console.log('Successfully created frontend.zip!');

  } catch (e) {
    console.error('Failed to create zip archives:', e.message);
  }
}, 2500);

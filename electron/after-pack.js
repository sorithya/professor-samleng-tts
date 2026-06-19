const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  
  // Try macOS path structure first
  // E.g., appOutDir/productName.app/Contents/Resources/nextapp/.next/standalone
  const productName = context.packager.appInfo.productName;
  let standalonePath = path.join(
    appOutDir,
    `${productName}.app`,
    'Contents',
    'Resources',
    'nextapp',
    '.next',
    'standalone'
  );
  
  if (!fs.existsSync(standalonePath)) {
    // Try Windows/Linux path structure
    // E.g., appOutDir/resources/nextapp/.next/standalone
    standalonePath = path.join(
      appOutDir,
      'resources',
      'nextapp',
      '.next',
      'standalone'
    );
  }
  
  console.log(`[AfterPack] Checking standalone path: ${standalonePath}`);
  
  if (fs.existsSync(standalonePath)) {
    // Next.js might mirror the project path inside standalone directory (e.g. standalone/C/Users/... or standalone/Users/runner/...)
    // So we search recursively for standalone_node_modules and standalone_next inside the standalone directory.
    function renameRecursive(dir, depth = 0) {
      if (depth > 10) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (entry.name === 'standalone_node_modules') {
            const destPath = path.join(dir, 'node_modules');
            console.log(`[AfterPack] Restoring ${fullPath} -> ${destPath}`);
            if (fs.existsSync(destPath)) {
              fs.rmSync(destPath, { recursive: true, force: true });
            }
            fs.renameSync(fullPath, destPath);
          } else if (entry.name === 'standalone_next') {
            const destPath = path.join(dir, '.next');
            console.log(`[AfterPack] Restoring ${fullPath} -> ${destPath}`);
            if (fs.existsSync(destPath)) {
              fs.rmSync(destPath, { recursive: true, force: true });
            }
            fs.renameSync(fullPath, destPath);
          } else {
            renameRecursive(fullPath, depth + 1);
          }
        }
      }
    }
    
    renameRecursive(standalonePath);
  } else {
    console.warn(`[AfterPack] Standalone path not found at: ${standalonePath}`);
  }
};

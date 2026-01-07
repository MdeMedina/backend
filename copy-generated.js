const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const src = path.join(__dirname, 'generated');
const dest = path.join(__dirname, 'dist', 'generated');

if (fs.existsSync(src)) {
  copyDir(src, dest);
  console.log('✅ Directorio generated copiado a dist');
} else {
  console.log('⚠️  Directorio generated no encontrado');
}


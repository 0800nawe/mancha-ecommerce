import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// Eliminación preventiva y definitiva de archivos de imagen redundantes en la raíz
const redundantRootImages = ['cerdo.jpg', 'hero.jpg', 'pack-chico.jpg', 'pack-grande.jpg', 'pollo.png'];
redundantRootImages.forEach((filename) => {
  const redundantPath = path.join(__dirname, filename);
  if (fs.existsSync(redundantPath)) {
    try {
      fs.unlinkSync(redundantPath);
      console.log(`[Clean] Archivo redundante eliminado de la raíz: ${filename}`);
    } catch (err) {
      console.error(`[Error] No se pudo eliminar ${filename}:`, err.message);
    }
  }
});

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico']);

const server = http.createServer((req, res) => {
  const reqUrl = req.url.split('?')[0];
  const decodedPath = decodeURIComponent(reqUrl);

  // Normalizar ruta para evitar path traversal
  const safeRelativePath = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');
  const isRoot = safeRelativePath === '/' || safeRelativePath === '\\' || safeRelativePath === '';
  const relativeFile = isRoot ? 'index.html' : safeRelativePath.replace(/^[\\\/]/, '');
  const filePath = path.join(__dirname, relativeFile);

  // Seguridad: Asegurar que el archivo resuelto esté dentro de __dirname
  if (!filePath.toLowerCase().startsWith(__dirname.toLowerCase())) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  let resolvedFilePath = filePath;
  const ext = path.extname(filePath).toLowerCase();

  // Regla: Los assets de imagen estáticos se sirven desde /Images/
  if (imageExtensions.has(ext)) {
    const imagesDir = path.join(__dirname, 'Images');
    if (!resolvedFilePath.toLowerCase().startsWith(imagesDir.toLowerCase())) {
      const fallbackName = path.basename(resolvedFilePath);
      const fallbackPath = path.join(imagesDir, fallbackName);
      const fallbackPng = path.join(imagesDir, fallbackName.replace(/\.jpe?g$/i, '.png'));
      if (fs.existsSync(fallbackPath)) {
        resolvedFilePath = fallbackPath;
      } else if (fs.existsSync(fallbackPng)) {
        resolvedFilePath = fallbackPng;
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found - Las imágenes estáticas solo se sirven desde la carpeta /Images/');
        return;
      }
    }
  }

  fs.stat(resolvedFilePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const contentType = mimeTypes[path.extname(resolvedFilePath).toLowerCase()] || 'application/octet-stream';

    fs.readFile(resolvedFilePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Assets de imágenes configurados exclusivamente desde: ./Images/`);
});

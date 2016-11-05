
export const basePath = process.cwd();

export function getRelative(filePath) {
  return filePath.replace(basePath, '');
}

export function getNoRooted(filePath) {
  return filePath.replace(/^\//, '');
}

export function getMeteorPath(filePath) {
  filePath = getRelative(filePath);
  filePath = getNoRooted(filePath);
  return filePath;
};

export function removeTsExtension(filePath) {
  return filePath.replace('.ts', '');
}

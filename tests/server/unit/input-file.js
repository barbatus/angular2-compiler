const path = Npm.require('path');
const crypto = Npm.require('crypto');

function sha1(content) {
  let hash = crypto.createHash('sha1');
  hash.update(content);
  return hash.digest('hex');
}

InputFile = class InputFile {
  constructor(source, fileName, arch = 'web') {
    this.source = source;
    this.fileName = fileName;
    this.result = null;
    this.arch = arch;
    this.options = {};
  }

  getContentsAsString() {
    return this.source;
  }

  getContentsAsBuffer() {
    return Buffer.from(this.source);
  }

  getPackageName() {
    return null;
  }

  getPathInPackage() {
    return this.fileName;
  }

  getDisplayPath() {
    return this.fileName;
  }

  getBasename() {
    return this.fileName;
  }

  getExtension() {
    return path.extname(this.fileName).substr(1);
  }

  getFileOptions() {
    return this.options;
  }

  getSourceHash() {
    return sha1(this.getContentsAsString());
  }

  addJavaScript(result) {
    this.result = result;
  }

  addStylesheet(result) {
    this.result = result;
  }

  addAsset(asset) {}

  getArch() {
    return this.arch;
  }

  warn(error) {
    this.error = error;
  }

  error(error) {
    this.error = error;
  }
}

ConfigFile = class ConfigFile extends InputFile {
  constructor(config, path = 'tsconfig.json', arch = 'web') {
    super(JSON.stringify(config), path, arch);
    for (let key in config) {
      this[key] = config[key];
    }
  }

  getContentsAsString() {
    return JSON.stringify(this);
  }
}

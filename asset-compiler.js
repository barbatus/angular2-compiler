'use strict';

const STATIC_ASSET = /(\.html|\.html\.ts|\.less|\.less\.ts)$/;

function clean(src) {
  return JSON.stringify(src)
    .replace(/^\"/, '')
    .replace(/\"$/, '');
}

export const isHtml = filePath => /\.html$/.test(filePath);

export const isAsset = filePath => STATIC_ASSET.test(filePath);

const genExportName = filePath => isHtml(filePath) ? 'template' : 'style';

function exportAsset(filePath, content) {
  const exportName = genExportName(filePath);
  return `export const ${exportName} = "${clean(content)}";`;
}

export function getEmptyAssetEs6Module(filePath) {
  const exportName = genExportName(filePath);
  return `export const ${exportName} = "";`;
}

class HtmlCompiler {
  constructor(addCompileResult) {
    this.addCompileResult = addCompileResult;
  }

  processFilesForTarget(files) {
    let htmlFiles = files.filter(file => {
      const path = file.getPathInPackage();
      return isHtml(path);
    });
    htmlFiles.forEach(htmlFile => {
      const html = htmlFile.getContentsAsString();
      this.addCompileResult(htmlFile, { html });
    });
  }
};

export class AssetCompiler {
  constructor() {
    this.assetMap = new Map();
    this.cssc = new StyleCompiler((inputFile, result) => {
      const path = inputFile.getPathInPackage();
      this.assetMap.set(path, result.css);
    });
    this.htmlc = new HtmlCompiler((inputFile, result) => {
      const path = inputFile.getPathInPackage();
      this.assetMap.set(path, result.html);
    });
  }

  processFilesForTarget(inputFiles) {
    this.cssc.processFilesForTarget(inputFiles);
    this.htmlc.processFilesForTarget(inputFiles);
  }

  getAssetES6Module(filePath) {
    const code = this.assetMap.get(filePath);
    if (code) {
      return exportAsset(filePath, code);
    }
    return null;
  }
}

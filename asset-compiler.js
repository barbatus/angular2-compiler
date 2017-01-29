const STATIC_ASSET = /(\.html|\.html\.ts|\.less|\.less\.ts|\.scss|\.scss\.ts)$/;

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
  return `
    const ${exportName} = "${clean(content)}";
    export default ${exportName};
  `;
}

export function getEmptyAssetEs6Module(filePath) {
  const exportName = genExportName(filePath);
  return `
    const ${exportName} = "";
    export default ${exportName};
  `;
}

class TemplateCompiler {
  constructor(addCompileResult) {
    this.addCompileResult = addCompileResult;
    this.shc = new StaticHtmlCompiler(null, )
  }

  processFilesForTarget(htmlFiles) {
    htmlFiles.forEach(htmlFile => {
      const html = htmlFile.getContentsAsString();
      this.addCompileResult(htmlFile, { html });
    });
  }
};

const babelOptions = Babel.getDefaultOptions();
babelOptions.sourceMap = false;
babelOptions.ast = false;

export class AssetCompiler {
  constructor() {
    this.assetMap = new Map();
    this.cssc = new StyleCompiler((inputFile, result) => {
      const path = inputFile.getPathInPackage();
      this.assetMap.set(path, result.css);

      this.addJSModule(inputFile);
    });
    this.htmlc = new StaticHtmlCompiler(
      null /* process by default main html */,
      new TemplateCompiler((inputFile, result) => {
        const path = inputFile.getPathInPackage();
        this.assetMap.set(path, result.html);

        this.addJSModule(inputFile);
      })
    );
  }

  processFilesForTarget(inputFiles) {
    this.cssc.processFilesForTarget(inputFiles);

    const htmlFiles = inputFiles.filter(file => {
      const path = file.getPathInPackage();
      return isHtml(path);
    });
    this.htmlc.processFilesForTarget(htmlFiles);
  }

  getAssetES6Module(filePath) {
    const code = this.assetMap.get(filePath);
    if (code) {
      return exportAsset(filePath, code);
    }
    return null;
  }

  addJSModule(inputFile) {
    const path = inputFile.getPathInPackage();
    const es6Mod = this.getAssetES6Module(path);
    const data = Babel.compile(es6Mod, babelOptions).code;
    inputFile.addJavaScript({data, path, lazy: true});
  }
}

import 'reflect-metadata';

const async = Npm.require('async');
const path = Npm.require('path');
const fs = Npm.require('fs');
const Future = Npm.require('fibers/future');

const ts = Npm.require('typescript');
const { TSBuild } =  Npm.require('meteor-typescript');

import {
  getMeteorPath,
  removeTsExtension,
  basePath,
} from './file-utils';

import { CodeGeneratorWrapper } from './ng-codegen';

const tcOptions = {
  baseUrl: basePath,
  experimentalDecorators: true,
  module: 'commonjs',
  target: 'es5',
  noImplicitAny: false,
  moduleResolution: 'node',
  emitDecoratorMetadata: true,
  traceResolution: false
};

const ngcOptions = {
  basePath,
  genDir: basePath,
  generateCodeForLibraries: false,
  traceResolution: false,
};

const STATIC_ASSET = /(\.html|\.html\.ts|\.less|\.less\.ts)$/;

const isHtml = filePath => /\.html$/.test(filePath);

function clean(src) {
  return JSON.stringify(src)
    .replace(/^\"/, '')
    .replace(/\"$/, '');
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

Angular2Compiler = class Angular2Compiler {
  constructor(extraTsOptions) {
    this.tsc = new TypeScriptCompiler(extraTsOptions);
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

    // Get app ts-files.
    const tsFiles = this.tsc.getFilesToProcess(inputFiles);
    const tsFilePaths = tsFiles.map(file => file.getPathInPackage());
    const defaultGet = this.getContentGetter(tsFiles);

    const { options } = ts.convertCompilerOptionsFromJson(tcOptions, '');
    const genOptions = _.extend({}, options, ngcOptions);

    const ngcFilesMap = CodeGeneratorWrapper.generate(
      tsFilePaths, genOptions, defaultGet);
    const ngcFilePaths = [];
    ngcFilesMap.forEach((value, key) => {
      ngcFilePaths.push(key);
    });

    console.log('ngcFilesMap');
    console.log(ngcFilesMap.size);

    const getContent = filePath => {
      return ngcFilesMap.get(filePath) ||
        defaultGet(filePath);
    }
    const buildOptions = this.tsc.getBuildOptions(inputFiles);
    buildOptions.compilerOptions.module = 'es2015';
    buildOptions.useCache = false;

    const allPaths = tsFilePaths.concat(ngcFilePaths);
    let tsBuild = new TSBuild(allPaths, getContent, buildOptions);
    const codeMap = new Map();
    for (const filePath of allPaths) {
      const result = tsBuild.emit(filePath, filePath);
      codeMap.set(filePath, result.code);
      console.log(filePath);
      console.log(result.diagnostics);
    }
  }

  getAssetCode(filePath) {
    filePath = removeTsExtension(getMeteorPath(filePath));
    const code = this.assetMap.get(filePath);
    if (! code) {
       throw new Error(`Asset file not found ${filePath}`);
    }
    const exportName = isHtml(filePath) ? 'template' : 'style';
    return this.buildExport(exportName, code);
  }

  buildExport(exportName, code) {
    return `export const ${exportName} = "${clean(code)}";`;
  }

  getContentGetter(inputFiles) {
    let filesMap = new Map();
    inputFiles.forEach((inputFile, index) => {
      const filePath = inputFile.getPathInPackage();
      filesMap.set(filePath, index);
    });

    return filePath => {
      filePath = getMeteorPath(filePath);
      if (STATIC_ASSET.test(filePath)) {
        return this.getAssetCode(filePath);
      }
      let index = filesMap.get(filePath);
      if (index === undefined) {
        let filePathNoRootSlash = filePath.replace(/^\//, '');
        index = filesMap.get(filePathNoRootSlash);
      }
      return index !== undefined ?
        inputFiles[index].getContentsAsString() : null;
    };
  }
}

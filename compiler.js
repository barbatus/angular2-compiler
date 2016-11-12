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

import { isAsset, AssetCompiler } from './asset-compiler';

import rollup from './rollup';

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

Angular2Compiler = class Angular2Compiler {
  constructor(extraTsOptions) {
    this.tsc = new TypeScriptCompiler(extraTsOptions);
    this.assetMap = new Map();
    this.asc = new AssetCompiler();
  }

  processFilesForTarget(inputFiles) {
    this.asc.processFilesForTarget(inputFiles);

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
    const tsBuild = new TSBuild(allPaths, getContent, buildOptions);
    const codeMap = new Map();
    for (const filePath of allPaths) {
      const result = tsBuild.emit(filePath, filePath);
      codeMap.set(removeTsExtension(filePath), result.code);
    }

    let bundle = rollup(codeMap);
    if (bundle) {
      const inputFile = tsFiles[0];
      const toBeAdded = {
        sourcePath: inputFile.getPathInPackage(),
        path: 'bundle.js',
        data: bundle
      };
      inputFile.addJavaScript(toBeAdded);
    }
  }

  getAssetModule(filePath) {
    filePath = removeTsExtension(getMeteorPath(filePath));
    const module = this.asc.getAssetES6Module(filePath);
    if (! module) {
       throw new Error(`Asset file not found ${filePath}`);
    }
    return module;
  }

  getContentGetter(inputFiles) {
    let filesMap = new Map();
    inputFiles.forEach((inputFile, index) => {
      const filePath = inputFile.getPathInPackage();
      filesMap.set(filePath, index);
    });

    return filePath => {
      filePath = getMeteorPath(filePath);

      if (isAsset(filePath)) {
        return this.getAssetModule(filePath);
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

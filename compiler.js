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

import {
  CodeGeneratorWrapper, 
  removeDynamicBootstrap,
  hasDynamicBootstrap,
} from './ng-codegen';

import {isAsset, AssetCompiler} from './asset-compiler';

import rollup from './rollup';

import Logger from './logger';

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
  generateCodeForLibraries: true,
  traceResolution: false,
};

const isWeb = arch => /^web/.test(arch);

AngularCompiler = class AngularCompiler {
  constructor(extraTsOptions) {
    this.tsc = new TypeScriptCompiler(extraTsOptions);
    this.asc = new AssetCompiler();
  }

  processFilesForTarget(inputFiles) {
    this.asc.processFilesForTarget(inputFiles);

    if (process.env.AOT) {
      const arch = inputFiles[0].getArch();
      // AoT compile and bundle for the web only currently.
      if (isWeb(arch)) {
        return this._ngcAndBundle(inputFiles, true);
      }
    }

    this.tsc.processFilesForTarget(inputFiles, filePath => {
      filePath = removeTsExtension(getMeteorPath(filePath));
      return this.asc.getAssetES6Module(filePath);
    });
  }

  _ngcAndBundle(inputFiles, forWeb) {
    // Get app ts-files.
    const tsFiles = this.tsc.getFilesToProcess(inputFiles);
    const tsFilePaths = tsFiles.map(file => file.getPathInPackage());
    const defaultGet = this._getContentGetter(tsFiles);

    const { options } = ts.convertCompilerOptionsFromJson(tcOptions, '');
    const genOptions = _.extend({}, options, ngcOptions);

    const fullPaths = tsFilePaths.map(filePath => path.join(basePath, filePath));
    let ngcError = null;
    const cgp = Logger.newProfiler('code generator');
    const { ngcFilesMap, bootstrapCode, mainModulePath } =
      CodeGeneratorWrapper.generate(fullPaths, genOptions, defaultGet)
        .catch(error => ngcError = error)
        .await();
    cgp.end();
    if (ngcError) {
      Logger.logError(ngcError.message);
      return null;
    }

    const ngcFilePaths = Array.from(ngcFilesMap.keys());
    Logger.log('generated files: %s', ngcFilePaths);

    const getContent = filePath => {
      return ngcFilesMap.get(filePath) ||
        defaultGet(filePath);
    }
    const buildOptions = this.tsc.getBuildOptions(inputFiles);
    buildOptions.compilerOptions.module = 'es2015';

    const allPaths = tsFilePaths.concat(ngcFilePaths);
    const tsBuild = new TSBuild(allPaths, getContent, buildOptions);
    const codeMap = new Map();
    const tsFilePath = allPaths.filter(
      filePath => ! TypeScript.isDeclarationFile(filePath));
    let mainCode = bootstrapCode;
    let mainCodePath = 'main.js';
    for (const filePath of tsFilePath) {
      const result = tsBuild.emit(filePath, filePath);
      this._processTsDiagnostics(result.diagnostics);
      const code = result.code;
      if (hasDynamicBootstrap(code)) {
        const moduleName = path.basename(
          removeTsExtension(mainModulePath));
        mainCode = removeDynamicBootstrap(code, moduleName);
        mainCode += `\n` + bootstrapCode;
        mainCodePath = removeTsExtension(filePath) + '.js';
        continue;
      }
      codeMap.set(removeTsExtension(filePath), code);
    }

    const tsconfig = this.tsc.tsconfig;
    const exclude = !!tsconfig.angularCompilerOptions &&
      tsconfig.angularCompilerOptions.exclude;
    const namedExports = !!tsconfig.angularCompilerOptions &&
      tsconfig.angularCompilerOptions.namedExports;
    const bundle = rollup(codeMap, mainCode, mainCodePath,
      exclude, namedExports, forWeb);
    if (bundle) {
      // Look for a ts-file in the client or server
      // folder to add generated bundle.
      const prefix = forWeb ? 'client' : 'server';
      const inputFile = tsFiles.find(file => {
          const filePath = file.getPathInPackage();
          return filePath.startsWith(prefix) && 
                 filePath.indexOf('imports') === -1;
        });
      const toBeAdded = {
        sourcePath: inputFile.getPathInPackage(),
        path: 'bundle.js',
        data: bundle
      };
      inputFile.addJavaScript(toBeAdded);
    }
  }

  _getAssetModule(filePath) {
    filePath = removeTsExtension(getMeteorPath(filePath));
    const module = this.asc.getAssetES6Module(filePath);
    if (! module) {
       throw new Error(`Asset file not found ${filePath}`);
    }
    return module;
  }

  _getContentGetter(inputFiles) {
    let filesMap = new Map();
    inputFiles.forEach((inputFile, index) => {
      const filePath = inputFile.getPathInPackage();
      filesMap.set(filePath, index);
    });

    return filePath => {
      filePath = getMeteorPath(filePath);

      if (isAsset(filePath)) {
        return this._getAssetModule(filePath);
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

  _processTsDiagnostics(diagnostics) {
    diagnostics.semanticErrors.forEach(({ fileName, line, column, message }) => {
      const msg = `${fileName} (${line}, ${column}): ${message}`;
      Logger.logWarning(msg);
    });
  }
}

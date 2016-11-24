'use strict';

import 'reflect-metadata';

const path = Npm.require('path');
const ts = Npm.require('typescript');

const { NgModule } = Npm.require('@angular/core');

const {
  ReflectorHost,
  StaticReflector,
  CodeGenerator,
} = Npm.require('@angular/compiler-cli');

import {
  removeTsExtension,
  getMeteorPath,
  getFullPath,
  isRooted,
  basePath,
} from './file-utils';

const ngCompilerOptions = {
  transitiveModules: true
};

function resolveModuleNames(ngcOptions, ngcHost) {
  return (filePaths, containingFile) => {
    return filePaths.map(filePath => {
      if (STATIC_ASSET.test(filePath)) {
        const dirPath = ts.getDirectoryPath(containingFile);
        return {
          resolvedFileName: path.join(dirPath, filePath),
          isExternalLibraryImport: false
        }
      }
      const resolved = ts.resolveModuleName(
        filePath, containingFile, ngcOptions, ngcHost);
      return resolved.resolvedModule;
    });
  }
}

function getNgcHost(ngcOptions, getFileContent) {
  const defaultHost = ts.createCompilerHost(ngcOptions, true);
  const customHost = {
    getSourceFile: (filePath, languageVersion, onError) => {
      const content = getFileContent(filePath);
      if (content) {
        return ts.createSourceFile(filePath, content, languageVersion, true); 
      }
      return defaultHost.getSourceFile(filePath, languageVersion, onError);
    },
    realpath: filePath => filePath,
    fileExists: filePath => {
      const exists = defaultHost.fileExists(filePath);
      return exists || !!getFileContent(filePath);
    },
    directoryExists: dirName => {
      const exists = defaultHost.directoryExists(dirName);
      return exists || !!getFileContent(path.join(dirName, 'index.ts'));
    },
    trace: msg => {
      console.log(msg);
    },
  };

  const ngcHost = _.extend({}, defaultHost, customHost);
  return ngcHost;
}

function getNgcProgram(filePaths, ngcOptions, ngcHost) {
  const program = ts.createProgram(filePaths, ngcOptions, ngcHost);
  const getSourceFile = program.getSourceFile;
  program.getSourceFile = filePath => {
    let sf = getSourceFile.call(this, filePath);
    if (sf) return sf;

    filePath = getMeteorPath(filePath);
    return getSourceFile.call(this, filePath);
  };

  return program;
}

function getNgcReflectorContext(ngcHost) {
  const assumedExists = {};
  let reflectorContext = {
    fileExists(filePath) {
      return assumedExists[filePath] || ngcHost.fileExists(filePath);
    },
    assumeFileExists(filePath) {
      assumedExists[filePath] = true;
    }
  }
  return _.extend({}, ngcHost, reflectorContext);
}

function genBootstrapCode(moduleFilePath) {
  const path = removeTsExtension(moduleFilePath);
  return `
    import {platformBrowser} from '@angular/platform-browser';
    import {AppModuleNgFactory} from './${path}.ngfactory';
    platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
  `;
}

export function removeDynamicBootstrap(code) {
  if (code.indexOf('platformBrowserDynamic') !== -1) {
    return code
      .replace(/(import\s*{[^{]*platformBrowserDynamic[^}]*})/, '//\$1')
      .replace(/(platformBrowserDynamic\(\))/, '//\$1');
  }
  return code;
}

export class CodeGeneratorWrapper {
  static generate(filePaths, ngcOptions, getMeteorFileContent) {
    const host = getNgcHost(ngcOptions, getMeteorFileContent);
    const program = getNgcProgram(filePaths, ngcOptions, host);
    const context = getNgcReflectorContext(host);

    const codegen = CodeGenerator.create(ngcOptions, {}, program, host, context);

    this.patchReflectorHost(codegen.reflectorHost);

    const ngModulesMap = extractNgModules(
      program, codegen.staticReflector, codegen.reflectorHost);
    const staticSymbols = [];
    const ngModules = [];
    ngModulesMap.forEach((ngModule, symb) => {
      staticSymbols.push(symb);
      ngModules.push(ngModule);
    });

    const ngcFilesMap = new Map();
    const compiler = codegen.compiler;
    compiler.compileModules(staticSymbols, ngCompilerOptions)
      .then((generatedModules) => {
        generatedModules.forEach((generatedModule) => {
          const filePath = getMeteorPath(generatedModule.moduleUrl);
          ngcFilesMap.set(filePath, generatedModule.source);
        });
      })
      .await();

    const bootModule = findBootstrapModule(ngModules);
    let bootstrapCode = null;
    ngModulesMap.forEach((ngModule, symb) => {
      if (bootModule === ngModule) {
        const path = getMeteorPath(symb.filePath);
        bootstrapCode = genBootstrapCode(path);
      }
    });

    return { ngcFilesMap, bootstrapCode };
  }

  static patchReflectorHost(reflectorHost) {
    const findDeclaration = reflectorHost.findDeclaration;
    reflectorHost.findDeclaration = (module, symbolName, ...args) => {
      let symb = findDeclaration.apply(reflectorHost,
        [module, symbolName || 'default', ...args]);
      symb.filePath = getFullPath(symb.filePath);
      return symb;
    }
  }
}

const GENERATED_FILES = /\.d\.ts$|\.ngfactory\.ts$/;

function extractNgModules(program, staticReflector, reflectorHost) {
  const modules = new Map();
  program.getSourceFiles()
    .map(sf => sf.fileName)
    .filter(filePath => !GENERATED_FILES.test(filePath))
    .forEach(filePath => {
      const moduleMetadata = staticReflector.getModuleMetadata(filePath);
      if (! moduleMetadata) {
        console.log(`WARNING: no metadata found for ${filePath}`);
        return;
      }

      const metadata = moduleMetadata['metadata'];
      if (! metadata) {
        return;
      }

      for (const symbName of Object.keys(metadata)) {
        if (metadata[symbName] && metadata[symbName].__symbolic == 'error') {
          // Ignore symbols that are only included to record error information.
          continue;
        }
        const symbol = reflectorHost
          .findDeclaration(filePath, symbName, filePath);
        const ngModule = staticReflector
          .annotations(symbol)
          .find(ann => ann instanceof NgModule);
        if (ngModule) {
          modules.set(symbol, ngModule);
        }
      }
    });
  return modules;
}

function findBootstrapModule(ngModules) {
  return ngModules.find(module => module.bootstrap.length);
}

'use strict';

import 'reflect-metadata';

const path = Npm.require('path');
const ts = Npm.require('typescript');

const { NgModule } = Npm.require('@angular/core');

const {
  ReflectorHost,
  StaticReflector,
  CodeGenerator,
  PathMappedCompilerHost,
  CompilerHost,
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

function createNgcTsHost(ngcOptions, getFileContent) {
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

function createNgcTsProgram(filePaths, ngcOptions, ngcHost) {
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

function createCompilerHostContext(ngcHost) {
  const assumedExists = {};
  let reflectorContext = {
    fileExists(filePath) {
      return assumedExists[filePath] || ngcHost.fileExists(filePath);
    },
    assumeFileExists(filePath) {
      assumedExists[filePath] = true;
    },
    readResource(filePath) {
      if (! ngcHost.fileExists(filePath)) {
        throw new Error(`Compilation failed. Resource file not found: ${filePath}`);
      }
      return Promise.resolve(ngcHost.readFile(filePath));
    }
  }
  return _.extend({}, ngcHost, reflectorContext);
}

function createCompilerHost(tsProgram, ngcOptions, compilerHostContext, usePathMapping) {
  return usePathMapping ?
    new PathMappedCompilerHost(tsProgram, ngcOptions, compilerHostContext) :
    new CompilerHost(tsProgram, ngcOptions, compilerHostContext);
}

function genBootstrapCode(moduleFilePath) {
  const path = removeTsExtension(moduleFilePath);
  return `
    import {platformBrowser} from '@angular/platform-browser';
    import {AppModuleNgFactory} from '/${path}.ngfactory';
    Meteor.startup(() => {
      platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
    });
  `;
}

export function hasDynamicBootstrap(code) {
  return code.indexOf('platformBrowserDynamic') !== -1;
}

export function removeDynamicBootstrap(code, mainModuleName) {
  code = code
    .replace(/(import\s*{[^{]*platformBrowserDynamic[^}]*})/, '//\$1')
    .replace(/([^\n]*platformBrowserDynamic\(\))/, '//\$1')
    .replace(/([^\n]*bootstrapModule\()/, '//\$1');

  mainModuleName = mainModuleName.replace('.', '\.');
  const regExp = new RegExp(`([^\\n]*import[\\s]+.*${mainModuleName})`);
  code = code.replace(regExp, '//\$1');
  return code;
}

function findBootstrapModule(ngModules) {
  return ngModules.find(module =>
    module.bootstrapComponents && module.bootstrapComponents.length);
}

function extractProgramSymbols(symbolResolver, filePaths, host) {
  const staticSymbols = [];
  filePaths
    .filter(filePath => host.isSourceFile(filePath))
    .forEach(sf => {
      symbolResolver.getSymbolsOf(sf).forEach((symbol) => {
        const resolvedSymbol = symbolResolver.resolveSymbol(symbol);
        const symbolMeta = resolvedSymbol.metadata;
        if (symbolMeta && symbolMeta.__symbolic !== 'error') {
          staticSymbols.push(resolvedSymbol.symbol);
        }
      });
    });

  return staticSymbols;
}

const GENERATED_FILES = /\.d\.ts$|\.ngfactory\.ts$/;

function extractNgModules(metadataResolver, programSymbols) {
  const ngModuleMap = new Map();

  programSymbols
    .filter(symbol => !GENERATED_FILES.test(symbol.filePath))
    .forEach(symbol => {
      const ngModule = metadataResolver.getNgModuleMetadata(symbol, false);
      if (ngModule && !ngModuleMap.has(symbol)) {
        ngModuleMap.set(ngModule.type.reference, ngModule);
      }
    });

  return ngModuleMap;
}

export class CodeGeneratorWrapper {
  static generate(filePaths, ngcOptions, getMeteorFileContent) {
    const tsHost = createNgcTsHost(ngcOptions, getMeteorFileContent);
    const tsProgram = createNgcTsProgram(filePaths, ngcOptions, tsHost);
    const compilerHostContext = createCompilerHostContext(tsHost);
    const usePathMapping = !!ngcOptions.rootDirs && ngcOptions.rootDirs.length > 0;
    const compilerHost = createCompilerHost(
      tsProgram, ngcOptions, compilerHostContext, usePathMapping);

    const codegen = CodeGenerator.create(
      ngcOptions, {}, tsProgram, tsHost, compilerHostContext, compilerHost);
    const compiler = codegen.compiler;

    const ngcFilesMap = new Map();
    const ngcFilePaths = tsProgram.getSourceFiles().map(sf => sf.fileName);
    compiler.compileAll(ngcFilePaths)
      .then((generatedModules) => {
        generatedModules.forEach((generatedModule) => {
          // Filter out summary json files generated by
          // the compiler.
          if (!generatedModule.genFileUrl.endsWith('.json')) {
            const filePath = getMeteorPath(generatedModule.genFileUrl);
            ngcFilesMap.set(filePath, generatedModule.source);
          }
        });
      })
      .await();

    // TODO: make sense to create own instances of the
    // metadata and symbol resolvers.
    const symbolResolver = compiler._symbolResolver;
    const metadataResolver = compiler._metadataResolver;

    const symbols = extractProgramSymbols(symbolResolver, filePaths, compilerHost);
    const ngModulesMap = extractNgModules(metadataResolver, symbols);

    const ngModules = Array.from(ngModulesMap.values());
    const bootModule = findBootstrapModule(ngModules);
    let bootstrapCode = null;
    let mainModulePath = null;
    ngModulesMap.forEach((ngModule, symb) => {
      if (bootModule === ngModule) {
        const path = getMeteorPath(symb.filePath);
        bootstrapCode = genBootstrapCode(path);
        mainModulePath = path;
      }
    });

    return { ngcFilesMap, bootstrapCode, mainModulePath };
  }
}

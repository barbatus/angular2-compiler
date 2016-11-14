'use strict';

import 'reflect-metadata';

const path = Npm.require('path');
const ts = Npm.require('typescript');

const {
  ReflectorHost,
  StaticReflector,
  CodeGenerator,
} = Npm.require('@angular/compiler-cli');

import {
  removeTsExtension,
  getMeteorPath,
  getFullPath,
} from './file-utils';

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

function genBootrapModule(moduleFilePath) {
  const path = removeTsExtension(getMeteorPath(moduleFilePath));
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

    const collector = codegen.moduleCollector;
    const { fileMetas, ngModules } = collector.getModuleSymbols(program);

    const compiler = codegen.compiler;
    const analyzedModules = compiler.analyzeModules(ngModules);

    const ngcFilesMap = new Map();
    const promises = fileMetas.map((fileMeta) => {
      const directives = [];
      fileMeta.components.forEach(dirType => {
        const ngModule = analyzedModules.ngModuleByComponent.get(dirType);
        if (ngModule) {
          directives.push(dirType);
        }
      });

      const filePath = getFullPath(fileMeta.fileUrl);
      return compiler.compile(filePath, analyzedModules, directives, ngModules)
        .then((generatedModules) => {
          generatedModules.forEach((generatedModule) => {
            const filePath = getMeteorPath(generatedModule.moduleUrl);
            ngcFilesMap.set(filePath, generatedModule.source);
          });
        });
    });

    Promise.all(promises).await();

    // Assume that the first module is the main one.
    // TODO: this needs more solid check.
    let bootstrapModule = null;
    if (ngModules[0]) {
      const path = ngModules[0].filePath;
      bootstrapModule = genBootrapModule(path);
    }

    return { ngcFilesMap, bootstrapModule };
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

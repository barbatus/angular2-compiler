'use strict';

const path = Npm.require('path');
const baseRollup = Npm.require('rollup').rollup;
const Hypothetical = Npm.require('rollup-plugin-hypothetical');
const NodeResolve = Npm.require('rollup-plugin-node-resolve');

import {getMeteorPath, isRooted, getNoRooted} from './file-utils';

import {isAsset, getEmptyAssetEs6Module} from './asset-compiler';

const nodeResolve = NodeResolve({
  jsnext: true,
  module: true,
});

const libsToBundle = /^@angular/;

const AppResolve = appNgModules => {
  return {
    resolveId(importee, importer) {
      if (! importer) return null;

      let modId = importee;

      // Relative path.
      if (importee[0] === '.') {
        modId = path.resolve(importer, '..', importee);
        modId = getMeteorPath(modId);
      }

      // Rooted path.
      if (isRooted(importee)) {
        modId = getMeteorPath(importee);
      }

      if (appNgModules.has(modId)) {
        return Promise.resolve(modId);
      }

      const index = path.join(modId, 'index');
      if (appNgModules.has(index)) {
        return Promise.resolve(index);
      }

      const parts = importee.split(/[\/\\]/);
      modId = parts.shift();

      // Bundle libs we want, skip others.
      if (! libsToBundle.test(modId)) {
        return null;
      }

      return nodeResolve.resolveId(importee, importer);
    },

    load(modId) {
      if (appNgModules.has(modId)) {
        return Promise.resolve(appNgModules.get(modId));
      }

      if (isAsset(modId)) {
        return getEmptyAssetEs6Module(modId);
      }

      return null;
    }
  }
};

export default function rollup(appNgModules, bootstrapModule) {
  return baseRollup({
    entry: 'main.js',
    plugins: [
      Hypothetical({
        files: {
          'main.js': bootstrapModule,
        },
        allowRealFiles: true,
      }),
      AppResolve(appNgModules),
    ]
  })
  .then(bundle => {
    const result = bundle.generate({
      format: 'umd',
      moduleName: 'app',
    });
    return result.code;
  })
  .catch(error => {
    console.log(error)
    return null;
  })
  .await();
}

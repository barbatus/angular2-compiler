Package.describe({
  name: 'barbatus:angular2-compiler',
  version: '0.1.0',
  summary: 'Angular 2 compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': '0.8.1',
  'async': '1.4.0',
  'typescript': '2.1.4',
  '@angular/compiler-cli': '2.4.3',
  '@angular/compiler': '2.4.3',
  '@angular/core': '2.4.3',
  '@angular/common': '2.4.3',
  'rxjs': '5.0.3',
  'rollup': '0.41.4',
  'rollup-plugin-node-resolve': '2.0.0',
  'rollup-plugin-hypothetical': '1.2.1',
  'rollup-plugin-commonjs': '7.0.0',
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use([
    'ecmascript@0.6.1',
    'check@1.0.5',
    'underscore@1.0.4',
    'barbatus:typescript-compiler@0.9.2_1',
    'barbatus:css-compiler@0.4.1',
    'urigo:static-html-compiler@0.1.8',
    'babel-compiler@6.8.0',
  ], 'server');

  api.addFiles([
    'compiler.js',
    'ng-codegen.js',
    'file-utils.js',
    'rollup.js',
    'asset-compiler.js',
  ], 'server');

  api.export([
    'Angular2Compiler',
  ], 'server');
});

Package.describe({
  name: 'barbatus:angular2-compiler',
  version: '0.1.0',
  summary: 'Angular 2 compiler for Meteor',
  git: 'https://github.com/barbatus/ts-compilers',
  documentation: 'README.md'
});

Npm.depends({
  'meteor-typescript': '0.7.1',
  'async': '1.4.0',
  'typescript': '2.0.2',
  '@angular/compiler-cli': '2.1.0',
  '@angular/compiler': '2.1.0',
  '@angular/core': '2.1.0',
  'rxjs': '5.0.0-beta.12',
  '@angular/tsc-wrapped': '0.3.0',
  'rollup': '0.36.3',
  'rollup-plugin-node-resolve': '2.0.0',
  'rollup-plugin-hypothetical': '1.2.1',
  'rollup-plugin-commonjs': '5.0.4',
});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1');

  api.use([
    'ecmascript@0.4.2',
    'check@1.0.5',
    'underscore@1.0.4',
    'barbatus:typescript-compiler@0.8.4',
    'barbatus:css-compiler@0.3.4',
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

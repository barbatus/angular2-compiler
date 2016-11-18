/// <reference types="meteor-typings" />

'use strict';

import 'reflect-metadata';
import 'zone.js/dist/zone.js';

import {NgModule, enableProdMode} from '@angular/core';

import {FormsModule} from '@angular/forms';

import {BrowserModule} from '@angular/platform-browser';

import {METEOR_PROVIDERS} from 'angular2-meteor';

import {Todos} from './app.component';
import {TaskList} from './components';
import {TaskView} from '/imports/components';

enableProdMode();

@NgModule({
  imports: [BrowserModule, FormsModule],
  declarations: [Todos, TaskList, TaskView],
  providers: [],
  bootstrap: [Todos]
})
export class AppModule { }

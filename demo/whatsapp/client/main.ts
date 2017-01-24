import 'angular2-meteor-polyfills';

import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {enableProdMode} from '@angular/core';
import {Meteor} from 'meteor/meteor';
import {Tracker} from 'meteor/tracker';
import {AppModule} from './imports/app/app.module';

enableProdMode();

Meteor.startup(() => {
  Tracker.autorun(() => {
    if (Meteor.loggingIn()) return;

    platformBrowserDynamic().bootstrapModule(AppModule);
  });
});

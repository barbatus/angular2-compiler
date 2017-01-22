import {Component} from '@angular/core';
import {InjectUser} from 'angular2-meteor-accounts-ui';

import {style} from './app.component.scss';
import {template} from './app.component.web.html';

@Component({
  selector: 'app',
  template: template,
  styles: [style]
})
@InjectUser('user')
export class AppComponent {
  logout() {
    Meteor.logout();
  }
}

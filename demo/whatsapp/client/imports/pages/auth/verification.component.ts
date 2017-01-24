import {Component, OnInit, NgZone} from '@angular/core';
import {NavController, NavParams, AlertController} from 'ionic-angular';
import {Accounts} from 'meteor/accounts-base';

import {ProfileComponent} from './profile.component';
import {template} from './verification.component.html';
import {style} from './verification.component.scss';

@Component({
  selector: 'verification',
  template: template,
  styles: [style],
})
export class VerificationComponent implements OnInit {
  code: string = '';
  phone: string;
 
  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController, 
    private zone: NgZone, 
    private navParams: NavParams) {}
  
  ngOnInit() {
    this.phone = this.navParams.get('phone');
  }
 
  onInputKeypress({keyCode}: KeyboardEvent): void {
    if (keyCode == 13) {
      this.verify();
    }
  }
 
  verify(): void {
    Accounts.verifyPhone(this.phone, this.code, (err: Error) => {
      this.zone.run(() => {
        if (err) return this.handleError(err);
 
        this.navCtrl.setRoot(ProfileComponent, {}, {
          animate: true
        });
      });
    });
  }
 
  private handleError(err: Error): void {
    console.error(err);
 
    const alert = this.alertCtrl.create({
      title: 'Oops!',
      message: err.message,
      buttons: ['OK']
    });
 
    alert.present();
  }
}

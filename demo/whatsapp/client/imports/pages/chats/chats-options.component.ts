import {Component} from '@angular/core';
import {NavController, ViewController, AlertController} from 'ionic-angular';
import {Meteor} from 'meteor/meteor';

import {ProfileComponent} from '../auth/profile.component';
import {LoginComponent} from '../auth/login.component';
import {template} from './chats-options.component.html';
import {style} from "./chats-options.component.scss";

@Component({
  selector: 'chats-options',
  template: template,
  styles: [style],
})
export class ChatsOptionsComponent {
  constructor(
    private navCtrl: NavController, 
    private viewCtrl: ViewController,
    private alertCtrl: AlertController
  ) {}
 
  editProfile(): void {
    this.viewCtrl.dismiss().then(() => {
      this.navCtrl.push(ProfileComponent);
    });
  }

  logout(): void {
    const alert = this.alertCtrl.create({
      title: 'Logout',
      message: 'Are you sure you would like to proceed?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Yes',
          handler: () => {
            this.handleLogout(alert);
            return false;
          }
        }
      ]
    });

    this.viewCtrl.dismiss().then(() => {
      alert.present();
    });
  }

  private handleLogout(alert): void {
    Meteor.logout((err: Error) => {
      alert.dismiss().then(() => {
        if (err) return this.handleError(err);
 
        this.navCtrl.setRoot(LoginComponent, {}, {
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
      buttons: ['OK'],
    });

    alert.present();
  }
}

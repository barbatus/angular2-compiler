import {Component} from '@angular/core';
import {NavParams, NavController, ViewController, AlertController} from 'ionic-angular';
import {Meteor} from 'meteor/meteor';
import {MeteorObservable} from 'meteor-rxjs';

import {template} from './messages-options.component.html';
import {style} from './messages-options.component.scss';
import {TabsContainerComponent} from '../tabs-container/tabs-container.component';
 
@Component({
  selector: 'messages-options',
  template: template,
  styles: [style],
})
export class MessagesOptionsComponent {
  constructor(
    private navCtrl: NavController, 
    private viewCtrl: ViewController,
    private alertCtrl: AlertController,
    private params: NavParams
  ) {}
 
  remove(): void {
    const alert = this.alertCtrl.create({
      title: 'Remove',
      message: 'Are you sure you would like to proceed?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Yes',
          handler: () => {
            this.handleRemove(alert);
            return false;
          }
        }
      ]
    });
 
    this.viewCtrl.dismiss().then(() => {
      alert.present();
    });
  }
 
  private handleRemove(alert): void {
    Meteor.call('removeChat', this.params.get('chat')._id, (err: Error) => {
      if (! err) {
        return alert.dismiss().then(() => {
          this.navCtrl.setRoot(TabsContainerComponent, {}, {
            animate: true
          });
        });
      }
      alert.dismiss().then(() => {
        if (err) return this.handleError(err);

        this.navCtrl.setRoot(TabsContainerComponent, {}, {
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

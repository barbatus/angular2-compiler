import {Component, OnInit} from '@angular/core';
import {MeteorObservable, ObservableCursor} from 'meteor-rxjs';
import {NavController, ViewController, AlertController} from 'ionic-angular';
import {Meteor} from 'meteor/meteor';
import {Observable} from 'rxjs/Observable';

import {Chats, Users} from 'both/collections';
import {User} from 'both/models';
import {template} from './new-chat.component.html';
import {style} from './new-chat.component.scss';

import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/startWith';

@Component({
  selector: 'new-chat',
  template: template,
  styles: [style],
})
export class NewChatComponent implements OnInit {
  users: Observable<User[]>;
  private senderId: string;
 
  constructor(
    private navCtrl: NavController, 
    private viewCtrl: ViewController,
    private alertCtrl: AlertController
  ) {
    this.senderId = Meteor.userId();
  }

  ngOnInit() {
    Meteor.subscribe('users');

    this.users = this.findUsers();
  }
 
  addChat(user): void {
    Meteor.call('addChat', user._id, (err: Error) => {
      if (! err) {
        return this.viewCtrl.dismiss();
      }
      this.viewCtrl.dismiss().then(() => {
        this.handleError(err)
      });
    });
  }

  private findUsers(): Observable<User[]> {
    return Chats.find({
        memberIds: this.senderId
      })
        .startWith([]) // empty result
        .select('memberIds')
        .mergeMap(memberIds => {
          return Users.find({
            _id: {$nin: memberIds}
          }).startWith([]);
        })
        .zone();
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

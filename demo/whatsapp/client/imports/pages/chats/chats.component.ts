import {Component, OnInit, NgZone} from '@angular/core';
import {Observable} from 'rxjs';
import {Meteor} from 'meteor/meteor';
import {MeteorObservable} from 'meteor-rxjs';
import {NavController, PopoverController, ModalController} from 'ionic-angular';
import {MeteorReactive} from 'angular2-meteor';

import {Chat, Message} from 'both/models';
import {Users, Chats, Messages} from 'both/collections';
import {style} from './chats.component.scss';
import {template} from './chats.component.html';
import {NewChatComponent} from './new-chat.component';
import {MessagesPage} from '../chat/messages-page.component';
import {ChatsOptionsComponent} from '../chats/chats-options.component';

@Component({
  selector: 'chats',
  template: template,
  styles: [style],
})
export class ChatsComponent extends MeteorReactive implements OnInit {
  chats: Observable<Chat[]>;
  senderId: string;

  constructor(
    private navCtrl: NavController,
    private popoverCtrl: PopoverController,
    private modalCtrl: ModalController,
  ) {
    super();
  }

  ngOnInit() {
    this.senderId = Meteor.userId();      

    this.subscribe('chats');

    this.chats = Chats
      .find({})
      .zone();
  }

  addChat(): void {
    const modal = this.modalCtrl.create(NewChatComponent);
    modal.present();
  }

  showOptions(): void {
    const popover = this.popoverCtrl.create(ChatsOptionsComponent, {}, {
      cssClass: 'options-popover'
    });
 
    popover.present();
  }

  showMessages(chat): void {
    this.navCtrl.push(MessagesPage, { chat });
  }
}

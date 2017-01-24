import {Observable} from 'rxjs';

import {Messages, Users}  from '../collections';
import Message from './message.model';

declare const _;

export class Chat {
  _id?: string;
  memberIds?: string[];

  constructor(data: any) {
    _.extend(this, data);
  }

  get senderId() {
    return Meteor.userId();
  }

  get receiverId() {
    return this.memberIds.find(
      memberId => memberId !== this.senderId);
  }

  get lastMessage(): Observable<Message> {
    return Messages.find({
      chatId: this._id,
    }, {
      sort: {createdAt: -1},
      limit: 1,
    })
      .map(messages =>  messages[0]);
  }

  get title(): Observable<string> {
    return Users.find({_id: this.receiverId})
      .map(receiver => receiver[0] && receiver[0].profile.name);
  }

  get picture(): Observable<string> {
    return Users.find({_id: this.receiverId})
      .map(receiver => receiver[0] && receiver[0].profile.picture);
  }
}

export default Chat;

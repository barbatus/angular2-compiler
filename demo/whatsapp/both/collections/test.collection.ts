import {MongoObservable} from 'meteor-rxjs';

import Chat from '../models/chat.model'

const ChatCollection = new Mongo.Collection<Chat>('chats', {
  transform: chat => new Chat(chat),
});
const Chats = MongoObservable.fromExisting<Chat>(ChatCollection);
export default Chats;

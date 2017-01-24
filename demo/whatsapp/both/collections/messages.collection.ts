import {MongoObservable} from 'meteor-rxjs';

import Message from '../models/message.model';

const Messages = new MongoObservable.Collection<Message>('messages');
export default Messages;

import {Meteor} from 'meteor/meteor';
import {MongoObservable} from 'meteor-rxjs';

import User from '../models/user.model';

const Users = MongoObservable.fromExisting<User>(Meteor.users);
export default Users;

import {Meteor} from 'meteor/meteor';

import Profile from '../models/profile.model';

interface User extends Meteor.User {
  profile?: Profile;
}

export default User;

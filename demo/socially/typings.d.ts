declare module 'meteor/tmeasday:publish-counts' {
  import { Mongo } from 'meteor/mongo';

  interface CountsObject {
    get(publicationName: string): number;
    publish(context: any, publicationName: string, cursor: Mongo.Cursor<any>, options: any): number;
  }

  export const Counts: CountsObject;
}

declare module 'meteor/accounts-base' {
  module Accounts {
    function requestPhoneVerification(phoneNumber: string, callback?: Function): void;
    function verifyPhone(phoneNumber: string, code: string, callback?: Function): void;
  }
}

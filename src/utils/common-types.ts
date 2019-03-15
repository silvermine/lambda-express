import _ from 'underscore';

export interface StringMap { [s: string]: string }
export interface StringUnknownMap { [s: string]: unknown }
export interface StringArrayOfStringsMap { [s: string]: string[] }
export interface KeyValueStringObject { [k: string]: (string | string[] | KeyValueStringObject) }
// Removes `readonly` modifier and make all keys writable again
export type Writable<T> = { -readonly [P in keyof T]-?: T[P] };

export function isStringMap(o: any): o is StringMap {
   if (!_.isObject(o) || _.isArray(o)) { // because arrays are objects
      return false;
   }
   if (_.isEmpty(o)) {
      return true;
   }

   return _.reduce(o, (memo, v, k) => {
      return memo && _.isString(k) && _.isString(v);
   }, true);
}

export function isStringUnknownMap(o: any): o is StringUnknownMap {
   if (!_.isObject(o) || _.isArray(o)) { // because arrays are objects
      return false;
   }
   if (_.isEmpty(o)) {
      return true;
   }

   return _.reduce(o, (memo, _v, k) => {
      return memo && _.isString(k);
   }, true);
}

export function isKeyValueStringObject(o: any): o is KeyValueStringObject {
   if (!_.isObject(o) || _.isArray(o)) { // because arrays are objects
      return false;
   }
   if (_.isEmpty(o)) {
      return true;
   }

   return _.reduce(o, (memo, v, k) => {
      return memo && _.isString(k) && (_.isString(v) || isArrayOfStrings(v) || isKeyValueStringObject(v));
   }, true);
}

export function isArrayOfStrings(values: any): values is string[] {
   if (!_.isArray(values)) {
      return false;
   }
   return _.reduce(values, (memo, v) => {
      return memo && _.isString(v);
   }, true);
}

export function isStringArrayOfStringsMap(o: any): o is StringArrayOfStringsMap {
   if (!_.isObject(o) || _.isArray(o)) { // because arrays are objects
      return false;
   }
   if (_.isEmpty(o)) {
      return true;
   }

   return _.reduce(o, (memo, v, k) => {
      return memo && _.isString(k) && isArrayOfStrings(v);
   }, true);
}

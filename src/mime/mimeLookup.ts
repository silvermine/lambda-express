import _ from 'underscore';
import { StringMap } from '../utils/common-types';

const db = _.reduce(require('./standard.json'), (memo, extensions: string[], type: string): StringMap => {
   _.each(extensions, (ext) => {
      memo[ext] = type;
   });
   return memo;
}, {} as StringMap);

export default function mimeLookup(ext: string): string | null {
   if (ext && ext.indexOf('.') === 0) {
      ext = ext.substring(1);
   }
   return db[ext] || null;
}

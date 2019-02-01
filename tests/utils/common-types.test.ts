import { expect } from 'chai';
import * as t from '../../src/utils/common-types';

describe('common types', () => {
   describe('isArrayOfStrings', () => {

      it('correctly classifies arrays', () => {
         expect(t.isArrayOfStrings([])).to.strictlyEqual(true);
         expect(t.isArrayOfStrings([ 'a', 'b', 'c', '' ])).to.strictlyEqual(true);
         expect(t.isArrayOfStrings([ 4 ])).to.strictlyEqual(false);
         expect(t.isArrayOfStrings([ 'a', 'b', 'c', 4 ])).to.strictlyEqual(false);
      });

      it('correctly classifies non-arrays', () => {
         expect(t.isArrayOfStrings({})).to.strictlyEqual(false);
         expect(t.isArrayOfStrings(4)).to.strictlyEqual(false);
         expect(t.isArrayOfStrings('')).to.strictlyEqual(false);
         expect(t.isArrayOfStrings('a')).to.strictlyEqual(false);
         expect(t.isArrayOfStrings(true)).to.strictlyEqual(false);
         expect(t.isArrayOfStrings(undefined)).to.strictlyEqual(false);
         expect(t.isArrayOfStrings(null)).to.strictlyEqual(false);
      });

   });


   describe('isStringMap', () => {

      it('correctly classifies objects', () => {
         // TODO: `sed 's|\.eql|.strictlyEqual|' in this whole file
         expect(t.isStringMap({})).to.strictlyEqual(true);
         expect(t.isStringMap({ a: 'b', c: 'd' })).to.strictlyEqual(true);
         expect(t.isStringMap({ a: 4 })).to.strictlyEqual(false);
         expect(t.isStringMap({ a: {} })).to.strictlyEqual(false);
         expect(t.isStringMap({ a: [] })).to.strictlyEqual(false);
         expect(t.isStringMap({ a: true })).to.strictlyEqual(false);
         expect(t.isStringMap({ a: null })).to.strictlyEqual(false);
         expect(t.isStringMap({ a: undefined })).to.strictlyEqual(false);
      });

      it('correctly classifies non-objects', () => {
         expect(t.isStringMap([])).to.strictlyEqual(false);
         expect(t.isStringMap(4)).to.strictlyEqual(false);
         expect(t.isStringMap('')).to.strictlyEqual(false);
         expect(t.isStringMap('a')).to.strictlyEqual(false);
         expect(t.isStringMap(true)).to.strictlyEqual(false);
         expect(t.isStringMap(undefined)).to.strictlyEqual(false);
         expect(t.isStringMap(null)).to.strictlyEqual(false);
      });

   });


   describe('isKeyValueStringObject', () => {

      it('correctly classifies objects', () => {
         expect(t.isKeyValueStringObject({})).to.strictlyEqual(true);
         expect(t.isKeyValueStringObject({ a: 'b' })).to.strictlyEqual(true);
         expect(t.isKeyValueStringObject({ a: 'b', b: 'c' })).to.strictlyEqual(true);
         expect(t.isKeyValueStringObject({ a: 'b', b: [ 'c', 'd' ] })).to.strictlyEqual(true);
         expect(t.isKeyValueStringObject({ a: 'b', b: [ 'c', 'd' ], e: { f: 'g', h: [ 'i', 'j' ] } })).to.strictlyEqual(true);
         expect(t.isKeyValueStringObject({ a: { b: [] } })).to.strictlyEqual(true);
         expect(t.isKeyValueStringObject({ a: { b: [ 'c', 'd' ] } })).to.strictlyEqual(true);

         expect(t.isKeyValueStringObject({ a: 4 })).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject({ a: [ 'b', 4 ] })).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject({ a: { b: [ { c: 'd' } ] } })).to.strictlyEqual(false);
      });

      it('correctly classifies non-objects', () => {
         expect(t.isKeyValueStringObject([])).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject(4)).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject('')).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject('a')).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject(true)).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject(undefined)).to.strictlyEqual(false);
         expect(t.isKeyValueStringObject(null)).to.strictlyEqual(false);
      });

   });


   describe('isStringArrayOfStringsMap', () => {

      it('correctly classifies objects', () => {
         expect(t.isStringArrayOfStringsMap({})).to.strictlyEqual(true);
         expect(t.isStringArrayOfStringsMap({ a: [] })).to.strictlyEqual(true);
         expect(t.isStringArrayOfStringsMap({ a: [ 'b' ] })).to.strictlyEqual(true);
         expect(t.isStringArrayOfStringsMap({ a: [ 'b', 'c' ] })).to.strictlyEqual(true);

         expect(t.isStringArrayOfStringsMap({ a: [ 'b', 4 ] })).to.strictlyEqual(false);

         expect(t.isStringArrayOfStringsMap({ a: 'b' })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: 'b', b: 'c' })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: 'b', b: [ 'c', 'd' ] })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: 'b', b: [ 'c', 'd' ], e: { f: 'g', h: [ 'i', 'j' ] } })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: { b: [] } })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: { b: [ 'c', 'd' ] } })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: 4 })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: [ 'b', 4 ] })).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap({ a: { b: [ { c: 'd' } ] } })).to.strictlyEqual(false);
      });

      it('correctly classifies non-objects', () => {
         expect(t.isStringArrayOfStringsMap([])).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap(4)).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap('')).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap('a')).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap(true)).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap(undefined)).to.strictlyEqual(false);
         expect(t.isStringArrayOfStringsMap(null)).to.strictlyEqual(false);
      });

   });

});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {preventDoubleTap} from './index';

/*eslint max-nested-callbacks: 0 */
describe('Prevent double tap', () => {
    it('should prevent double taps within the 300ms default', (done) => {
        const testFunction = jest.fn();
        const test = preventDoubleTap(testFunction);

        test();
        test();
        expect(testFunction).toHaveBeenCalledTimes(1);
        setTimeout(() => {
            test();
            expect(testFunction).toHaveBeenCalledTimes(1);
            done();
        }, 100);
    });

    it('should prevent double taps within 1 second', (done) => {
        const testFunction = jest.fn();
        const test = preventDoubleTap(testFunction, 1000);

        test();
        test();
        expect(testFunction).toHaveBeenCalledTimes(1);
        setTimeout(() => {
            test();
            expect(testFunction).toHaveBeenCalledTimes(1);
            done();
        }, 900);
    });

    it('should register multiple taps when done > 300ms apart', (done) => {
        const testFunction = jest.fn();
        const test = preventDoubleTap(testFunction);

        test();
        test();
        expect(testFunction).toHaveBeenCalledTimes(1);
        setTimeout(() => {
            test();
            expect(testFunction).toHaveBeenCalledTimes(2);
            done();
        }, 750);
    });
});

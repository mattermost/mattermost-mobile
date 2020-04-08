// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {preventDoubleTap} from './tap';

describe('Prevent double tap', () => {
    it('should prevent double taps', (done) => {
        const testFunction = jest.fn();
        const test = preventDoubleTap(testFunction);

        test();
        test();
        expect(testFunction).toHaveBeenCalledTimes(1);
        setTimeout(() => {
            test();
            expect(testFunction).toHaveBeenCalledTimes(2);
            done();
        }, 1000);
    });

    it('should prevent double taps before 300ms', (done) => {
        const testFunction = jest.fn();
        const test = preventDoubleTap(testFunction, 300);

        test();
        test();
        expect(testFunction).toHaveBeenCalledTimes(1);
        setTimeout(() => {
            test();
            expect(testFunction).toHaveBeenCalledTimes(2);
            done();
        }, 300);
    });
});

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {logInfo} from '@utils/log';

import {useWhyDidYouUpdate} from './why_did_you_update';

jest.mock('@utils/log');

describe('hooks/useWhyDidYouUpdate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should not log on initial render', () => {
        const props = {test: 'value'};
        renderHook(() => useWhyDidYouUpdate('TestComponent', props));

        // Initial render does log, but we check it's the initial message
        expect(logInfo).toHaveBeenCalledWith(
            expect.any(Number),
            expect.stringContaining('INITIAL RENDER'),
        );
    });

    it('should log when props change', () => {
        const initialProps = {test: 'initial'};
        const {rerender} = renderHook(
            (props) => useWhyDidYouUpdate('TestComponent', props),
            {initialProps},
        );

        // Update props
        const newProps = {test: 'updated'};
        rerender(newProps);

        // Check that logInfo was called with timestamp and message containing the changed prop
        expect(logInfo).toHaveBeenCalledWith(
            expect.any(Number),
            expect.stringContaining('[why-did-you-update] TestComponent render #2:'),
            expect.stringContaining('test'),
        );
    });

    it('should not log when props remain the same', () => {
        const props = {test: 'value'} as any;
        const {rerender} = renderHook(
            (_props) => useWhyDidYouUpdate('TestComponent', _props),
            {initialProps: props},
        );

        // Rerender with same props
        rerender(props);

        // Should log twice: once for initial, once for re-render with no changes
        expect(logInfo).toHaveBeenCalledTimes(2);
        expect(logInfo).toHaveBeenLastCalledWith(
            expect.any(Number),
            expect.stringContaining('NO CHANGES DETECTED'),
        );
    });

    it('should handle multiple prop changes', () => {
        const initialProps = {prop1: 'initial1', prop2: 'initial2'};
        const {rerender} = renderHook(
            (props) => useWhyDidYouUpdate('TestComponent', props),
            {initialProps},
        );

        // Update multiple props
        const newProps = {prop1: 'updated1', prop2: 'updated2'};
        rerender(newProps);

        // Check that logInfo was called with both changed props
        expect(logInfo).toHaveBeenCalledWith(
            expect.any(Number),
            expect.stringContaining('[why-did-you-update] TestComponent render #2:'),
            expect.stringMatching(/prop1.*prop2|prop2.*prop1/),
        );
    });
});

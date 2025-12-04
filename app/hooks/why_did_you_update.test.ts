// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {useWhyDidYouUpdate} from './why_did_you_update';

describe('hooks/useWhyDidYouUpdate', () => {
    beforeEach(() => {
        // Mock console.log since that's what we use to output changes
        global.console.log = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should not log on initial render', () => {
        const props = {test: 'value'};
        renderHook(() => useWhyDidYouUpdate('TestComponent', props));

        expect(console.log).not.toHaveBeenCalled();
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

        expect(console.log).toHaveBeenCalledWith(
            '[why-did-you-update]',
            'TestComponent',
            {
                test: {
                    from: 'initial',
                    to: 'updated',
                },
            },
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

        expect(console.log).not.toHaveBeenCalled();
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

        expect(console.log).toHaveBeenCalledWith(
            '[why-did-you-update]',
            'TestComponent',
            {
                prop1: {
                    from: 'initial1',
                    to: 'updated1',
                },
                prop2: {
                    from: 'initial2',
                    to: 'updated2',
                },
            },
        );
    });
});

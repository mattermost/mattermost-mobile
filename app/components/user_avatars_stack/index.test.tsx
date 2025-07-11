// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {useIsTablet} from '@hooks/device';
import {bottomSheet} from '@screens/navigation';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import UserAvatarsStack from '.';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

describe('UserAvatarsStack', () => {
    function getBaseProps(): ComponentProps<typeof UserAvatarsStack> {
        return {
            location: 'Channel',
            users: [],
            bottomSheetTitle: {id: 'test', defaultMessage: 'bottom sheet title test text'},
        };
    }
    it('should use the correct bottom sheet title', async () => {
        const props = getBaseProps();
        jest.mocked(useIsTablet).mockReturnValueOnce(false);
        const {root} = renderWithIntlAndTheme(<UserAvatarsStack {...props}/>);

        await act(async () => {
            fireEvent.press(root);
        });

        expect(bottomSheet).toHaveBeenCalledWith(expect.objectContaining({
            title: props.bottomSheetTitle.defaultMessage,
        }));

        const Content = jest.mocked(bottomSheet).mock.calls[0][0].renderContent;

        const {getByText} = renderWithIntlAndTheme(<Content/>);

        expect(getByText(props.bottomSheetTitle.defaultMessage as string)).toBeVisible();
    });
});

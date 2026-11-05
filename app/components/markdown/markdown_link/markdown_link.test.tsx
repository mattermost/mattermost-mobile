// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Clipboard from '@react-native-clipboard/clipboard';
import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {startPhoneCall} from '@calls/alerts';
import {isPhoneDialingAvailable} from '@calls/state';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import {openLink} from '@utils/url/links';

import MarkdownLink from './markdown_link';

jest.mock('@calls/alerts', () => ({
    startPhoneCall: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    isPhoneDialingAvailable: jest.fn(() => false),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@utils/url/links', () => ({
    openLink: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'https://server.example.com'),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
    setString: jest.fn(),
}));

describe('MarkdownLink', () => {
    const siteURL = 'https://site.example.com';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should open a tel: href with openLink', () => {
        const {getByTestId} = renderWithIntl(
            <MarkdownLink
                experimentalNormalizeMarkdownLinks=''
                href='tel:+15551234567'
                siteURL={siteURL}
            >
                <Text>{'+15551234567'}</Text>
            </MarkdownLink>,
        );

        fireEvent.press(getByTestId('markdown_link'));

        expect(openLink).toHaveBeenCalledWith(
            'tel:+15551234567',
            'https://server.example.com',
            siteURL,
            expect.any(Object),
        );
    });

    it('should let the user choose to dial a tel: link through Mattermost when phone dialing is available', () => {
        jest.mocked(isPhoneDialingAvailable).mockReturnValueOnce(true);
        const {getByTestId} = renderWithIntl(
            <MarkdownLink
                experimentalNormalizeMarkdownLinks=''
                href='tel:%2B15551234567;ext=12'
                siteURL={siteURL}
            >
                <Text>{'+15551234567'}</Text>
            </MarkdownLink>,
        );

        fireEvent.press(getByTestId('markdown_link'));

        expect(openLink).not.toHaveBeenCalled();
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0] as () => React.ReactElement;
        const {getByText: getSheetText} = renderWithIntl(renderContent());

        fireEvent.press(getSheetText('Call with Mattermost'));

        expect(startPhoneCall).toHaveBeenCalledWith(expect.any(Object), 'https://server.example.com', '+15551234567');
    });

    it('should offer copy phone number on long press of a tel: link', () => {
        const {getByTestId, getByText} = renderWithIntl(
            <MarkdownLink
                experimentalNormalizeMarkdownLinks=''
                href='tel:5551234567'
                siteURL={siteURL}
            >
                <Text>{'555-123-4567'}</Text>
            </MarkdownLink>,
        );

        fireEvent(getByTestId('markdown_link'), 'longPress');

        expect(bottomSheet).toHaveBeenCalledWith(expect.any(Function), expect.any(Array));
        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0] as () => React.ReactElement;
        const {getByText: getSheetText} = renderWithIntl(renderContent());

        expect(getSheetText('Copy Phone Number')).toBeVisible();

        fireEvent.press(getSheetText('Copy Phone Number'));
        expect(Clipboard.setString).toHaveBeenCalledWith('5551234567');
        expect(getByText('555-123-4567')).toBeVisible();
    });
});

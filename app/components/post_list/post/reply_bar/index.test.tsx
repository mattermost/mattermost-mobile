// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {blendColors} from '@utils/theme';

import ReplyBar from '.';

const theme = Preferences.THEMES.denim;

describe('ReplyBar', () => {
    it('should use the neutral bar colour without padding by default', () => {
        const {getByTestId} = renderWithIntlAndTheme(<ReplyBar highlight={false}/>);

        expect(getByTestId('post.reply_bar')).toHaveStyle({
            backgroundColor: blendColors(theme.centerChannelBg, theme.centerChannelColor, 0.1),
        });
        expect(getByTestId('post.reply_bar')).not.toHaveStyle({paddingTop: 10});
        expect(getByTestId('post.reply_bar')).not.toHaveStyle({paddingBottom: 10});
    });

    it('should pad the first and last replies and highlight mentions', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ReplyBar
                highlight={true}
                isFirstReply={true}
                isLastReply={true}
            />,
        );

        expect(getByTestId('post.reply_bar')).toHaveStyle({
            backgroundColor: theme.mentionHighlightBg,
            paddingTop: 10,
            paddingBottom: 10,
        });
    });
});

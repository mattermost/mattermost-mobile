// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';

import FormattedMarkdownText from '@components/formatted_markdown_text';
import FormattedText from '@components/formatted_text';
import Markdown from '@components/markdown';
import {getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';

import {postTypeMessages, systemMessages} from './messages';

type LastUsersProps = {
    actor: string;
    postType: string;
    usernames: string[];
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        baseText: {
            color: theme.centerChannelColor,
            opacity: 0.6,
            fontSize: 16,
            lineHeight: 20,
        },
        linkText: {
            color: theme.linkColor,
            opacity: 0.8,
            fontSize: 16,
            lineHeight: 20,
        },
    };
});

const LastUsers = ({actor, postType, theme, usernames}: LastUsersProps) => {
    const [expanded, setExpanded] = useState(false);
    const intl = useIntl();
    const style = getStyleSheet(theme);
    const textStyles = getMarkdownTextStyles(theme);

    const onPress = () => {
        setExpanded(true);
    };

    if (expanded) {
        const lastIndex = usernames.length - 1;
        const lastUser = usernames[lastIndex];
        const expandedMessage = postTypeMessages[postType].many_expanded;
        const formattedMessage = intl.formatMessage(expandedMessage, {
            users: usernames.slice(0, lastIndex).join(', '),
            lastUser,
            actor,
        });

        return (
            <Markdown
                baseTextStyle={style.baseText}
                textStyles={textStyles}
                value={formattedMessage}
                theme={theme}
            />
        );
    }

    const firstUser = usernames[0];
    const numOthers = usernames.length - 1;

    return (
        <Text>
            <FormattedMarkdownText
                id={'last_users_message.first'}
                defaultMessage={'{firstUser} and '}
                values={{firstUser}}
                baseTextStyle={style.baseText}
                style={style.baseText}
                textStyles={textStyles}
            />
            <Text>{' '}</Text>
            <Text
                style={style.linkText}
                onPress={onPress}
            >
                <FormattedText
                    id={'last_users_message.others'}
                    defaultMessage={'{numOthers} others '}
                    values={{numOthers}}
                />
            </Text>
            <FormattedMarkdownText
                id={systemMessages[postType].id}
                defaultMessage={systemMessages[postType].defaultMessage}
                values={{actor}}
                baseTextStyle={style.baseText}
                style={style.baseText}
                textStyles={textStyles}
            />
        </Text>
    );
};

export default LastUsers;

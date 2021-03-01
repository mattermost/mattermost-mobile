// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

interface AtMentionItemProps {
    firstName: string;
    isBot: boolean;
    isCurrentUser: boolean;
    isGuest: boolean;
    lastName: string;
    nickname: string;
    onPress: (username: string) => void;
    showFullName: string;
    testID?: string;
    theme: Theme;
    userId: string;
    username: string;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        row: {
            height: 40,
            paddingVertical: 8,
            paddingTop: 4,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowPicture: {
            marginRight: 10,
            marginLeft: 2,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowFullname: {
            fontSize: 15,
            color: theme.centerChannelColor,
            paddingLeft: 4,
        },
        rowUsername: {
            color: theme.centerChannelColor,
            fontSize: 15,
            opacity: 0.56,
            flex: 1,
        },
    };
});

const AtMentionItem = (props: AtMentionItemProps) => {
    const insets = useSafeAreaInsets();
    const {
        firstName,
        isBot,
        isCurrentUser,
        isGuest,
        lastName,
        nickname,
        onPress,
        showFullName,
        testID,
        theme,
        userId,
        username,
    } = props;

    const completeMention = () => {
        onPress(username);
    };

    const renderNameBlock = () => {
        let name = '';
        const hasNickname = nickname.length > 0;

        if (showFullName === 'true') {
            name += `${firstName} ${lastName} `;
        }

        if (hasNickname) {
            name += name.length > 0 ? `(${nickname})` : nickname;
        }

        return name.trim();
    };

    const style = getStyleFromTheme(theme);
    const name = renderNameBlock();

    return (
        <TouchableWithFeedback
            testID={testID}
            key={userId}
            onPress={completeMention}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            style={{marginLeft: insets.left, marginRight: insets.right}}
            type={'native'}
        >
            <View style={style.row}>
                <View style={style.rowPicture}>
                    <ProfilePicture
                        userId={userId}
                        theme={theme}
                        size={24}
                        status={null}
                        showStatus={false}
                    />
                </View>
                <BotTag
                    show={isBot}
                    theme={theme}
                />
                <GuestTag
                    show={isGuest}
                    theme={theme}
                />
                {Boolean(name.length) &&
                <Text
                    style={style.rowFullname}
                    numberOfLines={1}
                >
                    {name}
                </Text>
                }
                <Text
                    style={style.rowUsername}
                    numberOfLines={1}
                >
                    {isCurrentUser &&
                    <FormattedText
                        id='suggestion.mention.you'
                        defaultMessage='(you)'
                    />}
                    {` @${username}`}
                </Text>
            </View>
        </TouchableWithFeedback>
    );
};

AtMentionItem.defaultProps = {
    firstName: '',
    lastName: '',
    nickname: '',
};

export default AtMentionItem;

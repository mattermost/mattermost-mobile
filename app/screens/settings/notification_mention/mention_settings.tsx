// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useReducer, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import Block from '@components/block';
import FloatingTextInput from '@components/floating_text_input_label';
import OptionItem from '@components/option_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import UserModel from '@typings/database/models/servers/user';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getNotificationProps} from '@utils/user';

const UPDATE_MENTION_PREF = 'UPDATE_MENTION_PREF';
const INITIAL_STATE = {
    firstName: false,
    usernameMention: false,
    channel: false,
};
type Action = {
    type: string;
    data: Partial<typeof INITIAL_STATE>;
}
const reducer = (state: typeof INITIAL_STATE, action: Action) => {
    switch (action.type) {
        case UPDATE_MENTION_PREF:
            return {
                ...state,
                ...action.data,
            };

        default:
            return state;
    }
};

const mentionHeaderText = {
    id: t('notification_settings.mentions.wordsTrigger'),
    defaultMessage: 'Words that trigger mentions',
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            flex: 1,
            height: 1,
        },
        upperCase: {
            textTransform: 'uppercase',
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        desc: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
            paddingLeft: 8,
        },
        container: {
            paddingHorizontal: 8,
        },
        input: {
            color: theme.centerChannelColor,
            height: 150,
            paddingHorizontal: 15,
            ...typography('Body', 100, 'Regular'),
        },
        containerStyle: {
            marginTop: 30,
        },
    };
});

const getMentionKeys = (currentUser: UserModel) => {
    const notifyProps = getNotificationProps(currentUser);
    const mKeys = (notifyProps.mention_keys || '').split(',');
    const usernameMentionIndex = mKeys.indexOf(currentUser.username);
    if (usernameMentionIndex > -1) {
        mKeys.splice(usernameMentionIndex, 1);
    }
    return mKeys.join(',');
};

type MentionSectionProps = {
    currentUser: UserModel;
}
const MentionSettings = ({currentUser}: MentionSectionProps) => {
    const [{firstName, usernameMention, channel}, dispatch] = useReducer(reducer, INITIAL_STATE);
    const [mentionKeys, setMentionKeys] = useState(() => getMentionKeys(currentUser));
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const toggleChannelMentions = useCallback(() => {
        dispatch({
            type: UPDATE_MENTION_PREF,
            data: {
                channel: !channel,
            },
        });
    }, []);

    const toggleUsernameMention = useCallback(() => {
        dispatch({
            type: UPDATE_MENTION_PREF,
            data: {
                usernameMention: !usernameMention,
            },
        });
    }, []);

    const toggleFirstNameMention = useCallback(() => {
        dispatch({
            type: UPDATE_MENTION_PREF,
            data: {
                firstName: !firstName,
            },
        });
    }, []);

    const onChangeText = useCallback((text: string) => setMentionKeys(text), []);

    return (
        <Block
            headerText={mentionHeaderText}
            headerStyles={styles.upperCase}
        >
            { Boolean(currentUser?.firstName) && (
                <>
                    <OptionItem
                        action={toggleFirstNameMention}
                        containerStyle={styles.container}
                        description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveName', defaultMessage: 'Your case sensitive first name'})}
                        label={currentUser!.firstName}
                        selected={firstName}
                        type='toggle'
                    />
                    <View style={styles.separator}/>
                </>
            )
            }
            {Boolean(currentUser?.username) && (
                <OptionItem
                    action={toggleUsernameMention}
                    containerStyle={styles.container}
                    description={intl.formatMessage({id: 'notification_settings.mentions.sensitiveUsername', defaultMessage: 'Your non-case sensitive username'})}
                    label={currentUser.username}
                    selected={usernameMention}
                    type='toggle'
                />
            )}
            <View style={styles.separator}/>
            <OptionItem
                action={toggleChannelMentions}
                containerStyle={styles.container}
                description={intl.formatMessage({id: 'notification_settings.mentions.channelWide', defaultMessage: 'Channel-wide mentions'})}
                label='@channel, @all, @here'
                selected={channel}
                type='toggle'
            />
            <View style={styles.separator}/>
            <FloatingTextInput
                allowFontScaling={true}
                autoCapitalize='none'
                autoCorrect={false}
                blurOnSubmit={true}
                containerStyle={styles.containerStyle}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                label={intl.formatMessage({id: 'notification_settings.mentions.keywords', defaultMessage: 'Keywords'})}
                multiline={true}
                onChangeText={onChangeText}
                placeholder={intl.formatMessage({id: 'notification_settings.mentions..keywordsDescription', defaultMessage: 'Other words that trigger a mention'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                returnKeyType='done'
                textInputStyle={styles.input}
                textAlignVertical='top'
                theme={theme}
                underlineColorAndroid='transparent'
                value={mentionKeys}
            />
        </Block>
    );
};

export default MentionSettings;

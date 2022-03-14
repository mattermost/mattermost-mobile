// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ChannelIcon from '@components/channel_icon';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {BotTag, GuestTag} from '@components/tag';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme, changeOpacity} from '@utils/theme';
import {getUserCustomStatus, isGuest, isShared} from '@utils/user';

type AtMentionItemProps = {
    user: UserProfile;
    currentUserId: string;
    onPress: (username: string) => void;
    showFullName: boolean;
    testID?: string;
    isCustomStatusEnabled: boolean;
}

const getName = (user: UserProfile, showFullName: boolean, isCurrentUser: boolean) => {
    let name = '';
    const hasNickname = user.nickname.length > 0;

    if (showFullName) {
        name += `${user.first_name} ${user.last_name} `;
    }

    if (hasNickname && !isCurrentUser) {
        name += name.length > 0 ? `(${user.nickname})` : user.nickname;
    }

    return name.trim();
};

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
        rowInfo: {
            flexDirection: 'row',
            overflow: 'hidden',
        },
        rowFullname: {
            fontSize: 15,
            color: theme.centerChannelColor,
            paddingLeft: 4,
            flexShrink: 1,
        },
        rowUsername: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 15,
            flexShrink: 5,
        },
        icon: {
            marginLeft: 4,
        },
    };
});

const AtMentionItem = ({
    user,
    currentUserId,
    onPress,
    showFullName,
    testID,
    isCustomStatusEnabled,
}: AtMentionItemProps) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    const guest = isGuest(user.roles);
    const shared = isShared(user);

    const completeMention = useCallback(() => {
        onPress(user.username);
    }, [user.username]);

    const isCurrentUser = currentUserId === user.id;
    const name = getName(user, showFullName, isCurrentUser);
    const customStatus = getUserCustomStatus(user);

    return (
        <TouchableWithFeedback
            testID={testID}
            key={user.id}
            onPress={completeMention}
            underlayColor={changeOpacity(theme.buttonBg, 0.08)}
            style={{marginLeft: insets.left, marginRight: insets.right}}
            type={'native'}
        >
            <View style={style.row}>
                <View style={style.rowPicture}>
                    <ProfilePicture
                        author={user}
                        size={24}
                        showStatus={false}
                        testID='at_mention_item.profile_picture'
                    />
                </View>
                <View
                    style={[style.rowInfo, {maxWidth: shared ? '75%' : '80%'}]}
                >
                    {Boolean(user.is_bot) && (<BotTag/>)}
                    {guest && (<GuestTag/>)}
                    {Boolean(name.length) && (
                        <Text
                            style={style.rowFullname}
                            numberOfLines={1}
                            testID='at_mention_item.name'
                        >
                            {name}
                        </Text>
                    )}
                    {isCurrentUser && (
                        <FormattedText
                            id='suggestion.mention.you'
                            defaultMessage=' (you)'
                            style={style.rowUsername}
                        />
                    )}
                    <Text
                        style={style.rowUsername}
                        numberOfLines={1}
                        testID='at_mention_item.username'
                    >
                        {` @${user.username}`}
                    </Text>
                </View>
                {isCustomStatusEnabled && !user.is_bot && customStatus && (
                    <CustomStatusEmoji
                        customStatus={customStatus}
                        style={style.icon}
                    />
                )}
                {shared && (
                    <ChannelIcon
                        name={name}
                        isActive={false}
                        isArchived={false}
                        isInfo={true}
                        isUnread={true}
                        size={18}
                        shared={true}
                        type={General.DM_CHANNEL}
                        style={style.icon}
                    />
                )}
            </View>
        </TouchableWithFeedback>
    );
};

export default AtMentionItem;

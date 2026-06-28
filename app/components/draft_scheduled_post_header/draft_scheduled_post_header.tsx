// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfileAvatar from '@components/draft_scheduled_post_header/profile_avatar';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {General} from '@constants';
import {DRAFT_TYPE_SCHEDULED, type DraftType} from '@constants/draft';
import {useTheme} from '@context/theme';
import {DEFAULT_LOCALE} from '@i18n';
import {getReadableTimestamp} from '@utils/datetime';
import {getErrorStringFromCode} from '@utils/scheduled_post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {ScheduledPostErrorCode} from '@typings/utils/scheduled_post';

type Props = {
    channel: ChannelModel;
    postReceiverUser?: UserModel;
    updateAt: number;
    rootId?: PostModel['rootId'];
    testID?: string;
    currentUser?: UserModel;
    isMilitaryTime: boolean;
    draftType: DraftType;
    postScheduledAt?: number;
    scheduledPostErrorCode?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        infoContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 1,
            maxWidth: '80%',
        },
        channelInfo: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        category: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'SemiBold'),
            marginRight: 8,
        },
        categoryIconContainer: {
            width: 24,
            height: 24,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            padding: 4,
            borderRadius: 555,
        },
        profileComponentContainer: {
            marginRight: 6,
        },
        displayName: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'SemiBold'),
            flexShrink: 1,
            flexGrow: 1,
        },
        time: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        scheduledContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: 10,
        },
        scheduledAtText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        errorState: {
            backgroundColor: theme.errorTextColor,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginLeft: 8,
            paddingHorizontal: 4,
            borderRadius: 4,
        },
        errorText: {
            color: theme.buttonColor,
            ...typography('Heading', 25),
        },
    };
});

const DraftAndScheduledPostHeader: React.FC<Props> = ({
    channel,
    postReceiverUser,
    updateAt,
    rootId,
    testID,
    currentUser,
    isMilitaryTime,
    draftType,
    postScheduledAt,
    scheduledPostErrorCode,
}) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isDM = channel.type === General.DM_CHANNEL;

    const renderScheduledInfo = () => {
        if (draftType !== DRAFT_TYPE_SCHEDULED) {
            return null;
        }

        const isSent = scheduledPostErrorCode === 'post_send_success_delete_failed';
        const scheduledTime = getReadableTimestamp(
            postScheduledAt!,
            getUserTimezone(currentUser),
            isMilitaryTime,
            currentUser?.locale || DEFAULT_LOCALE,
        );

        return (
            <View style={style.scheduledContainer}>
                <Text
                    style={style.scheduledAtText}
                    testID='scheduled_post_header.scheduled_at'
                >
                    {isSent? intl.formatMessage({id: 'scheduled_post.header.sent', defaultMessage: 'Sent'}): intl.formatMessage(
                        {id: 'channel_info.scheduled', defaultMessage: 'Send on {time}'},
                        {time: scheduledTime},
                    )}
                </Text>

                {scheduledPostErrorCode && (
                    <View style={style.errorState}>
                        <CompassIcon
                            name='alert-outline'
                            size={12}
                            color={theme.buttonColor}
                        />
                        <Text style={style.errorText}>
                            {getErrorStringFromCode(intl, scheduledPostErrorCode as ScheduledPostErrorCode)}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const ChannelInfo = ({id, defaultMessage}: {id: string; defaultMessage: string}) => (
        <View style={style.channelInfo}>
            <FormattedText
                id={id}
                defaultMessage={defaultMessage}
                style={style.category}
            />
            <View style={style.profileComponentContainer}>
                {postReceiverUser ? (
                    <ProfileAvatar author={postReceiverUser}/>
                ) : (
                    <View style={style.categoryIconContainer}>
                        <CompassIcon
                            color={changeOpacity(theme.centerChannelColor, 0.64)}
                            name='globe'
                            size={16}
                        />
                    </View>
                )}
            </View>
        </View>
    );

    const getHeaderLabel = () => {
        if (rootId) {
            return (
                <ChannelInfo
                    id='channel_info.thread_in'
                    defaultMessage='Thread in:'
                />
            );
        }

        if (isDM) {
            return (
                <ChannelInfo
                    id='channel_info.draft_to_user'
                    defaultMessage='To:'
                />
            );
        }

        return (
            <ChannelInfo
                id='channel_info.draft_in_channel'
                defaultMessage='In:'
            />
        );
    };

    return (
        <View>
            {renderScheduledInfo()}
            <View
                style={style.container}
                testID={testID}
            >
                <View style={style.infoContainer}>
                    {getHeaderLabel()}
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={style.displayName}
                    >
                        {channel.displayName}
                    </Text>
                </View>
                <FormattedTime
                    timezone={getUserTimezone(currentUser)}
                    isMilitaryTime={isMilitaryTime}
                    value={updateAt}
                    style={style.time}
                    testID='post_header.date_time'
                />
            </View>
        </View>
    );
};

export default DraftAndScheduledPostHeader;

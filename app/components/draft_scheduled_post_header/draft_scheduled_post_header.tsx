// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfileAvatar from '@components/draft_scheduled_post_header/profile_avatar';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {getReadableTimestamp} from '@utils/datetime';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

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
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        infoContainer: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
        },
        channelInfo: {
            display: 'flex',
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
        },
        time: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        scheduledContainer: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
        },
        scheduledAtText: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75),
        },
        errorState: {
            backgroundColor: theme.errorTextColor,
            display: 'flex',
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
    const isChannelTypeDM = channel.type === General.DM_CHANNEL;

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

    let headerComponent: ReactNode = null;

    if (rootId) {
        headerComponent = (
            <ChannelInfo
                id='channel_info.thread_in'
                defaultMessage='Thread in:'
            />
        );
    } else if (isChannelTypeDM) {
        headerComponent = (
            <ChannelInfo
                id='channel_info.draft_to_user'
                defaultMessage='To:'
            />
        );
    } else {
        headerComponent = (
            <ChannelInfo
                id='channel_info.draft_in_channel'
                defaultMessage='In:'
            />
        );
    }

    return (

        <View>
            {draftType === DRAFT_TYPE_SCHEDULED &&
                <View style={style.scheduledContainer}>
                    <Text style={style.scheduledAtText}>
                        {intl.formatMessage({id: 'channel_info.scheduled', defaultMessage: 'Send on {time}'}, {time: getReadableTimestamp(postScheduledAt!, getUserTimezone(currentUser), isMilitaryTime)})}
                    </Text>
                    {scheduledPostErrorCode &&
                        <View style={style.errorState}>
                            <CompassIcon
                                name='alert-outline'
                                size={12}
                                color={theme.buttonColor}
                            />
                            <Text style={style.errorText}>{'CHANNEL IS READ-ONLY'}</Text>
                        </View>
                    }
                </View>
            }
            <View
                style={style.container}
                testID={testID}
            >
                <View style={style.infoContainer}>
                    {headerComponent}
                    <Text style={style.displayName}>
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

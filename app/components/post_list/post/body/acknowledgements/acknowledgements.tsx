// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, useWindowDimensions} from 'react-native';

import {acknowledgePost, unacknowledgePost} from '@actions/remote/post';
import {fetchMissingProfilesByIds} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {moreThan5minAgo} from '@utils/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import UsersList from './users_list';
import {USER_ROW_HEIGHT} from './users_list/user_list_item';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    currentUserId: UserModel['id'];
    currentUserTimezone: UserModel['timezone'];
    hasReactions: boolean;
    location: AvailableScreens;
    post: PostModel;
    theme: Theme;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.onlineIndicator, 0.12),
            flexDirection: 'row',
            height: 32,
            justifyContent: 'center',
            paddingHorizontal: 8,
        },
        containerActive: {
            backgroundColor: theme.onlineIndicator,
        },
        text: {
            ...typography('Body', 100, 'SemiBold'),
            color: theme.onlineIndicator,
        },
        textActive: {
            color: '#fff',
        },
        icon: {
            marginRight: 4,
        },
        divider: {
            width: 1,
            height: 32,
            marginHorizontal: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.16),
        },
        listHeaderText: {
            marginBottom: 12,
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
    };
});

const Acknowledgements = ({currentUserId, currentUserTimezone, hasReactions, location, post, theme}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const {height} = useWindowDimensions();

    const style = getStyleSheet(theme);

    const isCurrentAuthor = post.userId === currentUserId;
    const acknowledgements = post.metadata?.acknowledgements || [];

    const acknowledgedAt = useMemo(() => {
        if (acknowledgements.length > 0) {
            const ack = acknowledgements.find((item) => item.user_id === currentUserId);

            if (ack) {
                return ack.acknowledged_at;
            }
        }
        return 0;
    }, [acknowledgements]);

    const handleOnPress = useCallback(() => {
        if ((acknowledgedAt && moreThan5minAgo(acknowledgedAt)) || isCurrentAuthor) {
            return;
        }
        if (acknowledgedAt) {
            unacknowledgePost(serverUrl, post.id);
        } else {
            acknowledgePost(serverUrl, post.id);
        }
    }, [acknowledgedAt, isCurrentAuthor, post.id, serverUrl]);

    const handleOnLongPress = useCallback(async () => {
        if (!acknowledgements.length) {
            return;
        }
        const userAcknowledgements: Record<string, number> = {};
        const userIds: string[] = [];

        acknowledgements.forEach((item) => {
            userAcknowledgements[item.user_id] = item.acknowledged_at;
            userIds.push(item.user_id);
        });

        try {
            fetchMissingProfilesByIds(serverUrl, userIds);
        } catch (e) {
            return;
        }

        const renderContent = () => (
            <>
                {!isTablet && (
                    <FormattedText
                        id='mobile.acknowledgements.header'
                        defaultMessage={'Acknowledgements'}
                        style={style.listHeaderText}
                    />
                )}
                <UsersList
                    channelId={post.channelId}
                    location={location}
                    userAcknowledgements={userAcknowledgements}
                    userIds={userIds}
                    timezone={currentUserTimezone || undefined}
                />
            </>
        );

        const snapPoint1 = bottomSheetSnapPoint(Math.min(userIds.length, 5), USER_ROW_HEIGHT) + TITLE_HEIGHT;
        const snapPoint2 = height * 0.8;
        const snapPoints: number[] = [1, Math.min(snapPoint1, snapPoint2)];
        if (userIds.length > 5 && snapPoint1 < snapPoint2) {
            snapPoints.push(snapPoint2);
        }

        bottomSheet({
            closeButtonId: 'close-ack-users-list',
            renderContent,
            initialSnapIndex: 1,
            snapPoints,
            title: intl.formatMessage({id: 'mobile.acknowledgements.header', defaultMessage: 'Acknowledgements'}),
            theme,
        });
    }, [
        acknowledgements, height, intl,
        theme, serverUrl, isTablet, style.listHeaderText,
        post.channelId, location, currentUserTimezone,
    ]);

    return (
        <>
            <TouchableOpacity
                onPress={handleOnPress}
                onLongPress={handleOnLongPress}
                style={[style.container, acknowledgedAt ? style.containerActive : undefined]}
            >
                <CompassIcon
                    color={acknowledgedAt ? '#fff' : theme.onlineIndicator}
                    name='check-circle-outline'
                    size={24}
                    style={style.icon}
                />
                {isCurrentAuthor || acknowledgements.length ? (
                    <Text style={[style.text, acknowledgedAt ? style.textActive : undefined]}>
                        {acknowledgements.length}
                    </Text>
                ) : (
                    <FormattedText
                        id='post_priority.button.acknowledge'
                        defaultMessage='Acknowledge'
                        style={style.text}
                    />
                )}
            </TouchableOpacity>
            {hasReactions && <View style={style.divider}/>}
        </>
    );
};

export default Acknowledgements;

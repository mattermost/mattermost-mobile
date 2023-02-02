// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetProps} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {acknowledgePost, unacknowledgePost} from '@actions/remote/post';
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

type Props = {
    currentUser: UserModel;
    hasReactions: boolean;
    location: string;
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
        listHeader: {
            marginBottom: 12,
        },
        listHeaderText: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
        },
    };
});

const Acknowledgements = ({currentUser, hasReactions, location, post, theme}: Props) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const {bottom} = useSafeAreaInsets();
    const serverUrl = useServerUrl();

    const style = getStyleSheet(theme);

    const isCurrentAuthor = post.userId === currentUser.id;
    const acknowledgements = post.metadata?.acknowledgements || [];

    let acknowledgedAt = 0;
    if (acknowledgements.length) {
        const ack = acknowledgements.find((item) => item.user_id === currentUser.id);
        if (ack) {
            acknowledgedAt = ack.acknowledged_at;
        }
    }

    const handleOnPress = useCallback(() => {
        if ((acknowledgedAt && moreThan5minAgo(acknowledgedAt)) || isCurrentAuthor) {
            return;
        }
        if (acknowledgedAt) {
            unacknowledgePost(serverUrl, post.id);
        } else {
            acknowledgePost(serverUrl, post.id);
        }
    }, [acknowledgedAt, isCurrentAuthor, post, serverUrl]);

    const handleOnLongPress = useCallback(() => {
        if (!acknowledgements.length) {
            return;
        }
        const userAcknowledgements: Record<string, number> = {};
        const userIds: string[] = [];

        acknowledgements.forEach((item) => {
            userAcknowledgements[item.user_id] = item.acknowledged_at;
            userIds.push(item.user_id);
        });

        const renderContent = () => (
            <>
                {!isTablet && (
                    <View style={style.listHeader}>
                        <FormattedText
                            id='mobile.participants.header'
                            defaultMessage={'Thread Participants'}
                            style={style.listHeaderText}
                        />
                    </View>
                )}
                <UsersList
                    channelId={post.channelId}
                    location={location}
                    userAcknowledgements={userAcknowledgements}
                    userIds={userIds}
                />
            </>
        );

        const snapPoints: BottomSheetProps['snapPoints'] = [1, bottomSheetSnapPoint(Math.min(userIds.length, 5), USER_ROW_HEIGHT, bottom) + TITLE_HEIGHT];
        if (userIds.length > 5) {
            snapPoints.push('80%');
        }

        bottomSheet({
            closeButtonId: 'close-ack-users-list',
            renderContent,
            initialSnapIndex: 1,
            snapPoints,
            title: intl.formatMessage({id: 'mobile.participants.header', defaultMessage: 'Thread Participants'}),
            theme,
        });
    }, [bottom, intl, isTablet]);

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

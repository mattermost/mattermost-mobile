// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Pill from '@calls/screens/participants_list/pill';
import {useCurrentCall} from '@calls/state';
import {sortSessions} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import Tag from '@components/tag';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallSession} from '@calls/types/calls';

const PROFILE_SIZE = 32;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 62;
const MIN_ROWS = 5;

type Props = {
    sessionsDict: Dictionary<CallSession>;
    teammateNameDisplay: string;
}

const getStyleSheet = ({theme, bottom}: { theme: Theme; bottom: number }) => {
    return StyleSheet.create({
        header: {
            paddingBottom: 12,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
        },
        headerText: {
            ...typography('Heading', 600, 'SemiBold'),
        },
        rowContainer: {
            flexDirection: 'row',
            paddingTop: 8,
            paddingBottom: 8,
            gap: 16,
            alignItems: 'center',
        },
        row: {
            flexDirection: 'row',
            flex: 1,
            gap: 8,
        },
        picture: {
            borderRadius: PROFILE_SIZE / 2,
            height: PROFILE_SIZE,
            width: PROFILE_SIZE,
        },
        name: {
            ...typography('Body', 200, 'SemiBold'),
            color: theme.centerChannelColor,
            flex: 1,
        },
        you: {
            ...typography('Body', 200, 'SemiBold'),
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        profileIcon: {
            color: changeOpacity(theme.buttonColor, 0.56),
        },
        icons: {
            flexDirection: 'row',
            gap: 16,
        },
        muteIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.40),
        },
        unmutedIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        hostTag: {
            paddingVertical: 4,
        },
        raiseHandIcon: {
            color: theme.awayIndicator,
        },
        screenSharingIcon: {
            color: theme.dndIndicator,
        },
        spacer: {
            height: bottom,
        },
    });
};

export const ParticipantsList = ({sessionsDict, teammateNameDisplay}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const currentCall = useCurrentCall();
    const {bottom} = useSafeAreaInsets();
    const {height} = useWindowDimensions();
    const styles = useMemo(() => getStyleSheet({theme, bottom}), [theme, bottom]);
    const isTablet = useIsTablet();
    const Scroll = useMemo(() => (isTablet ? ScrollView : BottomSheetScrollView), [isTablet]);

    const sessions = sortSessions(intl.locale, teammateNameDisplay, sessionsDict);
    const snapPoint1 = bottomSheetSnapPoint(Math.min(sessions.length, MIN_ROWS), ROW_HEIGHT, bottom) + HEADER_HEIGHT;
    const snapPoint2 = height * 0.8;
    const snapPoints = [1, Math.min(snapPoint1, snapPoint2)];
    if (sessions.length > MIN_ROWS && snapPoint1 < snapPoint2) {
        snapPoints.push(snapPoint2);
    }

    if (!currentCall) {
        return null;
    }

    const renderContent = () => {
        return (
            <>
                <View style={styles.header}>
                    <FormattedText
                        style={styles.headerText}
                        id={'mobile.calls_participants'}
                        defaultMessage={'Participants'}
                    />
                    <Pill text={sessions.length}/>
                </View>
                <Scroll alwaysBounceVertical={false}>
                    {sessions.map((sess) => (
                        <Pressable
                            key={sess.sessionId}
                            testID='users-list'
                            style={styles.rowContainer}
                        >
                            {sess.userModel ? (
                                <ProfilePicture
                                    author={sess.userModel}
                                    size={PROFILE_SIZE}
                                    showStatus={false}
                                    url={currentCall.serverUrl}
                                />
                            ) : (
                                <CompassIcon
                                    name='account-outline'
                                    size={PROFILE_SIZE}
                                    style={styles.profileIcon}
                                />
                            )}
                            <View style={styles.row}>
                                <Text
                                    style={styles.name}
                                    numberOfLines={1}
                                >
                                    {displayUsername(sess.userModel, intl.locale, teammateNameDisplay)}
                                </Text>
                                {sess.sessionId === currentCall.mySessionId &&
                                    <Text style={styles.you}>
                                        {intl.formatMessage({id: 'mobile.calls_you', defaultMessage: '(you)'})}
                                    </Text>
                                }
                                {sess.userId === currentCall.hostId &&
                                    <Tag
                                        id={'mobile.calls_host'}
                                        defaultMessage={'host'}
                                        style={styles.hostTag}
                                    />
                                }
                            </View>
                            <View style={styles.icons}>
                                {sess.reaction?.emoji !== undefined &&
                                    <Emoji
                                        emojiName={sess.reaction.emoji.name}
                                        literal={sess.reaction.emoji.literal}
                                        size={24 - Platform.select({ios: 3, default: 4})}
                                    />
                                }
                                {sess.raisedHand !== 0 &&
                                    <CompassIcon
                                        name={'hand-right'}
                                        size={24}
                                        style={styles.raiseHandIcon}
                                    />
                                }
                                {sess.sessionId === currentCall.screenOn &&
                                    <CompassIcon
                                        name={'monitor'}
                                        size={24}
                                        style={styles.screenSharingIcon}
                                    />
                                }
                                <CompassIcon
                                    name={sess.muted ? 'microphone-off' : 'microphone'}
                                    size={24}
                                    style={sess.muted ? styles.muteIcon : styles.unmutedIcon}
                                />
                            </View>
                        </Pressable>
                    ))}
                    <View style={styles.spacer}/>
                </Scroll>
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            componentId={Screens.CALL_PARTICIPANTS}
            snapPoints={snapPoints}
        />
    );
};

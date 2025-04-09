// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View, useWindowDimensions} from 'react-native';

import BaseChip from '@components/chips/base_chip';
import UserChip from '@components/chips/user_chip';
import CompassIcon from '@components/compass_icon';
import FriendlyDate from '@components/friendly_date';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useTheme} from '@context/theme';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ProgressBar from './progress_bar';

import type PlaybookRunModel from '@typings/database/models/servers/playbook_run_model';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

// import {openUserProfileModal} from '@screens/navigation';

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => ({
    cardContainer: {
        margin: 0,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 4,
        backgroundColor: theme.centerChannelBg,
        flexDirection: 'column',
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        gap: 8,
    },
    cardTitle: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    peopleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastUpdatedText: {
        ...typography('Body', 100, 'Regular'),
    },
    flex: {
        flex: 1,
    },
}));

type Props = {
    run: PlaybookRunModel;
    location: AvailableScreens;
    participants: UserModel[];
    progress: number;
    owner?: UserModel;
};

const PlaybookCard = ({
    run,
    location,
    participants,
    progress,
    owner,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const dimensions = useWindowDimensions();
    const finished = Boolean(run.end_at);

    const onCardPress = useCallback(() => {
        goToPlaybookRun(intl, run.id);
    }, [run.id, intl]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onUserChipPress = useCallback((userId: string) => {
        // openUserProfileModal(intl, theme, {
        //     userId,
        //     channelId: run.channel_id,
        //     location,
        // });
    }, []);

    const icon = useMemo(() => (
        <CompassIcon
            name='product-playbooks'
            size={20}
            color={theme.centerChannelColor}
        />
    ), [theme.centerChannelColor]);

    return (
        <TouchableOpacity
            onPress={onCardPress}
            style={styles.cardContainer}
        >
            <Text
                style={styles.cardTitle}
                numberOfLines={1}
            >
                {run.name}
            </Text>
            <View style={styles.peopleRow}>
                {owner && (
                    <UserChip
                        user={owner}
                        teammateNameDisplay='username'
                        onPress={onUserChipPress}
                    />
                )}
                <UserAvatarsStack
                    channelId={run.channel_id}
                    location={location}
                    users={participants}
                />
            </View>
            <View style={styles.infoRow}>
                <View style={styles.flex}>
                    <Text
                        style={styles.lastUpdatedText}
                        numberOfLines={1}
                    >
                        {intl.formatMessage({
                            id: 'playbook.last_updated',
                            defaultMessage: 'Last updated {date}',
                        }, {
                            date: (
                                <FriendlyDate
                                    value={run.last_update_at}
                                    style={styles.lastUpdatedText}
                                />
                            ),
                        })}
                    </Text>
                </View>
                <BaseChip
                    prefix={icon}
                    label='Playbook with really long name'
                    maxWidth={dimensions.width * 0.20}
                />
            </View>
            <ProgressBar
                progress={progress}
                isActive={!finished}
            />
        </TouchableOpacity>
    );
};

export default PlaybookCard;

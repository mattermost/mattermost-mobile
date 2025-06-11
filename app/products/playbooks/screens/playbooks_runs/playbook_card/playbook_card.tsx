// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessage, useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {CHIP_HEIGHT} from '@components/chips/constants';
import UserChip from '@components/chips/user_chip';
import FriendlyDate from '@components/friendly_date';
import UserAvatarsStack from '@components/user_avatars_stack';
import {useTheme} from '@context/theme';
import {goToPlaybookRun} from '@playbooks/screens/navigation';
import {openUserProfileModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import ProgressBar from './progress_bar';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const VERTICAL_PADDING = 16;
const TITLE_HEIGHT = 24; // From typography at 200 size
const GAP = 8;
const GAPS = GAP * 2;
export const ITEM_HEIGHT = (VERTICAL_PADDING * 2) + TITLE_HEIGHT + GAPS + (CHIP_HEIGHT * 2);

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => ({
    cardContainer: {
        margin: 0,
        paddingVertical: VERTICAL_PADDING,
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
        gap: GAP,
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
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75, 'Regular'),
    },
    flex: {
        flex: 1,
    },
}));

type Props = {
    run: PlaybookRunModel | PlaybookRun;
    location: AvailableScreens;
    participants: UserModel[];
    progress: number;
    owner?: UserModel;
};

const bottomSheetTitleMessage = defineMessage({id: 'playbook.participants', defaultMessage: 'Run Participants'});

const PlaybookCard = ({
    run,
    location,
    participants,
    progress,
    owner,
}: Props) => {
    const endAt = 'endAt' in run ? run.endAt : run.end_at;
    const channelId = 'channelId' in run ? run.channelId : run.channel_id;
    const lastStatusUpdateAt = 'lastStatusUpdateAt' in run ? run.lastStatusUpdateAt : run.last_status_update_at;

    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);
    const finished = Boolean(endAt);

    const onCardPress = useCallback(() => {
        goToPlaybookRun(intl, run.id);
    }, [run.id, intl]);

    const onUserChipPress = useCallback((userId: string) => {
        openUserProfileModal(intl, theme, {
            userId,
            channelId,
            location,
        });
    }, [channelId, intl, theme, location]);

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
                    channelId={channelId}
                    location={location}
                    users={participants}
                    bottomSheetTitle={bottomSheetTitleMessage}
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
                                    value={lastStatusUpdateAt}
                                    style={styles.lastUpdatedText}
                                />
                            ),
                        })}
                    </Text>
                </View>
            </View>
            <ProgressBar
                progress={progress}
                isActive={!finished}
            />
        </TouchableOpacity>
    );
};

export default PlaybookCard;

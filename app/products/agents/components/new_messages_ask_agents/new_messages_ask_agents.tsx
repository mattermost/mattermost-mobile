// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, Pressable} from 'react-native';

import UnreadsSummarySheet from '@agents/components/unreads_summary_sheet';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {bottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    channelId: string;
    lastViewedAt: number;
    isAnalysisLicensed: boolean;
    hasAgents: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: changeOpacity(theme.newMessageSeparator, 0.08),
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginLeft: 4,
    },
    label: {
        color: theme.newMessageSeparator,
        ...typography('Body', 50, 'SemiBold'),
    },
}));

/**
 * "Ask Agents" pill on the New Messages separator (D16): opens the unreads
 * summarization sheet over the unread window. Mirrors the webapp's
 * UnreadsSumarize button, including its license/zero-agent gating; the
 * separator line itself stays non-tappable.
 */
const NewMessagesAskAgents = ({channelId, lastViewedAt, isAnalysisLicensed, hasAgents}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const openSheet = useCallback(() => {
        const renderContent = () => (
            <UnreadsSummarySheet
                channelId={channelId}
                lastViewedAt={lastViewedAt}
            />
        );

        bottomSheet(
            renderContent,
            [1, Platform.select({ios: '46%', default: '40%'})],
        );
    }, [channelId, lastViewedAt]);

    const handlePress = usePreventDoubleTap(openSheet);

    // The plugin 403s interval analysis on unlicensed servers (unless the
    // server runs in development mode), and with zero agents every path
    // through the sheet dead-ends — hide the button for both.
    if (!isAnalysisLicensed || !hasAgents) {
        return null;
    }

    return (
        <Pressable
            onPress={handlePress}
            style={({pressed}) => [styles.button, pressed && {opacity: 0.72}]}
            testID='post_list.new_messages_line.ask_agents'
        >
            <CompassIcon
                name='creation-outline'
                size={12}
                color={theme.newMessageSeparator}
            />
            <FormattedText
                id='agents.channel_summary.ask_agents'
                defaultMessage='Ask Agents'
                style={styles.label}
            />
        </Pressable>
    );
};

export default NewMessagesAskAgents;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';
import {View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import StreamingIndicator from './streaming_indicator';

import type {ProgressPhase} from '@agents/constants';

const messages = defineMessages({
    generating: {id: 'agents.generating', defaultMessage: 'Generating response...'},
    checking_mcp: {id: 'agents.progress.checking_mcp', defaultMessage: 'Checking MCP connections and tools...'},
    loading_conversation: {id: 'agents.progress.loading_conversation', defaultMessage: 'Loading conversation context...'},
    preparing_request: {id: 'agents.progress.preparing_request', defaultMessage: 'Preparing request...'},
    connecting_provider: {id: 'agents.progress.connecting_provider', defaultMessage: 'Connecting to provider...'},
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        fontStyle: 'italic',
        marginRight: 8,
        ...typography('Body', 100),
    },
}));

type Props = {
    progressPhase?: ProgressPhase | null;
};

const WorkingIndicator = ({progressPhase}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <View
            style={styles.container}
            testID='agents.post.working'
        >
            <FormattedText
                {...(progressPhase ? messages[progressPhase] : messages.generating)}
                style={styles.text}
            />
            <StreamingIndicator/>
        </View>
    );
};

export default WorkingIndicator;

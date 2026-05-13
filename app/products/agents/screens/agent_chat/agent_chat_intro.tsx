// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import AgentsIntroIllustration from '@agents/components/illustrations';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    loading: boolean;
    error: string | null;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    introContent: {
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    welcomeText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600),
    },
    descriptionText: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: theme.errorTextColor,
        textAlign: 'center',
        marginTop: 16,
        ...typography('Body', 100),
    },
}));

const AgentChatIntro = ({loading, error}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (loading) {
        return (
            <Loading
                containerStyle={styles.loadingContainer}
                size='large'
                color={theme.buttonBg}
            />
        );
    }

    return (
        <View style={styles.introContent}>
            <AgentsIntroIllustration theme={theme}/>
            <FormattedText
                id='agents.chat.intro_title'
                defaultMessage='Ask Agents anything'
                style={styles.welcomeText}
            />
            <FormattedText
                id='agents.chat.intro_description'
                defaultMessage='Agents are here to help.'
                style={styles.descriptionText}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );

};

export default AgentChatIntro;

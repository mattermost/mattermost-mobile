// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {showUnreadChannelsOnly} from '@actions/local/channel';
import Button from '@components/button';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import EmptyIllustration from './empty_unreads';

type Props = {
    onlyUnreads: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    buttonContainer: {
        marginTop: 24,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        maxWidth: 480,
        top: -20,
    },
    title: {
        marginTop: 24,
        color: theme.sidebarText,
        textAlign: 'center',
        ...typography('Heading', 400, 'SemiBold'),
    },
    paragraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.sidebarText, 0.72),
        ...typography('Body', 200),
    },
}));

function EmptyUnreads({onlyUnreads}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const onPress = () => {
        showUnreadChannelsOnly(serverUrl, !onlyUnreads);
    };

    return (
        <View style={styles.container}>
            <EmptyIllustration/>
            <FormattedText
                defaultMessage='No more unreads'
                id='unreads.empty.title'
                style={styles.title}
                testID='unreads.empty.title'
            />
            <FormattedText
                defaultMessage={'Turn off the unread filter to show all your channels.'}
                id='unreads.empty.paragraph'
                style={styles.paragraph}
                testID='unreads.empty.paragraph'
            />
            <View style={styles.buttonContainer}>
                <Button
                    text={intl.formatMessage({id: 'unreads.empty.show_all', defaultMessage: 'Show all'})}
                    theme={theme}
                    size='lg'
                    onPress={onPress}
                    emphasis='tertiary'
                    isInverted={true}
                />
            </View>
        </View>
    );
}

export default EmptyUnreads;

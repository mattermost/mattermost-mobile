// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {useCallback} from 'react';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {switchToPenultimateChannel} from '@actions/remote/channel';
import FormattedMarkdownText from '@components/formatted_markdown_text';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {popToRoot} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    testID?: string;
    deactivated?: boolean;
    location: AvailableScreens;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    archivedWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopWidth: 1,
        backgroundColor: theme.centerChannelBg,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
    },
    baseTextStyle: {
        ...typography('Body', 200, 'Regular'),
        color: theme.centerChannelColor,
    },
    archivedText: {
        textAlign: 'center',
        color: theme.centerChannelColor,
    },
    closeButton: {
        backgroundColor: theme.buttonBg,
        alignItems: 'center',
        paddingVertical: 5,
        borderRadius: 4,
        marginTop: 10,
        height: 40,
    },
    closeButtonText: {
        marginTop: 1,
        color: 'white',
        fontWeight: 'bold',
    },
}));

const edges: Edge[] = ['bottom'];

export default function Archived({
    testID,
    deactivated,
    location,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const onCloseChannelPress = useCallback(() => {
        if (isTablet) {
            switchToPenultimateChannel(serverUrl);
        } else {
            popToRoot();
        }
    }, [serverUrl, isTablet]);

    let message = {
        id: t('archivedChannelMessage'),
        defaultMessage: 'You are viewing an **archived channel**. New messages cannot be posted.',
    };

    if (deactivated) {
        // only applies to DM's when the user was deactivated
        message = {
            id: t('create_post.deactivated'),
            defaultMessage: 'You are viewing an archived channel with a deactivated user.',
        };
    }

    return (
        <SafeAreaView
            edges={edges}
            testID={testID}
            style={style.archivedWrapper}
        >
            <FormattedMarkdownText
                {...message}
                style={style.archivedText}
                baseTextStyle={style.baseTextStyle}
                location={location}
            />
            <Button
                buttonStyle={style.closeButton}
                onPress={onCloseChannelPress}
                testID={`${testID}.close_channel.button`}
            >
                <FormattedText
                    id='center_panel.archived.closeChannel'
                    defaultMessage='Close Channel'
                    style={style.closeButtonText}
                />
            </Button>
        </SafeAreaView>
    );
}

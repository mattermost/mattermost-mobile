// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import ChannelActions from '@components/channel_actions';
import {useTheme} from '@context/theme';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DestructiveOptions from './destructive_options';
import Extra from './extra';
import Options from './options';
import Title from './title';

type Props = {
    channelId: string;
    closeButtonId: string;
    componentId: string;
    type?: ChannelType;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    content: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    flex: {
        flex: 1,
    },
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginVertical: 8,
    },
}));

const ChannelInfo = ({channelId, closeButtonId, componentId, type}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const update = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: {buttonId: string}) => {
                if (buttonId === closeButtonId) {
                    dismissModal({componentId});
                }
            },
        }, componentId);

        return () => {
            update.remove();
        };
    }, []);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
        >
            <ScrollView
                bounces={true}
                alwaysBounceVertical={false}
                contentContainerStyle={styles.content}
            >
                <Title
                    channelId={channelId}
                    type={type}
                />
                <ChannelActions
                    channelId={channelId}
                    inModal={true}
                />
                <Extra channelId={channelId}/>
                <View style={styles.separator}/>
                <Options
                    channelId={channelId}
                    type={type}
                />
                <View style={styles.separator}/>
                <DestructiveOptions
                    channelId={channelId}
                    componentId={componentId}
                    type={type}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

export default ChannelInfo;

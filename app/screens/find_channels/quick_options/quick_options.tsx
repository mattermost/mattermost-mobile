// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet, View} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';

import OptionBox, {OPTIONS_HEIGHT} from '@components/option_box';
import {Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';

type Props = {
    canCreateChannels: boolean;
    canJoinChannels: boolean;
    close: () => Promise<void>;
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        alignItems: 'center',
    },
    wrapper: {
        flexDirection: 'row',
        height: OPTIONS_HEIGHT,
    },
    separator: {
        width: 8,
    },
});

const QuickOptions = ({canCreateChannels, canJoinChannels, close}: Props) => {
    const intl = useIntl();

    const browseChannels = useCallback(async () => {
        await close();
        navigateToScreen(Screens.BROWSE_CHANNELS);
    }, [close]);

    const createNewChannel = useCallback(async () => {
        await close();
        navigateToScreen(Screens.CREATE_OR_EDIT_CHANNEL);
    }, [close]);

    const openDirectMessage = useCallback(async () => {
        await close();
        navigateToScreen(Screens.CREATE_DIRECT_MESSAGE);
    }, [close]);
    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={Platform.select({ios: FadeOutUp.duration(100)}) /* https://mattermost.atlassian.net/browse/MM-63814?focusedCommentId=178584 */}
            style={styles.container}
        >
            <Animated.View style={styles.wrapper}>
                {canJoinChannels &&
                <>
                    <OptionBox
                        iconName='globe'
                        onPress={browseChannels}
                        text={intl.formatMessage({id: 'find_channels.directory', defaultMessage: 'Directory'})}
                        testID='find_channels.quick_options.directory.option'
                    />
                    <View style={styles.separator}/>
                </>
                }
                <OptionBox
                    iconName='account-outline'
                    onPress={openDirectMessage}
                    text={intl.formatMessage({id: 'find_channels.open_dm', defaultMessage: 'Open a DM'})}
                    testID='find_channels.quick_options.open_dm.option'
                />
                {canCreateChannels &&
                <>
                    <View style={styles.separator}/>
                    <OptionBox
                        iconName='plus'
                        onPress={createNewChannel}
                        text={intl.formatMessage({id: 'find_channels.new_channel', defaultMessage: 'New Channel'})}
                        testID='find_channels.quick_options.new_channel.option'
                    />
                </>
                }
            </Animated.View>
        </Animated.View>
    );
};

export default QuickOptions;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import {removePost} from '@actions/local/post';
import {retryFailedPost} from '@actions/remote/post';
import CompassIcon from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';

import type PostModel from '@typings/database/models/servers/post';

type FailedProps = {
    post: PostModel;
    theme: Theme;
}

const styles = StyleSheet.create({
    bottomSheet: {
        flex: 1,
    },
    retry: {
        justifyContent: 'center',
        marginLeft: 10,
    },
});

const Failed = ({post, theme}: FailedProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onPress = useCallback(() => {
        const renderContent = () => {
            return (
                <View
                    testID='at_mention.bottom_sheet'
                    style={styles.bottomSheet}
                >
                    <SlideUpPanelItem
                        leftIcon='send-outline'
                        onPress={() => {
                            dismissBottomSheet();
                            retryFailedPost(serverUrl, post);
                        }}
                        testID='post.failed.retry'
                        text={intl.formatMessage({id: 'mobile.post.failed_retry', defaultMessage: 'Try Again'})}
                    />
                    <SlideUpPanelItem
                        destructive={true}
                        leftIcon='close-circle-outline'
                        onPress={() => {
                            dismissBottomSheet();
                            removePost(serverUrl, post);
                        }}
                        testID='post.failed.delete'
                        text={intl.formatMessage({id: 'mobile.post.failed_delete', defaultMessage: 'Delete Message'})}
                    />
                </View>
            );
        };

        bottomSheet({
            closeButtonId: 'close-post-failed',
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)],
            title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
            theme,
        });
    }, [intl, post, serverUrl, theme]);

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.retry}
        >
            <CompassIcon
                name='information-outline'
                size={26}
                color={theme.errorTextColor}
            />
        </TouchableOpacity>
    );
};

export default Failed;

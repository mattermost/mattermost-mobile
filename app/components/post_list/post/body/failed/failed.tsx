// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';

import {showModalOverCurrentContext} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import NavigationTypes from '@constants/navigation';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {t} from '@utils/i18n';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/preferences';

type FailedProps = {
    createPost: (post: Post) => void;
    post: Post;
    removePost: (post: Post) => void;
    theme: Theme;
}

const styles = StyleSheet.create({
    retry: {
        justifyContent: 'center',
        marginLeft: 10,
    },
});

const Failed = ({createPost, post, removePost, theme}: FailedProps) => {
    const onPress = useCallback(() => {
        const screen = 'OptionsModal';
        const passProps = {
            title: {
                id: t('mobile.post.failed_title'),
                defaultMessage: 'Unable to send your message:',
            },
            items: [{
                action: () => {
                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    createPost(post);
                },
                text: {
                    id: t('mobile.post.failed_retry'),
                    defaultMessage: 'Try Again',
                },
            }, {
                action: () => {
                    EventEmitter.emit(NavigationTypes.NAVIGATION_CLOSE_MODAL);
                    removePost(post);
                },
                text: {
                    id: t('mobile.post.failed_delete'),
                    defaultMessage: 'Delete Message',
                },
                textStyle: {
                    color: '#CC3239',
                },
            }],
        };

        showModalOverCurrentContext(screen, passProps);
    }, []);

    return (
        <TouchableWithFeedback
            onPress={onPress}
            style={styles.retry}
            type={'opacity'}
        >
            <CompassIcon
                name='information-outline'
                size={26}
                color={theme.errorTextColor}
            />
        </TouchableWithFeedback>
    );
};

export default Failed;

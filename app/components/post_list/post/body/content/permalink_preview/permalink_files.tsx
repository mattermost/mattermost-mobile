// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useCallback} from 'react';
import {DeviceEventEmitter, View, type LayoutChangeEvent, StyleSheet} from 'react-native';

import Files from '@components/files';
import {Events} from '@constants';

import type PostModel from '@typings/database/models/servers/post';

type PermalinkFilesProps = {
    post: PostModel;
    location: string;
    isReplyPost: boolean;
    failed?: boolean;
    parentLocation?: string;
    parentPostId?: string;
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
    },
});

const PermalinkFiles = (props: PermalinkFilesProps) => {
    const {parentLocation, parentPostId, post, location, isReplyPost, failed} = props;
    const [layoutWidth, setLayoutWidth] = useState(0);

    const listener = useCallback((viewableItemsMap: Record<string, boolean>) => {
        if (!parentLocation || !parentPostId) {
            return;
        }

        const parentKey = `${parentLocation}-${parentPostId}`;
        if (viewableItemsMap[parentKey]) {
            const viewableItems = {[`${location}-${post.id}`]: true};
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItems);
        }
    }, [parentLocation, parentPostId, location, post.id]);

    useEffect(() => {
        if (!parentLocation || !parentPostId) {
            return undefined;
        }

        const subscription = DeviceEventEmitter.addListener(Events.ITEM_IN_VIEWPORT, listener);
        return () => subscription.remove();
    }, [listener, parentLocation, parentPostId]);

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        setLayoutWidth(event.nativeEvent.layout.width);
    }, []);

    return (
        <View
            onLayout={onLayout}
            testID='permalink-files-container'
            style={styles.container}
        >
            <Files
                post={post}
                location={location}
                isReplyPost={isReplyPost}
                failed={failed}
                layoutWidth={layoutWidth}
                isPermalinkPreview={true}
            />
        </View>
    );
};

export default PermalinkFiles;

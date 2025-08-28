// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {DeviceEventEmitter, View, type LayoutChangeEvent} from 'react-native';

import Files from '@components/files/files';
import {Events} from '@constants';

const PermalinkFiles = (props: React.ComponentProps<typeof Files> & {parentLocation?: string; parentPostId?: string}) => {
    const {parentLocation, parentPostId, ...filesProps} = props;
    const [layoutWidth, setLayoutWidth] = useState(0);

    useEffect(() => {
        if (!parentLocation || !parentPostId) {
            return undefined;
        }

        const listener = (viewableItemsMap: Record<string, boolean>) => {
            const parentKey = `${parentLocation}-${parentPostId}`;
            if (viewableItemsMap[parentKey]) {
                const viewableItems = {[`${props.location}-${props.postId}`]: true};
                DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItems);
            }
        };

        DeviceEventEmitter.addListener(Events.ITEM_IN_VIEWPORT, listener);
        return () => DeviceEventEmitter.removeAllListeners(Events.ITEM_IN_VIEWPORT);
    }, [parentLocation, parentPostId, props.location, props.postId]);

    const onLayout = (event: LayoutChangeEvent) => {
        setLayoutWidth(event.nativeEvent.layout.width);
    };

    return (
        <View onLayout={onLayout}>
            <Files
                {...filesProps}
                layoutWidth={layoutWidth}
            />
        </View>
    );
};

export default PermalinkFiles;

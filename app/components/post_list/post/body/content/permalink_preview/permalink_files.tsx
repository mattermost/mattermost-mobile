// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useCallback} from 'react';
import {DeviceEventEmitter, View, type LayoutChangeEvent} from 'react-native';

import Files from '@components/files/files';
import {Events} from '@constants';

type PermalinkFilesProps = React.ComponentProps<typeof Files> & {
    parentLocation?: string;
    parentPostId?: string;
};

const PermalinkFiles = (props: PermalinkFilesProps) => {
    const {parentLocation, parentPostId, ...filesProps} = props;
    const [layoutWidth, setLayoutWidth] = useState(0);

    const listener = useCallback((viewableItemsMap: Record<string, boolean>) => {
        if (!parentLocation || !parentPostId) {
            return;
        }

        const parentKey = `${parentLocation}-${parentPostId}`;
        if (viewableItemsMap[parentKey]) {
            const viewableItems = {[`${filesProps.location}-${filesProps.postId}`]: true};
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItems);
        }
    }, [parentLocation, parentPostId, filesProps.location, filesProps.postId]);

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
        <View onLayout={onLayout}>
            <Files
                {...filesProps}
                layoutWidth={layoutWidth}
                isPermalinkPreview={true}
            />
        </View>
    );
};

export default PermalinkFiles;

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useEffect} from 'react';
import {Text} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {ITEM_HEIGHT} from '@components/menu_item';
import {Screens} from '@constants';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';

import type ThreadModel from '@typings/database/models/servers/thread';

type PostOptionsProps = {
    componentId: string;
    thread: ThreadModel;
};

const PostOptions = ({
    componentId,
}: PostOptionsProps) => {
    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case 'close-thread-options': {
                        dismissModal({componentId});
                        break;
                    }
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, []);

    const renderContent = () => {
        return (
            <>
                <Text>{componentId}</Text>
            </>
        );
    };

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-thread-options'
            componentId={Screens.THREAD_OPTIONS}
            initialSnapIndex={0}
            snapPoints={[(8 * ITEM_HEIGHT), 10]}
        />
    );
};

export default PostOptions;

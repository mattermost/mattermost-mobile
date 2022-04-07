// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import FormattedText from '@components/formatted_text';
import {ITEM_HEIGHT} from '@components/menu_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import CopyLinkOption from './options/copy_link_option';
import MarkAsUnreadOption from './options/mark_as_unread_option';
import OpenInChannelOption from './options/open_in_channel_option';
import ReplyOption from './options/reply_option';
import SaveOption from './options/save_option';
import UnfollowThreadOption from './options/unfollow_thread_option';

import type TeamModel from '@typings/database/models/servers/team';
import type ThreadModel from '@typings/database/models/servers/thread';

type PostOptionsProps = {
    componentId: string;
    team: TeamModel;
    thread: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        listHeader: {
            marginBottom: 12,
        },
        listHeaderText: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 12,
            fontWeight: '600',
        },
    };
});

const ThreadOptions = ({
    componentId,
    team,
    thread,
}: PostOptionsProps) => {
    const theme = useTheme();
    const isTablet = useIsTablet();

    const style = getStyleSheet(theme);

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

    const options = [
        <ReplyOption
            key='reply'
            threadId={thread.id}
        />,
        <UnfollowThreadOption
            key='unfollow'
            teamId={team.id}
            threadId={thread.id}
        />,
        <OpenInChannelOption
            key='open-in-channel'
            threadId={thread.id}
        />,
        <MarkAsUnreadOption
            key='mark-as-unread'
            teamId={team.id}
            thread={thread}
        />,
        <SaveOption
            key='save'
            threadId={thread.id}
        />,
    ];

    const managedConfig = useManagedConfig<ManagedConfig>();
    const canCopyLink = managedConfig?.copyAndPasteProtection !== 'true';
    if (canCopyLink) {
        options.push(
            <CopyLinkOption
                key='copy-link'
                team={team}
                threadId={thread.id}
            />,
        );
    }

    const renderContent = () => (
        <>
            {!isTablet && (
                <View style={style.listHeader}>
                    <FormattedText
                        id='global_threads.options.title'
                        defaultMessage={'THREAD ACTIONS'}
                        style={style.listHeaderText}
                    />
                </View>
            )}
            {options}
        </>
    );

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-thread-options'
            componentId={Screens.THREAD_OPTIONS}
            initialSnapIndex={0}
            snapPoints={[((options.length + 2) * ITEM_HEIGHT), 10]}
        />
    );
};

export default ThreadOptions;

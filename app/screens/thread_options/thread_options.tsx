// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useEffect} from 'react';
import {View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {CopyPermalinkOption, FollowThreadOption, ReplyOption, SaveOption} from '@components/common_post_options';
import FormattedText from '@components/formatted_text';
import {ITEM_HEIGHT} from '@components/menu_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {dismissModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import MarkAsUnreadOption from './options/mark_as_unread_option';
import OpenInChannelOption from './options/open_in_channel_option';

import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';
import type ThreadModel from '@typings/database/models/servers/thread';

type ThreadOptionsProps = {
    componentId: string;
    isSaved: boolean;
    post: PostModel;
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
            textTransform: 'uppercase',
            ...typography('Body', 75, 'SemiBold'),
        },
    };
});

const ThreadOptions = ({
    componentId,
    isSaved,
    post,
    team,
    thread,
}: ThreadOptionsProps) => {
    const theme = useTheme();
    const isTablet = useIsTablet();

    const style = getStyleSheet(theme);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                if (buttonId === 'close-thread-options') {
                    dismissModal({componentId});
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
            location={Screens.THREAD_OPTIONS}
            post={post}
        />,
        <FollowThreadOption
            key='unfollow'
            thread={thread}
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
            isSaved={isSaved}
            postId={thread.id}
        />,
    ];

    const managedConfig = useManagedConfig<ManagedConfig>();
    const canCopyLink = managedConfig?.copyAndPasteProtection !== 'true';
    if (canCopyLink) {
        options.push(
            <CopyPermalinkOption
                key='copy-link'
                post={post}
                sourceScreen={Screens.THREAD_OPTIONS}
            />,
        );
    }

    const renderContent = () => (
        <>
            {!isTablet && (
                <View style={style.listHeader}>
                    <FormattedText
                        id='global_threads.options.title'
                        defaultMessage={'Thread actions'}
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
            testID='thread_options'
        />
    );
};

export default ThreadOptions;

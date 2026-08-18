// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CopyTextOption from '@components/copy_text_option';
import DeleteDraft from '@components/draft_scheduled_post/draft_scheduled_post_actions/delete_draft';
import EditDraft from '@components/draft_scheduled_post/draft_scheduled_post_actions/edit_draft';
import RescheduledDraft from '@components/draft_scheduled_post/draft_scheduled_post_actions/rescheduled_draft';
import FormattedText from '@components/formatted_text';
import SendHandler from '@components/post_draft/send_handler/';
import {Screens} from '@constants';
import {isEdgeToEdge} from '@constants/device';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@constants/draft';
import {NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN} from '@constants/view';
import {useTheme} from '@context/theme';
import BottomSheet from '@screens/bottom_sheet';
import {emptyFunction} from '@utils/general';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {isRecurringScheduledPost} from '@utils/scheduled_post';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

type Props = {
    draftType: DraftType;
    channel: ChannelModel;
    rootId: string;
    draft: DraftModel | ScheduledPostModel;
    draftReceiverUserName: string | undefined;
}

export const DRAFT_OPTIONS_BUTTON = 'close-post-options';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            ...typography('Heading', 600, 'SemiBold'),
            display: 'flex',
            paddingBottom: 4,
            color: theme.centerChannelColor,
        },
    };
});

const TITLE_HEIGHT = 64;
const ITEM_HEIGHT = 48;

// Copy text and delete render for every draft type; every other option is conditional.
const ALWAYS_SHOWN_ITEMS = 2;

const DraftScheduledPostOptions: React.FC<Props> = ({
    draftType,
    channel,
    rootId,
    draft,
    draftReceiverUserName,
}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {bottom} = useSafeAreaInsets();

    const showEditDraft = draftType === DRAFT_TYPE_DRAFT;
    const showRescheduleDraft = draftType === DRAFT_TYPE_SCHEDULED;

    // Sending a recurring scheduled post now would end or fork the series, so the option is
    // absent rather than disabled, matching the webapp.
    const showSend = !isRecurringScheduledPost(draft);

    const snapPoints = useMemo(() => {
        const snapBottom = isEdgeToEdge ? bottom : NOT_EDGE_TO_EDGE_BOTTOM_SHEET_MARGIN;
        const itemCount = ALWAYS_SHOWN_ITEMS + (showEditDraft ? 1 : 0) + (showRescheduleDraft ? 1 : 0) + (showSend ? 1 : 0);
        const componentHeight = TITLE_HEIGHT + bottomSheetSnapPoint(itemCount, ITEM_HEIGHT);
        return [1, componentHeight + snapBottom];
    }, [bottom, showEditDraft, showRescheduleDraft, showSend]);

    const renderContent = () => {
        return (
            <View>
                {(
                    draftType === DRAFT_TYPE_DRAFT ? (
                        <FormattedText
                            id='draft.option.header'
                            defaultMessage='Draft actions'
                            style={styles.header}
                        />
                    ) : (
                        <FormattedText
                            id='scheduled_post.option.header'
                            defaultMessage='Message actions'
                            style={styles.header}
                        />
                    )
                )}
                <CopyTextOption
                    postMessage={draft.message}
                    sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
                    key={draft.id}
                />
                {showEditDraft &&
                    <EditDraft
                        channel={channel}
                        rootId={rootId}
                    />
                }
                {showSend &&
                    <SendHandler
                        channelId={channel.id}
                        rootId={rootId}
                        files={draft.files}
                        value={draft.message}
                        draftReceiverUserName={draftReceiverUserName}
                        isFromDraftView={true}
                        uploadFileError={null}
                        cursorPosition={0}
                        draftType={draftType}
                        postId={draft.id}
                        clearDraft={emptyFunction}
                        updateCursorPosition={emptyFunction}
                        updatePostInputTop={emptyFunction}
                        addFiles={emptyFunction}
                        setIsFocused={emptyFunction}
                        updateValue={emptyFunction}
                    />
                }
                {showRescheduleDraft &&
                    <RescheduledDraft draftId={draft.id}/>
                }
                <DeleteDraft
                    channelId={channel.id}
                    rootId={rootId}
                    draftType={draftType}
                    postId={draft.id}
                />
            </View>
        );
    };

    return (
        <BottomSheet
            screen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            renderContent={renderContent}
            snapPoints={snapPoints}
            testID='draft_options'
        />
    );
};

export default DraftScheduledPostOptions;

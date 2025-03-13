// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Platform, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import SendHandler from '@components/post_draft/send_handler/';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import CopyTextOption from '@screens/post_options/options/copy_text_option';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import DeleteDraft from './delete_draft';
import EditDraft from './edit_draft';
import RescheduledDraft from './rescheduled_draft';

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

const TITLE_HEIGHT = 54;
const ITEM_HEIGHT = 48;

const DraftScheduledPostOptions: React.FC<Props> = ({
    draftType,
    channel,
    rootId,
    draft,
    draftReceiverUserName,
}) => {
    const isTablet = useIsTablet();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const snapPoints = useMemo(() => {
        const bottomSheetAdjust = Platform.select({ios: 5, default: 20});
        const COMPONENT_HEIGHT = TITLE_HEIGHT + (4 * ITEM_HEIGHT) + bottomSheetAdjust;
        return [1, COMPONENT_HEIGHT];
    }, []);

    const renderContent = () => {
        return (
            <View>
                {!isTablet && (
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
                    bottomSheetId={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
                    postMessage={draft.message}
                    sourceScreen={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
                    key={draft.id}
                />
                {draftType === DRAFT_TYPE_DRAFT &&
                    <EditDraft
                        bottomSheetId={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
                        channel={channel}
                        rootId={rootId}
                    />
                }
                <SendHandler
                    bottomSheetId={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
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
                    /* eslint-disable no-empty-function */
                    clearDraft={() => {}}
                    updateCursorPosition={() => {}}
                    updatePostInputTop={() => {}}
                    addFiles={() => {}}
                    setIsFocused={() => {}}
                    updateValue={() => {}}
                    /* eslint-enable no-empty-function */
                />
                {draftType === DRAFT_TYPE_SCHEDULED &&
                    <RescheduledDraft
                        bottomSheetId={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
                        draft={draft as ScheduledPostModel}
                    />
                }
                <DeleteDraft
                    bottomSheetId={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
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
            componentId={Screens.DRAFT_SCHEDULED_POST_OPTIONS}
            renderContent={renderContent}
            closeButtonId={DRAFT_OPTIONS_BUTTON}
            snapPoints={snapPoints}
            testID='draft_options'
        />
    );
};

export default DraftScheduledPostOptions;

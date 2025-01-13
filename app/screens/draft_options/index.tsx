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
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import DeleteDraft from './delete_draft';
import EditDraft from './edit_draft';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    channel: ChannelModel;
    rootId: string;
    draft: DraftModel;
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

const DraftOptions: React.FC<Props> = ({
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
        const COMPONENT_HIEGHT = TITLE_HEIGHT + (3 * ITEM_HEIGHT) + bottomSheetAdjust;
        return [1, COMPONENT_HIEGHT];
    }, []);

    const renderContent = () => {
        return (
            <View>
                {!isTablet &&
                <FormattedText
                    id='draft.option.header'
                    defaultMessage='Draft actions'
                    style={styles.header}
                />}
                <EditDraft
                    bottomSheetId={Screens.DRAFT_OPTIONS}
                    channel={channel}
                    rootId={rootId}
                />
                <SendHandler
                    bottomSheetId={Screens.DRAFT_OPTIONS}
                    channelId={channel.id}
                    rootId={rootId}
                    files={draft.files}
                    value={draft.message}
                    draftReceiverUserName={draftReceiverUserName}
                    isFromDraftView={true}
                    uploadFileError={null}
                    cursorPosition={0}
                    /* eslint-disable no-empty-function */
                    clearDraft={() => {}}
                    updateCursorPosition={() => {}}
                    updatePostInputTop={() => {}}
                    addFiles={() => {}}
                    setIsFocused={() => {}}
                    updateValue={() => {}}
                    /* eslint-enable no-empty-function */
                />
                <DeleteDraft
                    bottomSheetId={Screens.DRAFT_OPTIONS}
                    channelId={channel.id}
                    rootId={rootId}
                />
            </View>
        );
    };

    return (
        <BottomSheet
            componentId={Screens.DRAFT_OPTIONS}
            renderContent={renderContent}
            closeButtonId={DRAFT_OPTIONS_BUTTON}
            snapPoints={snapPoints}
            testID='draft_options'
        />
    );
};

export default DraftOptions;

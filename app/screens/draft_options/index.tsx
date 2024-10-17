// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View, Text} from 'react-native';

import {Screens} from '@app/constants';
import {useIsTablet} from '@app/hooks/device';
import {typography} from '@app/utils/typography';
import BottomSheet from '@screens/bottom_sheet';

import DeleteDraft from './delete_draft';
import EditDraft from './edit_draft';
import SendDraft from './send_draft';

import type ChannelModel from '@typings/database/models/servers/channel';
import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    channel: ChannelModel;
    rootId: string;
    draft: DraftModel;
    draftReceiverUserName: string | undefined;
}

export const DRAFT_OPTIONS_BUTTON = 'close-post-options';

const styles = StyleSheet.create({
    header: {
        ...typography('Heading', 600, 'SemiBold'),
        display: 'flex',
        paddingBottom: 4,
    },
});

const DraftOptions: React.FC<Props> = ({
    channel,
    rootId,
    draft,
    draftReceiverUserName,
}) => {
    const {formatMessage} = useIntl();
    const isTablet = useIsTablet();
    const renderContent = () => {
        return (
            <View>
                {!isTablet && <Text style={styles.header}>{formatMessage(
                    {id: 'draft.option.header', defaultMessage: 'Draft actions'},
                )}</Text>}
                <EditDraft
                    bottomSheetId={Screens.DRAFT_OPTIONS}
                    channel={channel}
                    rootId={rootId}
                />
                <SendDraft
                    bottomSheetId={Screens.DRAFT_OPTIONS}
                    channelId={channel.id}
                    rootId={rootId}
                    files={draft.files}
                    value={draft.message}
                    draftReceiverUserName={draftReceiverUserName}
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
            snapPoints={[200, 250]}
            testID='draft_options'
        />
    );
};

export default DraftOptions;

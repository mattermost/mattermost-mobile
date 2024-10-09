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

export const DRAFT_OPTIONS_BUTTON = 'close-post-options';

const styles = StyleSheet.create({
    header: {
        ...typography('Heading', 600, 'SemiBold'),
        display: 'flex',
        paddingBottom: 4,
    },
});

const DraftOptions = () => {
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
                />
                <SendDraft
                    bottomSheetId={Screens.DRAFT_OPTIONS}
                />
                <DeleteDraft
                    bottomSheetId={Screens.DRAFT_OPTIONS}
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

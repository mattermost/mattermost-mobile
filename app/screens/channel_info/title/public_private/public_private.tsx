// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet, Text, View} from 'react-native';

import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {ANDROID_33, OS_VERSION} from '@constants/versions';
import {useTheme} from '@context/theme';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {showSnackBar} from '@utils/snack_bar';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    displayName?: string;
    purpose?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    title: {
        color: theme.centerChannelColor,
        ...typography('Heading', 700, 'SemiBold'),
    },
    purpose: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginTop: 8,
        ...typography('Body', 200),
    },
}));

const style = StyleSheet.create({
    bottomsheet: {
        flex: 1,
    },
});

const PublicPrivate = ({displayName, purpose}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const managedConfig = useManagedConfig<ManagedConfig>();

    const styles = getStyleSheet(theme);
    const publicPrivateTestId = 'channel_info.title.public_private';

    const onCopy = useCallback(async () => {
        Clipboard.setString(purpose!);
        await dismissBottomSheet();
        if ((Platform.OS === OS_VERSION.ANDROID && Number(Platform.Version) < ANDROID_33) || Platform.OS === OS_VERSION.IOS) {
            showSnackBar({barType: SNACK_BAR_TYPE.TEXT_COPIED});
        }
    }, [purpose]);

    const handleLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View style={style.bottomsheet}>
                        <SlideUpPanelItem
                            leftIcon='content-copy'
                            onPress={onCopy}
                            testID={`${publicPrivateTestId}.bottom_sheet.copy_purpose`}
                            text={intl.formatMessage({id: 'channel_info.copy_purpose_text', defaultMessage: 'Copy Purpose Text'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            leftIcon='cancel'
                            onPress={() => {
                                dismissBottomSheet();
                            }}
                            testID={`${publicPrivateTestId}.bottom_sheet.cancel`}
                            text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        />
                    </View>
                );
            };

            bottomSheet({
                closeButtonId: 'close-mardown-link',
                renderContent,
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig?.copyAndPasteProtection, intl, theme, onCopy]);

    return (
        <>
            <Text
                style={styles.title}
                testID={`${publicPrivateTestId}.display_name`}
            >
                {displayName}
            </Text>
            {Boolean(purpose) &&
            <Text
                onLongPress={handleLongPress}
                style={styles.purpose}
                testID={`${publicPrivateTestId}.purpose`}
            >
                {purpose}
            </Text>
            }
        </>
    );
};

export default PublicPrivate;

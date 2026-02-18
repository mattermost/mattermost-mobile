// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    type LayoutChangeEvent,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FormattedDate from '@components/formatted_date';
import Tag from '@components/tag';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const DATE_TIME_FORMAT = {dateStyle: 'long', timeStyle: 'short'} as const;

type Props = {
    device: DisplayDevice;
    onRemoveDevice?: (deviceId: string) => void;
    onVerifyDevice?: (deviceId: string) => void;
    timezone: string | UserTimezone | null;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    nameAndBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    name: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    thisDeviceLabel: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
    },
    chevron: {
        marginLeft: 'auto',
    },
    chevronIcon: {
        fontSize: 18,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    subtitle: {
        ...typography('Body', 100),
        color: changeOpacity(theme.centerChannelColor, 0.75),
        marginTop: 4,
    },
    expandedContent: {
        paddingVertical: 16,
        gap: 12,
    },
    heightCalculator: {
        position: 'absolute',
        left: 9999,
        opacity: 0,
    },
    activityRow: {
        gap: 4,
    },
    activityLabel: {
        ...typography('Body', 50, 'SemiBold'),
        color: changeOpacity(theme.centerChannelColor, 0.75),
    },
    activityValue: {
        ...typography('Body', 200),
        color: theme.centerChannelColor,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    buttonFlex: {
        flex: 1,
    },
}));

function DeviceDetails({
    device,
    intl,
    onRemoveDevice,
    onVerifyDevice,
    styles,
    theme,
    timezone,
}: {
    device: EnabledDevice;
    intl: ReturnType<typeof useIntl>;
    onRemoveDevice?: (deviceId: string) => void;
    onVerifyDevice?: (deviceId: string) => void;
    styles: ReturnType<typeof getStyleSheet>;
    theme: Theme;
    timezone: string | UserTimezone | null;
}) {
    const handleRemove = usePreventDoubleTap(() => {
        onRemoveDevice?.(device.device_id);
    });
    const handleVerify = usePreventDoubleTap(() => {
        onVerifyDevice?.(device.device_id);
    });

    return (
        <>
            {device.last_active_at != null && (
                <View style={styles.activityRow}>
                    <Text style={styles.activityLabel}>
                        {intl.formatMessage({id: 'e2ee.device.last_activity', defaultMessage: 'Last activity'})}
                    </Text>
                    <FormattedDate
                        format={DATE_TIME_FORMAT}
                        timezone={timezone}
                        value={device.last_active_at}
                        style={styles.activityValue}
                        testID='enabled_devices.device.last_activity'
                    />
                </View>
            )}
            <View
                style={styles.activityRow}
                testID='enabled_devices.device.first_active_row'
            >
                <Text style={styles.activityLabel}>
                    {intl.formatMessage({id: 'e2ee.device.first_active', defaultMessage: 'First time active'})}
                </Text>
                <FormattedDate
                    format={DATE_TIME_FORMAT}
                    timezone={timezone}
                    value={device.created_at}
                    style={styles.activityValue}
                    testID='enabled_devices.device.first_active'
                />
            </View>
            <View style={styles.buttonsRow}>
                <View style={styles.buttonFlex}>
                    <Button
                        theme={theme}
                        text={intl.formatMessage({id: 'e2ee.device.remove', defaultMessage: 'Remove device'})}
                        onPress={handleRemove}
                        isDestructive={true}
                        emphasis='tertiary'
                        size='s'
                        testID='enabled_devices.device.remove'
                    />
                </View>
                <View style={styles.buttonFlex}>
                    <Button
                        theme={theme}
                        text={intl.formatMessage({id: 'e2ee.device.verify', defaultMessage: 'Verify device'})}
                        onPress={handleVerify}
                        size='s'
                        testID='enabled_devices.device.verify'
                    />
                </View>
            </View>
        </>
    );
}

export const Device = ({
    device,
    onRemoveDevice,
    onVerifyDevice,
    timezone,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {width: windowWidth} = useWindowDimensions();
    const [expanded, setExpanded] = useState(false);
    const height = useSharedValue(0);

    const toggleExpanded = useCallback(() => {
        setExpanded((prev) => !prev);
    }, []);

    const contentOnLayout = useCallback((event: LayoutChangeEvent) => {
        height.value = event.nativeEvent.layout.height;
    }, [height]);

    const animatedExpandStyle = useAnimatedStyle(() => ({
        height: withTiming(expanded ? height.value : 0, {duration: 250}),
        overflow: 'hidden' as const,
    }), [expanded]);

    const calculatorStyle = useMemo(() => [
        styles.expandedContent,
        styles.heightCalculator,
        {left: windowWidth},
    ], [styles.expandedContent, styles.heightCalculator, windowWidth]);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                onPress={toggleExpanded}
                activeOpacity={0.7}
                testID={`enabled_devices.device.${device.device_id}`}
            >
                <View style={styles.headerRow}>
                    <View style={styles.nameAndBadge}>
                        <Text
                            style={styles.name}
                            numberOfLines={1}
                        >
                            {device.device_name === ''
                                ? intl.formatMessage({id: 'e2ee.device.unknown', defaultMessage: 'Unknown'})
                                : device.device_name}
                        </Text>
                        {device.is_current_device && (
                            <Text style={styles.thisDeviceLabel}>
                                {intl.formatMessage(
                                    {id: 'e2ee.device.this_device', defaultMessage: '(this device)'},
                                )}
                            </Text>
                        )}
                        <Tag
                            icon={device.verified ? 'check' : 'shield-outline'}
                            message={device.verified
                                ? intl.formatMessage({id: 'e2ee.device.verified', defaultMessage: 'Verified'})
                                : intl.formatMessage({id: 'e2ee.device.unverified', defaultMessage: 'Unverified'})}
                            type={device.verified ? 'success' : 'general'}
                            size='xs'
                        />
                    </View>
                    <View style={styles.chevron}>
                        <CompassIcon
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            style={styles.chevronIcon}
                        />
                    </View>
                </View>
            </TouchableOpacity>

            <Animated.View
                style={animatedExpandStyle}
                testID={`enabled_devices.device.expanded.${device.device_id}`}
            >
                <View style={styles.expandedContent}>
                    <DeviceDetails
                        device={device}
                        intl={intl}
                        onRemoveDevice={onRemoveDevice}
                        onVerifyDevice={onVerifyDevice}
                        styles={styles}
                        theme={theme}
                        timezone={timezone}
                    />
                </View>
            </Animated.View>

            <View
                style={calculatorStyle}
                onLayout={contentOnLayout}
                testID={`enabled_devices.device.expanded.calculator.${device.device_id}`}
            >
                <DeviceDetails
                    device={device}
                    intl={intl}
                    onRemoveDevice={onRemoveDevice}
                    onVerifyDevice={onVerifyDevice}
                    styles={styles}
                    theme={theme}
                    timezone={timezone}
                />
            </View>
        </View>
    );
};

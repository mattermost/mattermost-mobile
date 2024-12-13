// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';
import {Svg, Path} from 'react-native-svg';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useActivePlaybookRunsCount} from '@playbooks/state';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    serverUrl: string;
    channelId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarTextHoverBg,
        width: '100%',
        height: 44,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingLeft: 20,
        paddingRight: 10,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    runsInProgressStyle: {
        flexDirection: 'row',
    },
    icon: {
        color: theme.centerChannelBg,
        marginRight: 14,
        opacity: 0.92,
        fontSize: 22,
    },
    text: {
        color: theme.centerChannelBg,
        fontSize: 14,
        fontFamily: 'OpenSans-SemiBold',
    },
    arrow: {
        color: 'white',
        opacity: 0.56,
    },
}));

const ArrowSvg = () => (
    <Svg
        width='32'
        height='32'
        viewBox='0 0 32 32'
        fill='none'
    >
        <Path
            d='M10.006 15.244H19.006L14.884 11.122L15.946 10.06L21.886 16L15.946 21.94L14.884 20.878L19.006 16.756H10.006V15.244Z'
            fill='white'
            fillOpacity='0.56'
        />
    </Svg>
);

const ChannelHeaderPlaybookRuns = ({serverUrl, channelId}: Props) => {
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();
    const styles = getStyleSheet(theme);

    const containerStyle = useMemo(() => ({
        ...styles.container,
        top: defaultHeight,
        zIndex: 1,
    }), [defaultHeight, styles.container]);

    const count = useActivePlaybookRunsCount(serverUrl, channelId);

    if (!count) {
        return null;
    }

    return (
        <View style={containerStyle}>
            <View style={styles.runsInProgressStyle}>
                <View>
                    <CompassIcon
                        name='product-playbooks'
                        style={styles.icon}
                    />
                </View>
                <FormattedText
                    id='playbook_runs.in_progress'
                    defaultMessage='{count} {count, plural, one {run} other {runs}} in progress'
                    values={{count}}
                    style={styles.text}
                />
            </View>
            <View style={styles.arrow}>
                <ArrowSvg/>
            </View>
        </View >
    );
};

export default ChannelHeaderPlaybookRuns;

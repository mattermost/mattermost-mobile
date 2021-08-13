// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';
import EphemeralStore from '@store/ephemeral_store';
import React, {useEffect, useState} from 'react';
import {Platform} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import {TabBarHeight} from '@constants/navigation';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ContainerProps = {
    componentId: string;
    renderChildren: () => React.ReactNode;
    unmountOnBlur?: boolean;
};

const Container = ({componentId, renderChildren, unmountOnBlur = true}: ContainerProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const [isFocused, setIsFocused] = useState<boolean>(true);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                setIsFocused(true);
            },
            componentDidDisappear: () => {
                if (unmountOnBlur && componentId !== Screens.TAB_HOME) {
                    EphemeralStore.removeNavigationComponentId(componentId);
                }
                setIsFocused(false);
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);
        return () => {
            unsubscribe.remove();
        };
    }, []);

    const renderContent = () => {
        if (unmountOnBlur && !isFocused) {
            console.log('>>> RENDERING NULL FOR ', componentId, `on ${Platform.OS}`);
            return null;
        }
        return renderChildren();
    };

    return (
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right', 'top']}
        >
            {renderContent()}
        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    flex: {
        flex: 1,
        paddingBottom: TabBarHeight,
        backgroundColor: '#ffffff',
    },
}));

export default Container;

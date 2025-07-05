// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Provider as EMMProvider} from '@mattermost/react-native-emm';
import {render} from '@testing-library/react-native';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {Platform, Text, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {withServerDatabase} from '@database/components';
import PlaybookRun from '@playbooks/screens/playbook_run';
import PlaybooksRuns from '@playbooks/screens/playbooks_runs';

import EditServer from './edit_server';
import InAppNotification from './in_app_notification';
import ReportProblem from './report_a_problem';

// Mock the dependencies
jest.mock('react-native-navigation', () => ({
    Navigation: {
        setLazyComponentRegistrator: jest.fn(),
        registerComponent: jest.fn(),
    },
}));

// Mock providers
jest.mock('react-intl', () => ({
    ...jest.requireActual('react-intl'),
    IntlProvider: jest.fn(),
}));
jest.mocked(IntlProvider).mockImplementation((props) => (
    <View
        {...props}
        testID='IntlProvider'
    />
) as any);

jest.mock('react-native-gesture-handler', () => ({
    GestureHandlerRootView: jest.fn(),
}));
jest.mocked(GestureHandlerRootView).mockImplementation((props) => (
    <View
        {...props}
        testID='GestureHandlerRootView'
    />
));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: jest.fn(),
}));
jest.mocked(SafeAreaProvider).mockImplementation((props) => (
    <View
        {...props}
        testID='SafeAreaProvider'
    />
));

jest.mock('@mattermost/react-native-emm', () => ({
    Provider: jest.fn(),
}));
jest.mocked(EMMProvider).mockImplementation((props) => (
    <View
        {...props}
        testID='EMMProvider'
    />
));

jest.mock('@database/components', () => ({
    withServerDatabase: jest.fn(),
}));
jest.mocked(withServerDatabase).mockImplementation((Component) => function MockedWithServerDatabase(props: any) {
    return <View testID='withDatabase'><Component {...props}/></View>;
});

// Mock some screen components
jest.mock('@screens/report_a_problem', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ReportProblem).mockImplementation((props) => <Text {...props}>{Screens.REPORT_PROBLEM}</Text>);

jest.mock('@screens/edit_server', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(EditServer).mockImplementation((props) => <Text {...props}>{Screens.EDIT_SERVER}</Text>);

jest.mock('@screens/in_app_notification', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(InAppNotification).mockImplementation((props) => <Text {...props}>{Screens.IN_APP_NOTIFICATION}</Text>);

jest.mock('@playbooks/screens/playbooks_runs', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybooksRuns).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOKS_RUNS}</Text>);

jest.mock('@playbooks/screens/playbook_run', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookRun).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOK_RUN}</Text>);

describe('Screen Registration', () => {
    let registrator: (screenName: string) => void;

    beforeAll(async () => {
        await require('./index');
        registrator = jest.mocked(Navigation.setLazyComponentRegistrator).mock.calls[0][0];
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const ttcc: Array<[string, {
        withServerDatabase: boolean;
        withGestures: boolean;
        withSafeAreaInsets: boolean;
        withManagedConfig: boolean;
        withIntl: boolean;
        platform: string | undefined;
    }]> = [
        [
            Screens.REPORT_PROBLEM,
            {
                withServerDatabase: true,
                withGestures: true,
                withSafeAreaInsets: true,
                withManagedConfig: true,
                withIntl: false,
                platform: undefined,
            },
        ],
        [
            Screens.EDIT_SERVER,
            {
                withServerDatabase: false,
                withGestures: true,
                withSafeAreaInsets: true,
                withManagedConfig: true,
                withIntl: true,
                platform: undefined,
            },
        ],
        [
            Screens.IN_APP_NOTIFICATION,
            {
                withServerDatabase: false,
                withGestures: false,
                withSafeAreaInsets: true,
                withManagedConfig: false,
                withIntl: false,
                platform: 'ios',
            },
        ],
        [
            Screens.IN_APP_NOTIFICATION,
            {
                withServerDatabase: false,
                withGestures: false,
                withSafeAreaInsets: false,
                withManagedConfig: false,
                withIntl: false,
                platform: 'android',
            },
        ],
        [
            Screens.PLAYBOOKS_RUNS,
            {
                withServerDatabase: false,
                withGestures: true,
                withSafeAreaInsets: true,
                withManagedConfig: true,
                withIntl: true,
                platform: undefined,
            },
        ],
        [
            Screens.PLAYBOOK_RUN,
            {
                withServerDatabase: false,
                withGestures: true,
                withSafeAreaInsets: true,
                withManagedConfig: true,
                withIntl: true,
                platform: undefined,
            },
        ],
    ];

    it.each(ttcc)('register screen %s when requested', (screenName, testCase) => {
        const originalPlatform = Platform.OS;
        if (testCase.platform) {
            Platform.OS = testCase.platform as any;
        }

        registrator(screenName);
        expect(Navigation.registerComponent).toHaveBeenCalledWith(
            screenName,
            expect.any(Function),
        );
        const ResultingComponent = jest.mocked(Navigation.registerComponent).mock.calls[0][1]();
        const {getByTestId, getByText} = render(<ResultingComponent componentId={screenName}/>);
        const endComponent = getByText(screenName);
        expect(endComponent).toBeDefined();
        expect(endComponent.props.componentId).toBe(screenName);
        if (testCase.withGestures) {
            expect(getByTestId('GestureHandlerRootView')).toBeDefined();
        }
        if (testCase.withSafeAreaInsets) {
            expect(getByTestId('SafeAreaProvider')).toBeDefined();
        }
        if (testCase.withManagedConfig) {
            expect(getByTestId('EMMProvider')).toBeDefined();
        }
        if (testCase.withServerDatabase) {
            expect(getByTestId('withDatabase')).toBeDefined();
        }
        Platform.OS = originalPlatform;
    });

    it('handles unknown screen names gracefully', () => {
        registrator('UNKNOWN_SCREEN');
        expect(Navigation.registerComponent).not.toHaveBeenCalled();
    });
});

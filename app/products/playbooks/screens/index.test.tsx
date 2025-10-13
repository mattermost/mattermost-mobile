// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Text, View} from 'react-native';

import {withServerDatabase} from '@database/components';
import Screens from '@playbooks/constants/screens';
import {render} from '@test/intl-test-helper';

import EditCommand from './edit_command';
import ParticipantPlaybooks from './participant_playbooks';
import PlaybookRun from './playbook_run';
import PlaybookRuns from './playbooks_runs';
import PostUpdate from './post_update';
import SelectDate from './select_date';
import SelectPlaybook from './select_playbook';
import SelectUser from './select_user';
import StartARun from './start_a_run';

import {loadPlaybooksScreen} from '.';

jest.mock('@database/components', () => ({
    withServerDatabase: jest.fn(),
}));
jest.mocked(withServerDatabase).mockImplementation((Component) => function MockedWithServerDatabase(props: any) {
    return <View testID='withDatabase'><Component {...props}/></View>;
});

jest.mock('@playbooks/screens/playbooks_runs', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookRuns).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOKS_RUNS}</Text>);

jest.mock('@playbooks/screens/playbook_run', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PlaybookRun).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOK_RUN}</Text>);

jest.mock('@playbooks/screens/edit_command', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(EditCommand).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOK_EDIT_COMMAND}</Text>);

jest.mock('@playbooks/screens/select_user', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SelectUser).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOK_SELECT_USER}</Text>);

jest.mock('@playbooks/screens/select_date', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SelectDate).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOKS_SELECT_DATE}</Text>);

jest.mock('@playbooks/screens/start_a_run', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(StartARun).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOKS_START_A_RUN}</Text>);

jest.mock('@playbooks/screens/select_playbook', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SelectPlaybook).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOKS_SELECT_PLAYBOOK}</Text>);

jest.mock('@playbooks/screens/participant_playbooks', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ParticipantPlaybooks).mockImplementation((props) => <Text {...props}>{Screens.PARTICIPANT_PLAYBOOKS}</Text>);

jest.mock('@playbooks/screens/post_update', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(PostUpdate).mockImplementation((props) => <Text {...props}>{Screens.PLAYBOOK_POST_UPDATE}</Text>);

describe('Screen Registration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each(Object.values(Screens))('register screen %s when requested', (screenName) => {
        const Screen = loadPlaybooksScreen(screenName);
        expect(Screen).toBeDefined();

        // the previous expect will fail if the screen is not defined.
        // This is a workaround to keep the types correct.
        if (!Screen) {
            return;
        }

        const {getByTestId, getByText} = render(<Screen/>);

        expect(getByTestId('withDatabase')).toBeDefined();
        expect(getByText(screenName)).toBeDefined();
    });

    it('returns undefined for unknown screen names', () => {
        const Screen = loadPlaybooksScreen('unknown');
        expect(Screen).toBeUndefined();
    });
});

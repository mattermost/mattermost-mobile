// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme, fireEvent} from '@test/intl-test-helper';

import TeamListItem from './team_list_item';

import type TeamModel from '@typings/database/models/servers/team';

describe('TeamListItem', () => {
    const team = {
        id: 'team_id',
        displayName: 'Team Display Name',
        lastTeamIconUpdatedAt: 0,
    } as TeamModel;
    const iconTestId = `team_sidebar.team_list.team_list_item.${team.id}.team_icon`;

    it('should call onPress when pressed', () => {
        const onPressMock = jest.fn();
        const {getByText} = renderWithIntlAndTheme(
            <TeamListItem
                team={team}
                onPress={onPressMock}
            />,
        );

        fireEvent.press(getByText('Team Display Name'));

        expect(onPressMock).toHaveBeenCalledWith('team_id');
    });

    it('should render TeamIcon when hideIcon is false', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <TeamListItem
                team={team}
                onPress={jest.fn()}
                hideIcon={false}
            />,
        );

        expect(getByTestId(iconTestId)).toBeTruthy();
    });

    it('should not render TeamIcon when hideIcon is true', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <TeamListItem
                team={team}
                onPress={jest.fn()}
                hideIcon={true}
            />,
        );

        expect(queryByTestId(iconTestId)).toBeNull();
    });
});

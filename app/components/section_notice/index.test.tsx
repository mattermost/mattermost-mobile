// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {Screens} from '@constants';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SectionNotice from '.';

import type Database from '@nozbe/watermelondb/Database';

function getBaseProps(): ComponentProps<typeof SectionNotice> {
    return {
        title: 'Some title',
        text: 'Some text',
        type: 'info',
        isDismissable: true,
        primaryButton: {
            onClick: jest.fn(),
            text: 'primary button',
            leadingIcon: 'chevron-left',
            trailingIcon: 'chevron-right',
            loading: true,
        },
        secondaryButton: {
            onClick: jest.fn(),
            text: 'secondary button',
            leadingIcon: 'chevron-left',
            trailingIcon: 'chevron-right',
            loading: true,
        },
        linkButton: {
            onClick: jest.fn(),
            text: 'link button',
            leadingIcon: 'chevron-left',
            trailingIcon: 'chevron-right',
            loading: true,
        },
        onDismissClick: jest.fn(),
        location: Screens.SETTINGS_NOTIFICATION_PUSH,
    };
}

describe('Section notice', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('match snapshot', () => {
        const props = getBaseProps();
        const wrapper = renderWithEverything(<SectionNotice {...props}/>, {database});
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show buttons only if defined', () => {
        const props = getBaseProps();
        const wrapper = renderWithEverything(<SectionNotice {...props}/>, {database});

        const primaryText = props.primaryButton!.text;
        const secondaryText = props.secondaryButton!.text;
        const linkText = props.linkButton!.text;

        expect(wrapper.getAllByRole('button')).toHaveLength(4);
        expect(wrapper.getByText(primaryText)).toBeVisible();
        expect(wrapper.getByText(secondaryText)).toBeVisible();
        expect(wrapper.getByText(linkText)).toBeVisible();
        expect(wrapper.getByTestId('sectionNoticeDismissButton')).toBeVisible();

        props.primaryButton = undefined;
        wrapper.rerender(<SectionNotice {...props}/>);
        expect(wrapper.getAllByRole('button')).toHaveLength(3);
        expect(wrapper.queryByText(primaryText)).not.toBeVisible();
        expect(wrapper.getByText(secondaryText)).toBeVisible();
        expect(wrapper.getByText(linkText)).toBeVisible();
        expect(wrapper.getByTestId('sectionNoticeDismissButton')).toBeVisible();

        props.secondaryButton = undefined;
        wrapper.rerender(<SectionNotice {...props}/>);
        expect(wrapper.getAllByRole('button')).toHaveLength(2);
        expect(wrapper.queryByText(primaryText)).not.toBeVisible();
        expect(wrapper.queryByText(secondaryText)).not.toBeVisible();
        expect(wrapper.getByText(linkText)).toBeVisible();
        expect(wrapper.getByTestId('sectionNoticeDismissButton')).toBeVisible();

        props.linkButton = undefined;
        wrapper.rerender(<SectionNotice {...props}/>);
        expect(wrapper.getAllByRole('button')).toHaveLength(1);
        expect(wrapper.queryByText(primaryText)).not.toBeVisible();
        expect(wrapper.queryByText(secondaryText)).not.toBeVisible();
        expect(wrapper.queryByText(linkText)).not.toBeVisible();
        expect(wrapper.getByTestId('sectionNoticeDismissButton')).toBeVisible();

        props.isDismissable = false;
        wrapper.rerender(<SectionNotice {...props}/>);
        expect(wrapper.queryAllByRole('button')).toHaveLength(0);
        expect(wrapper.queryByText(primaryText)).not.toBeVisible();
        expect(wrapper.queryByText(secondaryText)).not.toBeVisible();
        expect(wrapper.queryByText(linkText)).not.toBeVisible();
        expect(wrapper.queryByTestId('sectionNoticeDismissButton')).not.toBeVisible();
    });

    it('should show the correct icon on each section type', () => {
        const props = getBaseProps();

        props.type = 'info';
        const wrapper = renderWithEverything(<SectionNotice {...props}/>, {database});
        let icon = wrapper.getByTestId('sectionNoticeHeaderIcon');
        expect(icon).toBeVisible();
        expect(icon.props).toHaveProperty('name', 'information-outline');

        props.type = 'danger';
        wrapper.rerender(<SectionNotice {...props}/>);
        icon = wrapper.getByTestId('sectionNoticeHeaderIcon');
        expect(icon).toBeVisible();
        expect(icon.props).toHaveProperty('name', 'alert-outline');

        props.type = 'hint';
        wrapper.rerender(<SectionNotice {...props}/>);
        icon = wrapper.getByTestId('sectionNoticeHeaderIcon');
        expect(icon).toBeVisible();
        expect(icon.props).toHaveProperty('name', 'lightbulb-outline');

        props.type = 'success';
        wrapper.rerender(<SectionNotice {...props}/>);
        icon = wrapper.getByTestId('sectionNoticeHeaderIcon');
        expect(icon).toBeVisible();
        expect(icon.props).toHaveProperty('name', 'check');

        props.type = 'warning';
        wrapper.rerender(<SectionNotice {...props}/>);
        icon = wrapper.getByTestId('sectionNoticeHeaderIcon');
        expect(icon).toBeVisible();
        expect(icon.props).toHaveProperty('name', 'alert-outline');

        props.type = 'welcome';
        wrapper.rerender(<SectionNotice {...props}/>);
        expect(wrapper.queryByTestId('sectionNoticeHeaderIcon')).not.toBeVisible();
    });

    it('should have the correct background on each section type', () => {
        const props = getBaseProps();

        props.type = 'info';
        const wrapper = renderWithEverything(<SectionNotice {...props}/>, {database});
        let container = wrapper.getByTestId('sectionNoticeContainer');
        expect(container).toHaveStyle({backgroundColor: 'rgba(93,137,234,0.08)'});

        props.type = 'danger';
        wrapper.rerender(<SectionNotice {...props}/>);
        container = wrapper.getByTestId('sectionNoticeContainer');
        expect(container).toHaveStyle({backgroundColor: 'rgba(210,75,78,0.08)'});

        props.type = 'hint';
        wrapper.rerender(<SectionNotice {...props}/>);
        container = wrapper.getByTestId('sectionNoticeContainer');
        expect(container).toHaveStyle({backgroundColor: 'rgba(93,137,234,0.08)'});

        props.type = 'success';
        wrapper.rerender(<SectionNotice {...props}/>);
        container = wrapper.getByTestId('sectionNoticeContainer');
        expect(container).toHaveStyle({backgroundColor: 'rgba(61,184,135,0.08)'});

        props.type = 'warning';
        wrapper.rerender(<SectionNotice {...props}/>);
        container = wrapper.getByTestId('sectionNoticeContainer');
        expect(container).toHaveStyle({backgroundColor: 'rgba(255,188,31,0.08)'});

        props.type = 'welcome';
        wrapper.rerender(<SectionNotice {...props}/>);
        container = wrapper.getByTestId('sectionNoticeContainer');
        expect(container).toHaveStyle({backgroundColor: 'rgba(63,67,80,0.04)'});
    });

    it('all buttons perform the expected action', () => {
        const props = getBaseProps();
        const wrapper = renderWithEverything(<SectionNotice {...props}/>, {database});

        fireEvent.press(wrapper.getByText(props.primaryButton!.text));
        expect(props.primaryButton!.onClick).toHaveBeenCalled();
        expect(props.secondaryButton!.onClick).not.toHaveBeenCalled();
        expect(props.linkButton!.onClick).not.toHaveBeenCalled();
        expect(props.onDismissClick!).not.toHaveBeenCalled();

        jest.clearAllMocks();

        fireEvent.press(wrapper.getByText(props.secondaryButton!.text));
        expect(props.primaryButton!.onClick).not.toHaveBeenCalled();
        expect(props.secondaryButton!.onClick).toHaveBeenCalled();
        expect(props.linkButton!.onClick).not.toHaveBeenCalled();
        expect(props.onDismissClick!).not.toHaveBeenCalled();

        jest.clearAllMocks();

        fireEvent.press(wrapper.getByText(props.linkButton!.text));
        expect(props.primaryButton!.onClick).not.toHaveBeenCalled();
        expect(props.secondaryButton!.onClick).not.toHaveBeenCalled();
        expect(props.linkButton!.onClick).toHaveBeenCalled();
        expect(props.onDismissClick!).not.toHaveBeenCalled();

        jest.clearAllMocks();

        fireEvent.press(wrapper.getByTestId('sectionNoticeDismissButton'));
        expect(props.primaryButton!.onClick).not.toHaveBeenCalled();
        expect(props.secondaryButton!.onClick).not.toHaveBeenCalled();
        expect(props.linkButton!.onClick).not.toHaveBeenCalled();
        expect(props.onDismissClick!).toHaveBeenCalled();
    });
});

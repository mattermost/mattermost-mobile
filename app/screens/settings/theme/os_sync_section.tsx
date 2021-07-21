// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {FC} from 'react';

import FormattedText from '@components/formatted_text';
import {OsColorSchemeName} from '@mm-redux/types/general';
import {Theme} from '@mm-redux/types/preferences';
import Section from '@screens/settings/section';
import SectionItem from '@screens/settings/section_item';
import {t} from '@utils/i18n';

const OsSyncSection: FC<Props> = ({theme, selected, onToggle, osColorScheme}:Props) => (
    <Section
        footerId={
            osColorScheme === 'dark' ? t(
                'user.settings.display.theme.syncWithOs.explanationDark',
            ) : t(
                'user.settings.display.theme.syncWithOs.explanationLight',
            )
        }
        footerDefaultMessage={`Automatically switch between light and dark themes when your system does. Your OS appearance is currently set to ${osColorScheme}.`}
        theme={theme}
    >
        <SectionItem
            label={
                <FormattedText
                    id='user.settings.display.theme.syncWithOs'
                    defaultMessage='Sync with OS appearance'
                />
            }
            action={onToggle}
            actionType='toggle'
            selected={selected}
            theme={theme}
            testID='os_sync'
        />
    </Section>
);

type Props = {
    selected: boolean;
    theme: Theme;
    onToggle: (value: boolean) => void;
    osColorScheme: OsColorSchemeName;
}

export default OsSyncSection;

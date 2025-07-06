import {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {executeCommand} from '@actions/remote/command';
import {getUserIdFromChannelName} from '@utils/user';

type UseAliasSetterProps = {
    serverUrl: string;
    channelId: string;
    currentUserId: string;
    searchTerm: string;
};

export const useAliasSetter = ({serverUrl, channelId, currentUserId, searchTerm}: UseAliasSetterProps) => {
    const intl = useIntl();

    const setAlias = useCallback(async (aliasText: string) => {
        if (!aliasText.trim()) {
            return {error: 'Alias cannot be empty'};
        }

        const teammateId = getUserIdFromChannelName(currentUserId, searchTerm);
        if (!teammateId) {
            return {error: 'Could not determine user ID'};
        }

        const command = `/alias set ${teammateId} ${aliasText.trim()}`;
        
        try {
            const result = await executeCommand(serverUrl, intl, command, channelId);
            return result;
        } catch (error) {
            return {error};
        }
    }, [serverUrl, intl, channelId, currentUserId, searchTerm]);

    return {setAlias};
}; 
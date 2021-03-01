export type {
    AppCall,
    AppBinding,
    AppField,
    AppSelectOption,
    AppCallResponse,
    AppContext,
    AppForm,
    AutocompleteElement,
    AutocompleteDynamicSelect,
    AutocompleteStaticSelect,
    AutocompleteUserSelect,
    AutocompleteChannelSelect,
    AppLookupCallValues,
} from '@mm-redux/types/apps';

import type {
    AutocompleteSuggestion,
} from '@mm-redux/types/integrations';
export type {AutocompleteSuggestion};

export type {
    Channel,
} from '@mm-redux/types/channels';

export type {
    GlobalState,
} from '@mm-redux/types/store';

export type {
    DispatchFunc,
} from '@mm-redux/types/actions';

export {
    AppBindingLocations,
    AppCallTypes,
    AppFieldTypes,
} from '@mm-redux/constants/apps';

export {getAppBindings} from '@mm-redux/selectors/entities/apps';
export {getPost} from '@mm-redux/selectors/entities/posts';
export {getChannel, getCurrentChannel} from '@mm-redux/selectors/entities/channels';
export {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

export {doAppCall} from '@actions/apps';
export {sendEphemeralPost} from '@actions/views/post';

import Store from '@store/store';
export const getStore = () => Store.redux;

export const EXECUTE_CURRENT_COMMAND_ITEM_ID = '_execute_current_command';

export const getExecuteSuggestionDescription = (): string => {
    return 'Select this option to execute the command.';
}

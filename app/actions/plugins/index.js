import {Client4} from '@mm-redux/client';
import {resetToChannel, dismissModal, dismissOverlay} from '@actions/navigation'

const RESET_TO_CHANNEL = "RESET_TO_CHANNEL"

export async function doPluginAction(pluginId, trigger, body) {
    response = await Client4.executePluginTrigger(pluginId, trigger, body)
    console.log(response)
    if (response.action == RESET_TO_CHANNEL) {
        resetToChannel();
    }
}
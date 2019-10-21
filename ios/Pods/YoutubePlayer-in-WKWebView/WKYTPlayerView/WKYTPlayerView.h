//  Copyright © 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@class WKYTPlayerView;

/** These enums represent the state of the current video in the player. */
typedef NS_ENUM(NSInteger, WKYTPlayerState) {
    kWKYTPlayerStateUnstarted,
    kWKYTPlayerStateEnded,
    kWKYTPlayerStatePlaying,
    kWKYTPlayerStatePaused,
    kWKYTPlayerStateBuffering,
    kWKYTPlayerStateQueued,
    kWKYTPlayerStateUnknown
};

/** These enums represent the resolution of the currently loaded video. */
typedef NS_ENUM(NSInteger, WKYTPlaybackQuality) {
    kWKYTPlaybackQualitySmall,
    kWKYTPlaybackQualityMedium,
    kWKYTPlaybackQualityLarge,
    kWKYTPlaybackQualityHD720,
    kWKYTPlaybackQualityHD1080,
    kWKYTPlaybackQualityHighRes,
    kWKYTPlaybackQualityAuto, /** Addition for YouTube Live Events. */
    kWKYTPlaybackQualityDefault,
    kWKYTPlaybackQualityUnknown /** This should never be returned. It is here for future proofing. */
};

/** These enums represent error codes thrown by the player. */
typedef NS_ENUM(NSInteger, WKYTPlayerError) {
    kWKYTPlayerErrorInvalidParam,
    kWKYTPlayerErrorHTML5Error,
    kWKYTPlayerErrorVideoNotFound, // Functionally equivalent error codes 100 and
    // 105 have been collapsed into |kWKYTPlayerErrorVideoNotFound|.
    kWKYTPlayerErrorNotEmbeddable, // Functionally equivalent error codes 101 and
    // 150 have been collapsed into |kWKYTPlayerErrorNotEmbeddable|.
    kWKYTPlayerErrorUnknown
};

/**
 * A delegate for ViewControllers to respond to YouTube player events outside
 * of the view, such as changes to video playback state or playback errors.
 * The callback functions correlate to the events fired by the IFrame API.
 * For the full documentation, see the IFrame documentation here:
 *     https://developers.google.com/youtube/iframe_api_reference#Events
 */
@protocol WKYTPlayerViewDelegate<NSObject>

@optional
/**
 * Invoked when the player view is ready to receive API calls.
 *
 * @param playerView The WKYTPlayerView instance that has become ready.
 */
- (void)playerViewDidBecomeReady:(nonnull WKYTPlayerView *)playerView;

/**
 * Callback invoked when player state has changed, e.g. stopped or started playback.
 *
 * @param playerView The WKYTPlayerView instance where playback state has changed.
 * @param state WKYTPlayerState designating the new playback state.
 */
- (void)playerView:(nonnull WKYTPlayerView *)playerView didChangeToState:(WKYTPlayerState)state;

/**
 * Callback invoked when playback quality has changed.
 *
 * @param playerView The WKYTPlayerView instance where playback quality has changed.
 * @param quality WKYTPlaybackQuality designating the new playback quality.
 */
- (void)playerView:(nonnull WKYTPlayerView *)playerView didChangeToQuality:(WKYTPlaybackQuality)quality;

/**
 * Callback invoked when an error has occured.
 *
 * @param playerView The WKYTPlayerView instance where the error has occurred.
 * @param error WKYTPlayerError containing the error state.
 */
- (void)playerView:(nonnull WKYTPlayerView *)playerView receivedError:(WKYTPlayerError)error;

/**
 * Callback invoked frequently when playBack is plaing.
 *
 * @param playerView The WKYTPlayerView instance where the error has occurred.
 * @param playTime float containing curretn playback time.
 */
- (void)playerView:(nonnull WKYTPlayerView *)playerView didPlayTime:(float)playTime;

/**
 * Callback invoked when setting up the webview to allow custom colours so it fits in
 * with app color schemes. If a transparent view is required specify clearColor and
 * the code will handle the opacity etc.
 *
 * @param playerView The WKYTPlayerView instance where the error has occurred.
 * @return A color object that represents the background color of the webview.
 */
- (nonnull UIColor *)playerViewPreferredWebViewBackgroundColor:(nonnull WKYTPlayerView *)playerView;

/**
 * Callback invoked when initially loading the YouTube iframe to the webview to display a custom
 * loading view while the player view is not ready. This loading view will be dismissed just before
 * -playerViewDidBecomeReady: callback is invoked. The loading view will be automatically resized
 * to cover the entire player view.
 *
 * The default implementation does not display any custom loading views so the player will display
 * a blank view with a background color of (-playerViewPreferredWebViewBackgroundColor:).
 *
 * Note that the custom loading view WILL NOT be displayed after iframe is loaded. It will be
 * handled by YouTube iframe API. This callback is just intended to tell users the view is actually
 * doing something while iframe is being loaded, which will take some time if users are in poor networks.
 *
 * @param playerView The WKYTPlayerView instance where the error has occurred.
 * @return A view object that will be displayed while YouTube iframe API is being loaded.
 *         Pass nil to display no custom loading view. Default implementation returns nil.
 */
- (nullable UIView *)playerViewPreferredInitialLoadingView:(nonnull WKYTPlayerView *)playerView;

/**
 * Callback invoked when an api loading error has occured.
 *
 * @param playerView The WKYTPlayerView instance where the error has occurred.
 */
- (void)playerViewIframeAPIDidFailedToLoad:(nonnull WKYTPlayerView *)playerView;

@end

/**
 * WKYTPlayerView is a custom UIView that client developers will use to include YouTube
 * videos in their iOS applications. It can be instantiated programmatically, or via
 * Interface Builder. Use the methods WKYTPlayerView::loadWithVideoId:,
 * WKYTPlayerView::loadWithPlaylistId: or their variants to set the video or playlist
 * to populate the view with.
 */
@interface WKYTPlayerView : UIView<WKNavigationDelegate, WKUIDelegate>

@property(nonatomic, strong, nullable, readonly) WKWebView *webView;

/** A delegate to be notified on playback events. */
@property(nonatomic, weak, nullable) id<WKYTPlayerViewDelegate> delegate;

/**
 * This method loads the player with the given video ID.
 * This is a convenience method for calling WKYTPlayerView::loadPlayerWithVideoId:withPlayerVars:
 * without player variables.
 *
 * This method reloads the entire contents of the WKWebView and regenerates its HTML contents.
 * To change the currently loaded video without reloading the entire WKWebView, use the
 * WKYTPlayerView::cueVideoById:startSeconds:suggestedQuality: family of methods.
 *
 * @param videoId The YouTube video ID of the video to load in the player view.
 * @return YES if player has been configured correctly, NO otherwise.
 */
- (BOOL)loadWithVideoId:(nonnull NSString *)videoId;

/**
 * This method loads the player with the given playlist ID.
 * This is a convenience method for calling WKYTPlayerView::loadWithPlaylistId:withPlayerVars:
 * without player variables.
 *
 * This method reloads the entire contents of the WKWebView and regenerates its HTML contents.
 * To change the currently loaded video without reloading the entire WKWebView, use the
 * WKYTPlayerView::cuePlaylistByPlaylistId:index:startSeconds:suggestedQuality:
 * family of methods.
 *
 * @param playlistId The YouTube playlist ID of the playlist to load in the player view.
 * @return YES if player has been configured correctly, NO otherwise.
 */
- (BOOL)loadWithPlaylistId:(nonnull NSString *)playlistId;

/**
 * This method loads the player with the given video ID and player variables. Player variables
 * specify optional parameters for video playback. For instance, to play a YouTube
 * video inline, the following playerVars dictionary would be used:
 *
 * @code
 * @{ @"playsinline" : @1 };
 * @endcode
 *
 * Note that when the documentation specifies a valid value as a number (typically 0, 1 or 2),
 * both strings and integers are valid values. The full list of parameters is defined at:
 *   https://developers.google.com/youtube/player_parameters?playerVersion=HTML5.
 *
 * This method reloads the entire contents of the WKWebView and regenerates its HTML contents.
 * To change the currently loaded video without reloading the entire WKWebView, use the
 * WKYTPlayerView::cueVideoById:startSeconds:suggestedQuality: family of methods.
 *
 * @param videoId The YouTube video ID of the video to load in the player view.
 * @param playerVars An NSDictionary of player parameters.
 * @return YES if player has been configured correctly, NO otherwise.
 */
- (BOOL)loadWithVideoId:(nonnull NSString *)videoId playerVars:(nullable NSDictionary *)playerVars;

/**
 * This method loads the player with the given video ID and player variables. Player variables
 * specify optional parameters for video playback. For instance, to play a YouTube
 * video inline, the following playerVars dictionary would be used:
 *
 * @code
 * @{ @"playsinline" : @1 };
 * @endcode
 *
 * Note that when the documentation specifies a valid value as a number (typically 0, 1 or 2),
 * both strings and integers are valid values. The full list of parameters is defined at:
 *   https://developers.google.com/youtube/player_parameters?playerVersion=HTML5.
 *
 * This method reloads the entire contents of the WKWebView and regenerates its HTML contents.
 * To change the currently loaded video without reloading the entire WKWebView, use the
 * WKYTPlayerView::cueVideoById:startSeconds:suggestedQuality: family of methods.
 *
 * @param videoId The YouTube video ID of the video to load in the player view.
 * @param playerVars An NSDictionary of player parameters.
 * @param path String with the path for HTML template used for viewing video.
 * @return YES if player has been configured correctly, NO otherwise.
 */
- (BOOL)loadWithVideoId:(nonnull NSString *)videoId playerVars:(nullable NSDictionary *)playerVars templatePath:(nullable NSString *)path;

/**
 * This method loads the player with the given playlist ID and player variables. Player variables
 * specify optional parameters for video playback. For instance, to play a YouTube
 * video inline, the following playerVars dictionary would be used:
 *
 * @code
 * @{ @"playsinline" : @1 };
 * @endcode
 *
 * Note that when the documentation specifies a valid value as a number (typically 0, 1 or 2),
 * both strings and integers are valid values. The full list of parameters is defined at:
 *   https://developers.google.com/youtube/player_parameters?playerVersion=HTML5.
 *
 * This method reloads the entire contents of the WKWebView and regenerates its HTML contents.
 * To change the currently loaded video without reloading the entire WKWebView, use the
 * WKYTPlayerView::cuePlaylistByPlaylistId:index:startSeconds:suggestedQuality:
 * family of methods.
 *
 * @param playlistId The YouTube playlist ID of the playlist to load in the player view.
 * @param playerVars An NSDictionary of player parameters.
 * @return YES if player has been configured correctly, NO otherwise.
 */
- (BOOL)loadWithPlaylistId:(nonnull NSString *)playlistId playerVars:(nullable NSDictionary *)playerVars;

/**
 * This method loads an iframe player with the given player parameters. Usually you may want to use
 * -loadWithVideoId:playerVars: or -loadWithPlaylistId:playerVars: instead of this method does not handle
 * video_id or playlist_id at all. The full list of parameters is defined at:
 *   https://developers.google.com/youtube/player_parameters?playerVersion=HTML5.
 *
 * @param additionalPlayerParams An NSDictionary of parameters in addition to required parameters
 *                               to instantiate the HTML5 player with. This differs depending on
 *                               whether a single video or playlist is being loaded.
 * @return YES if successful, NO if not.
 */
- (BOOL)loadWithPlayerParams:(nullable NSDictionary *)additionalPlayerParams;

#pragma mark - Player controls

// These methods correspond to their JavaScript equivalents as documented here:
//   https://developers.google.com/youtube/iframe_api_reference#Playback_controls

/**
 * Starts or resumes playback on the loaded video. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#playVideo
 */
- (void)playVideo;

/**
 * Pauses playback on a playing video. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#pauseVideo
 */
- (void)pauseVideo;

/**
 * Stops playback on a playing video. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#stopVideo
 */
- (void)stopVideo;

/**
 * Seek to a given time on a playing video. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#seekTo
 *
 * @param seekToSeconds The time in seconds to seek to in the loaded video.
 * @param allowSeekAhead Whether to make a new request to the server if the time is
 *                       outside what is currently buffered. Recommended to set to YES.
 */
- (void)seekToSeconds:(float)seekToSeconds allowSeekAhead:(BOOL)allowSeekAhead;

#pragma mark - Queuing videos

// Queueing functions for videos. These methods correspond to their JavaScript
// equivalents as documented here:
//   https://developers.google.com/youtube/iframe_api_reference#Queueing_Functions

/**
 * Cues a given video by its video ID for playback starting at the given time and with the
 * suggested quality. Cueing loads a video, but does not start video playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#cueVideoById
 *
 * @param videoId A video ID to cue.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)cueVideoById:(nonnull NSString *)videoId
        startSeconds:(float)startSeconds
    suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Cues a given video by its video ID for playback starting and ending at the given times
 * with the suggested quality. Cueing loads a video, but does not start video playback. This
 * method corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#cueVideoById
 *
 * @param videoId A video ID to cue.
 * @param startSeconds Time in seconds to start the video when playVideo() is called.
 * @param endSeconds Time in seconds to end the video after it begins playing.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)cueVideoById:(nonnull NSString *)videoId
        startSeconds:(float)startSeconds
          endSeconds:(float)endSeconds
    suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Loads a given video by its video ID for playback starting at the given time and with the
 * suggested quality. Loading a video both loads it and begins playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#loadVideoById
 *
 * @param videoId A video ID to load and begin playing.
 * @param startSeconds Time in seconds to start the video when it has loaded.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)loadVideoById:(nonnull NSString *)videoId
         startSeconds:(float)startSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Loads a given video by its video ID for playback starting and ending at the given times
 * with the suggested quality. Loading a video both loads it and begins playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#loadVideoById
 *
 * @param videoId A video ID to load and begin playing.
 * @param startSeconds Time in seconds to start the video when it has loaded.
 * @param endSeconds Time in seconds to end the video after it begins playing.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)loadVideoById:(nonnull NSString *)videoId
         startSeconds:(float)startSeconds
           endSeconds:(float)endSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Cues a given video by its URL on YouTube.com for playback starting at the given time
 * and with the suggested quality. Cueing loads a video, but does not start video playback.
 * This method corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#cueVideoByUrl
 *
 * @param videoURL URL of a YouTube video to cue for playback.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)cueVideoByURL:(nonnull NSString *)videoURL
         startSeconds:(float)startSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Cues a given video by its URL on YouTube.com for playback starting at the given time
 * and with the suggested quality. Cueing loads a video, but does not start video playback.
 * This method corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#cueVideoByUrl
 *
 * @param videoURL URL of a YouTube video to cue for playback.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param endSeconds Time in seconds to end the video after it begins playing.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)cueVideoByURL:(nonnull NSString *)videoURL
         startSeconds:(float)startSeconds
           endSeconds:(float)endSeconds
     suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Loads a given video by its video ID for playback starting at the given time
 * with the suggested quality. Loading a video both loads it and begins playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#loadVideoByUrl
 *
 * @param videoURL URL of a YouTube video to load and play.
 * @param startSeconds Time in seconds to start the video when it has loaded.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)loadVideoByURL:(nonnull NSString *)videoURL
          startSeconds:(float)startSeconds
      suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Loads a given video by its video ID for playback starting and ending at the given times
 * with the suggested quality. Loading a video both loads it and begins playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#loadVideoByUrl
 *
 * @param videoURL URL of a YouTube video to load and play.
 * @param startSeconds Time in seconds to start the video when it has loaded.
 * @param endSeconds Time in seconds to end the video after it begins playing.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)loadVideoByURL:(nonnull NSString *)videoURL
          startSeconds:(float)startSeconds
            endSeconds:(float)endSeconds
      suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

#pragma mark - Queuing functions for playlists

// Queueing functions for playlists. These methods correspond to
// the JavaScript methods defined here:
//    https://developers.google.com/youtube/js_api_reference#Playlist_Queueing_Functions

/**
 * Cues a given playlist with the given ID. The |index| parameter specifies the 0-indexed
 * position of the first video to play, starting at the given time and with the
 * suggested quality. Cueing loads a playlist, but does not start video playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#cuePlaylist
 *
 * @param playlistId Playlist ID of a YouTube playlist to cue.
 * @param index A 0-indexed position specifying the first video to play.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)cuePlaylistByPlaylistId:(nonnull NSString *)playlistId
                          index:(int)index
                   startSeconds:(float)startSeconds
               suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Cues a playlist of videos with the given video IDs. The |index| parameter specifies the
 * 0-indexed position of the first video to play, starting at the given time and with the
 * suggested quality. Cueing loads a playlist, but does not start video playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#cuePlaylist
 *
 * @param videoIds An NSArray of video IDs to compose the playlist of.
 * @param index A 0-indexed position specifying the first video to play.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)cuePlaylistByVideos:(nonnull NSArray *)videoIds
                      index:(int)index
               startSeconds:(float)startSeconds
           suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Loads a given playlist with the given ID. The |index| parameter specifies the 0-indexed
 * position of the first video to play, starting at the given time and with the
 * suggested quality. Loading a playlist starts video playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#loadPlaylist
 *
 * @param playlistId Playlist ID of a YouTube playlist to cue.
 * @param index A 0-indexed position specifying the first video to play.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)loadPlaylistByPlaylistId:(nonnull NSString *)playlistId
                           index:(int)index
                    startSeconds:(float)startSeconds
                suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Loads a playlist of videos with the given video IDs. The |index| parameter specifies the
 * 0-indexed position of the first video to play, starting at the given time and with the
 * suggested quality. Loading a playlist starts video playback. This method
 * corresponds with its JavaScript API equivalent as documented here:
 *    https://developers.google.com/youtube/iframe_api_reference#loadPlaylist
 *
 * @param videoIds An NSArray of video IDs to compose the playlist of.
 * @param index A 0-indexed position specifying the first video to play.
 * @param startSeconds Time in seconds to start the video when WKYTPlayerView::playVideo is called.
 * @param suggestedQuality WKYTPlaybackQuality value suggesting a playback quality.
 */
- (void)loadPlaylistByVideos:(nonnull NSArray *)videoIds
                       index:(int)index
                startSeconds:(float)startSeconds
            suggestedQuality:(WKYTPlaybackQuality)suggestedQuality;

#pragma mark - Playing a video in a playlist

// These methods correspond to the JavaScript API as defined under the
// "Playing a video in a playlist" section here:
//    https://developers.google.com/youtube/iframe_api_reference#Playback_status

/**
 * Loads and plays the next video in the playlist. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#nextVideo
 */
- (void)nextVideo;

/**
 * Loads and plays the previous video in the playlist. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#previousVideo
 */
- (void)previousVideo;

/**
 * Loads and plays the video at the given 0-indexed position in the playlist.
 * Corresponds to this method from the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#playVideoAt
 *
 * @param index The 0-indexed position of the video in the playlist to load and play.
 */
- (void)playVideoAt:(int)index;

#pragma mark - Setting the playback rate

/**
 * Gets the playback rate. The default value is 1.0, which represents a video
 * playing at normal speed. Other values may include 0.25 or 0.5 for slower
 * speeds, and 1.5 or 2.0 for faster speeds. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getPlaybackRate
 */
- (void)getPlaybackRate:(void (^ __nullable)(float playbackRate, NSError * __nullable error))completionHandler;

/**
 * Sets the playback rate. The default value is 1.0, which represents a video
 * playing at normal speed. Other values may include 0.25 or 0.5 for slower
 * speeds, and 1.5 or 2.0 for faster speeds. To fetch a list of valid values for
 * this method, call WKYTPlayerView::getAvailablePlaybackRates. This method does not
 * guarantee that the playback rate will change.
 * This method corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#setPlaybackRate
 *
 * @param suggestedRate A playback rate to suggest for the player.
 */
- (void)setPlaybackRate:(float)suggestedRate;

/**
 * Gets a list of the valid playback rates, useful in conjunction with
 * WKYTPlayerView::setPlaybackRate. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getPlaybackRate
 */
- (void)getAvailablePlaybackRates:(void (^ __nullable)(NSArray * __nullable availablePlaybackRates, NSError * __nullable error))completionHandler;

#pragma mark - Setting playback behavior for playlists

/**
 * Sets whether the player should loop back to the first video in the playlist
 * after it has finished playing the last video. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#loopPlaylist
 *
 * @param loop A boolean representing whether the player should loop.
 */
- (void)setLoop:(BOOL)loop;

/**
 * Sets whether the player should shuffle through the playlist. This method
 * corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#shufflePlaylist
 *
 * @param shuffle A boolean representing whether the player should
 *                shuffle through the playlist.
 */
- (void)setShuffle:(BOOL)shuffle;

#pragma mark - Playback status
// These methods correspond to the JavaScript methods defined here:
//    https://developers.google.com/youtube/js_api_reference#Playback_status

/**
 * Returns a number between 0 and 1 that specifies the percentage of the video
 * that the player shows as buffered. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getVideoLoadedFraction
 *
 */
- (void)getVideoLoadedFraction:(void (^ __nullable)(float videoLoadedFraction, NSError * __nullable error))completionHandler;

/**
 * Returns the state of the player. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getPlayerState
 *
 */
- (void)getPlayerState:(void (^ __nullable)(WKYTPlayerState playerState, NSError * __nullable error))completionHandler;

/**
 * Returns the elapsed time in seconds since the video started playing. This
 * method corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getCurrentTime
 *
 */
- (void)getCurrentTime:(void (^ __nullable)(float currentTime, NSError * __nullable error))completionHandler;

#pragma mark - Playback quality

// Playback quality. These methods correspond to the JavaScript
// methods defined here:
//   https://developers.google.com/youtube/js_api_reference#Playback_quality

/**
 * Returns the playback quality. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getPlaybackQuality
 *
 */
- (void)getPlaybackQuality:(void (^ __nullable)(WKYTPlaybackQuality playbackQuality, NSError * __nullable error))completionHandler;

/**
 * Suggests playback quality for the video. It is recommended to leave this setting to
 * |default|. This method corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#setPlaybackQuality
 *
 */
- (void)setPlaybackQuality:(WKYTPlaybackQuality)suggestedQuality;

/**
 * Gets a list of the valid playback quality values, useful in conjunction with
 * WKYTPlayerView::setPlaybackQuality. This method corresponds to the
 * JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getAvailableQualityLevels
 *
 */
- (void)getAvailableQualityLevels:(void (^ __nullable)(NSArray * __nullable availableQualityLevels, NSError * __nullable error))completionHandler;

#pragma mark - Retrieving video information

// Retrieving video information. These methods correspond to the JavaScript
// methods defined here:
//   https://developers.google.com/youtube/js_api_reference#Retrieving_video_information

/**
 * Returns the duration in seconds since the video of the video. This
 * method corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getDuration
 *
 */
- (void)getDuration:(void (^ __nullable)(NSTimeInterval duration, NSError * __nullable error))completionHandler;

/**
 * Returns the YouTube.com URL for the video. This method corresponds
 * to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getVideoUrl
 *
 */
- (void)getVideoUrl:(void (^ __nullable)(NSURL * __nullable videoUrl, NSError * __nullable error))completionHandler;

/**
 * Returns the embed code for the current video. This method corresponds
 * to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getVideoEmbedCode
 *
 */
- (void)getVideoEmbedCode:(void (^ __nullable)(NSString * __nullable videoEmbedCode, NSError * __nullable error))completionHandler;

#pragma mark - Retrieving playlist information

// Retrieving playlist information. These methods correspond to the
// JavaScript defined here:
//    https://developers.google.com/youtube/js_api_reference#Retrieving_playlist_information

/**
 * Returns an ordered array of video IDs in the playlist. This method corresponds
 * to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getPlaylist
 *
 */
- (void)getPlaylist:(void (^ __nullable)(NSArray * __nullable playlist, NSError * __nullable error))completionHandler;

/**
 * Returns the 0-based index of the currently playing item in the playlist.
 * This method corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getPlaylistIndex
 *
 */
- (void)getPlaylistIndex:(void (^ __nullable)(int playlistIndex, NSError * __nullable error))completionHandler;

#pragma mark - Mute

/**
 * Mutes the player. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#mute
 */
- (void)mute;

/**
 * Unmutes the player. Corresponds to this method from
 * the JavaScript API:
 *   https://developers.google.com/youtube/iframe_api_reference#unMute
 */
- (void)unMute;

/**
 * Returns true if the player is muted, false if not.
 * This method corresponds to the JavaScript API defined here:
 *   https://developers.google.com/youtube/iframe_api_reference#getVolume
 *
 */
- (void)isMuted:(void (^ __nullable)(BOOL isMuted, NSError * __nullable error))completionHandler;


#pragma mark - Exposed for Testing

/**
 * Removes the internal web view from this player view.
 * Intended to use for testing, should not be used in production code.
 */
- (void)removeWebView;

@end

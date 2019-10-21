# YoutubePlayer-in-WKWebView

[![YoutubePlayer-in-WKWebView version](https://img.shields.io/cocoapods/v/YoutubePlayer-in-WKWebView.svg?style=plastic)](http://cocoadocs.org/docsets/YoutubePlayer-in-WKWebView) [![YoutubePlayer-in-WKWebView platform](https://img.shields.io/cocoapods/p/YoutubePlayer-in-WKWebView.svg?style=plastic)](http://cocoadocs.org/docsets/YoutubePlayer-in-WKWebView) [![ios 8.0](https://img.shields.io/badge/ios-8.0-blue.svg?style=plastic)](http://cocoadocs.org/docsets/YoutubePlayer-in-WKWebView) 

YoutubePlayer-in-WKWebView is forked from [youtube-ios-player-helper](https://github.com/youtube/youtube-ios-player-helper) For using WKWebView.

## Changes from [youtube-ios-player-helper](https://github.com/youtube/youtube-ios-player-helper)

- class prefix changed to WKYT from YT. `YTPlayerView` -> `WKYTPlayerView`
- using WKWebView instead of UIWebView.
- getting properties asynchronously.

```
	// YTPlayerView
	NSTimeInterval duration = self.playerView.duration;

	// WKYTPlayerView
    [self.playerView getDuration:^(NSTimeInterval duration, NSError * _Nullable error) {
        if (!error) {
            float seekToTime = duration * self.slider.value;
        }
    }];
```

## Usage

To run the example project; clone the repo, and run `pod install` from the Project directory first.  For a simple tutorial see this Google Developers article - [Using the YouTube Helper Library to embed YouTube videos in your iOS application](https://developers.google.com/youtube/v3/guides/ios_youtube_helper).

## Requirements

## Installation

YouTube-Player-iOS-Helper is available through [CocoaPods](http://cocoapods.org), to install
it simply add the following line to your Podfile:

    pod "YoutubePlayer-in-WKWebView", "~> 0.3.0"

After installing in your project and opening the workspace, to use the library:

  1. Drag a UIView the desired size of your player onto your Storyboard.
  2. Change the UIView's class in the Identity Inspector tab to WKYTPlayerView
  3. Import "WKYTPlayerView.h" in your ViewController.
  4. Add the following property to your ViewController's header file:
```objc
    @property(nonatomic, strong) IBOutlet WKYTPlayerView *playerView;
```
  5. Load the video into the player in your controller's code with the following code:
```objc
    [self.playerView loadWithVideoId:@"M7lc1UVf-VE"];
```
  6. Run your code!

See the sample project for more advanced uses, including passing additional player parameters, custom html and
working with callbacks via WKYTPlayerViewDelegate.


## License

YoutubePlayer-in-WKWebView is available under the Apache 2.0 license. See the LICENSE file for more info.

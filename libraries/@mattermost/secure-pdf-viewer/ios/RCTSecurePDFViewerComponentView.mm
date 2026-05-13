#ifdef RCT_NEW_ARCH_ENABLED

#import "RCTSecurePDFViewerComponentView.h"
#import <React/RCTConversions.h>
#import <React/RCTComponentViewFactory.h>
#import <React/RCTFabricComponentsPlugins.h>
#import <React/RCTViewComponentView.h>

#import "react/renderer/components/SecurePdfViewer/ComponentDescriptors.h"
#import "react/renderer/components/SecurePdfViewer/EventEmitters.h"
#import "react/renderer/components/SecurePdfViewer/Props.h"
#import "react/renderer/components/SecurePdfViewer/RCTComponentViewHelpers.h"

#if __has_include("secure_pdf_viewer-Swift.h")
#import "secure_pdf_viewer-Swift.h"
#else
#import <secure_pdf_viewer/secure_pdf_viewer-Swift.h>
#endif

using namespace facebook::react;

@interface RCTSecurePDFViewerComponentView ()
@end

@implementation RCTSecurePDFViewerComponentView {
  SecurePdfViewerComponentView *_swiftView;
  std::shared_ptr<const SecurePdfViewerProps> _props;
  std::shared_ptr<const SecurePdfViewerEventEmitter> _eventEmitter;
  BOOL _needsForceUpdate;
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const SecurePdfViewerProps>();
    _props = defaultProps;
    _needsForceUpdate = NO;

    _swiftView = [[SecurePdfViewerComponentView alloc] initWithFrame:self.bounds];
    _swiftView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    self.contentView = _swiftView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps = *std::static_pointer_cast<SecurePdfViewerProps const>(_props);
  const auto &newViewProps = *std::static_pointer_cast<SecurePdfViewerProps const>(props);

  // Force update source if the component was recycled, even if the source is the same
  if (oldViewProps.source != newViewProps.source || _needsForceUpdate) {
    _swiftView.source = [NSString stringWithUTF8String:newViewProps.source.c_str()];
    _needsForceUpdate = NO;
  }

  if (oldViewProps.password != newViewProps.password || _needsForceUpdate) {
    if (!newViewProps.password.empty()) {
      _swiftView.password = [NSString stringWithUTF8String:newViewProps.password.c_str()];
    }
  }

  if (oldViewProps.allowLinks != newViewProps.allowLinks) {
    _swiftView.allowLinks = newViewProps.allowLinks;
  }

  [super updateProps:props oldProps:oldProps];
  _props = std::static_pointer_cast<const SecurePdfViewerProps>(props);
}

- (void)updateEventEmitter:(EventEmitter::Shared const &)eventEmitter {
  [super updateEventEmitter:eventEmitter];
  _eventEmitter = std::static_pointer_cast<SecurePdfViewerEventEmitter const>(eventEmitter);

  __weak __typeof(self) weakSelf = self;

  _swiftView.onLinkPressed = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      SecurePdfViewerEventEmitter::OnLinkPressed event;
      event.url = std::string([[payload objectForKey:@"url"] UTF8String] ?: "");
      eventEmitter->onLinkPressed(event);
    }
  };

  _swiftView.onLinkPressedDisabled = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      eventEmitter->onLinkPressedDisabled({});
    }
  };

  _swiftView.onLoad = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      eventEmitter->onLoad({});
    }
  };

  _swiftView.onPasswordRequired = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      SecurePdfViewerEventEmitter::OnPasswordRequired event;
      event.maxAttempts = [[payload objectForKey:@"maxAttempts"] intValue];
      event.remainingAttempts = [[payload objectForKey:@"remainingAttempts"] intValue];
      eventEmitter->onPasswordRequired(event);
    }
  };

  _swiftView.onPasswordFailed = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      SecurePdfViewerEventEmitter::OnPasswordFailed event;
      event.remainingAttempts = [[payload objectForKey:@"remainingAttempts"] intValue];
      eventEmitter->onPasswordFailed(event);
    }
  };

  _swiftView.onPasswordFailureLimitReached = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      SecurePdfViewerEventEmitter::OnPasswordFailureLimitReached event;
      event.maxAttempts = [[payload objectForKey:@"maxAttempts"] intValue];
      eventEmitter->onPasswordFailureLimitReached(event);
    }
  };

  _swiftView.onLoadError = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      SecurePdfViewerEventEmitter::OnLoadError event;
      event.message = std::string([[payload objectForKey:@"message"] UTF8String] ?: "");
      eventEmitter->onLoadError(event);
    }
  };

  _swiftView.onTap = ^(NSDictionary *payload) {
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (strongSelf && strongSelf->_eventEmitter) {
      auto eventEmitter = strongSelf->_eventEmitter;
      SecurePdfViewerEventEmitter::OnTap event;
      event.x = [[payload objectForKey:@"x"] doubleValue];
      event.y = [[payload objectForKey:@"y"] doubleValue];
      eventEmitter->onTap(event);
    }
  };
}

- (void)prepareForRecycle {
  [super prepareForRecycle];
  // Do NOT set _props or _eventEmitter to nullptr - Fabric will handle lifecycle
  // Clear event handlers to prevent stale callbacks
  _swiftView.onLinkPressed = nil;
  _swiftView.onLinkPressedDisabled = nil;
  _swiftView.onLoad = nil;
  _swiftView.onPasswordRequired = nil;
  _swiftView.onPasswordFailed = nil;
  _swiftView.onPasswordFailureLimitReached = nil;
  _swiftView.onLoadError = nil;
  _swiftView.onTap = nil;

  // Clear the PDF document and reset state to prevent showing old content
  [_swiftView resetPDFState];
  _swiftView.password = nil;

  // Set flag to force update on next props, even if source is the same
  _needsForceUpdate = YES;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<SecurePdfViewerComponentDescriptor>();
}

@end

Class<RCTComponentViewProtocol> SecurePdfViewerCls(void) {
  return RCTSecurePDFViewerComponentView.class;
}

#endif

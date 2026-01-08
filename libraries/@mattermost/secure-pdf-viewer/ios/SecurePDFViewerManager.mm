#import "SecurePDFViewerManager.h"
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>

#if __has_include("secure_pdf_viewer-Swift.h")
#import "secure_pdf_viewer-Swift.h"
#else
#import <secure_pdf_viewer/secure_pdf_viewer-Swift.h>
#endif

#if RCT_NEW_ARCH_ENABLED
#import <React/RCTConversions.h>
#import <react/renderer/components/SecurePdfViewer/ComponentDescriptors.h>
#import <react/renderer/components/SecurePdfViewer/EventEmitters.h>
#import <react/renderer/components/SecurePdfViewer/Props.h>
#import <react/renderer/components/SecurePdfViewer/RCTComponentViewHelpers.h>
#import <React/RCTComponentViewFactory.h>
#endif


@implementation SecurePDFViewerManager

RCT_EXPORT_MODULE(SecurePdfViewer)

RCT_EXPORT_VIEW_PROPERTY(source, NSString)
RCT_EXPORT_VIEW_PROPERTY(password, NSString)
RCT_EXPORT_VIEW_PROPERTY(allowLinks, BOOL)

RCT_EXPORT_VIEW_PROPERTY(onLinkPressed, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLinkPressedDisabled, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoad, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPasswordRequired, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPasswordFailed, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPasswordFailureLimitReached, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoadError, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTap, RCTBubblingEventBlock)

- (UIView *)view {
#if RCT_NEW_ARCH_ENABLED
  // For new architecture, return a placeholder since the real component
  // is registered via RCTSecurePDFViewerComponentView
  return [UIView new];
#else
  // For old architecture, return the Swift view directly
  return [[SecurePdfViewerComponentView alloc] initWithFrame:CGRectZero];
#endif
}

@end

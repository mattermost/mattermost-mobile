#import <React/RCTViewManager.h>

#ifndef SecurePDFViewerManager_h
#define SecurePDFViewerManager_h

NS_ASSUME_NONNULL_BEGIN

@interface SecurePDFViewerManager : RCTViewManager
@end

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTViewComponentView.h>

@interface SecurePdfViewerComponentView : RCTViewComponentView
@end
#endif

NS_ASSUME_NONNULL_END

#endif /* SecurePDFViewerManager_h */

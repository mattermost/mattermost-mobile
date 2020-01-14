import UIKit
import Social
import MobileCoreServices
import UploadAttachments
import LocalAuthentication

extension Bundle {
  var displayName: String? {
    return object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
  }
}

class ShareViewController: SLComposeServiceViewController {
  
  private var dispatchGroup = DispatchGroup()
  private var attachments = AttachmentArray<AttachmentItem>()
  private var store = StoreManager.shared() as StoreManager
  private var entities: [AnyHashable:Any]? = nil
  private var sessionToken: String?
  private var serverURL: String?
  private var message: String?
  private var publicURL: String?
  private var maxPostAlertShown: Bool = false
  private var tempContainerURL: URL? = UploadSessionManager.shared.tempContainerURL() as URL?
  
  fileprivate var selectedChannel: Item?
  fileprivate var selectedTeam: Item?
  private var channelsVC: ChannelsViewController = ChannelsViewController()
  private var teamsVC: TeamsViewController = TeamsViewController()
  
  private var maxMessageSize: Int = 0

  // MARK: - Lifecycle methods
  override func viewDidLoad() {
    super.viewDidLoad()

    title = Bundle.main.displayName
    placeholder = "Write a message..."

    let config = getManagedConfig()
    if let inAppPinCode = config["inAppPinCode"] as? String, inAppPinCode == "true" {
      self.auth(vendor: config["vendor"] as? String)
    } else {
      self.loadData()
    }
  }

  func auth(vendor: String?) {
    let context = LAContext()

    var error: NSError?
    if !context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
      if let error = error, error.code == kLAErrorPasscodeNotSet {
        var message = "This device must be secured with a passcode to use Mattermost.\n\nGo to Settings > Touch ID & Passcode."
        if #available(iOS 11.0, *) {
          if (context.biometryType == LABiometryType.faceID) {
            message = "This device must be secured with a passcode to use Mattermost.\n\nGo to Settings > Face ID & Passcode."
          }
        }

        self.showErrorMessage(
          title: "",
          message: message,
          VC: self
        )
      } else {
        self.showErrorMessage(title: "", message: "Unable to authenticate device owner for Mattermost", VC: self)
      }

      return
    }

    let reason = "Secured by " + (vendor ?? "Mattermost")
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
      if success {
        self.loadData()
      } else {
        self.showErrorMessage(title: "", message: "Unable to authenticate device owner for Mattermost", VC: self)
      }
    }
  }

  func loadData() {
    entities = store.getEntities(true) as [AnyHashable:Any]?
    sessionToken = store.getToken()
    serverURL = store.getServerUrl()
    maxMessageSize = Int(store.getMaxPostSize())

    extractDataFromContext()
    
    if sessionToken == nil || serverURL == nil {
      showErrorMessage(title: "", message: "Authentication required: Please first login using the app.", VC: self)
    } else if store.getCurrentTeamId() == "" {
      showErrorMessage(title: "", message: "You must belong to a team before you can share files.", VC: self)
    }
  }
  
  override func isContentValid() -> Bool {
    if let currentMessage = contentText {
      let contentCount = currentMessage.count
      if #available(iOS 13, *) {} else {
        let remaining = (maxMessageSize - contentCount) as NSNumber
        // this is causing the extension to run OOM on iOS 13
        charactersRemaining = remaining
      }

      //Check content text size is not above max
      if (contentCount > maxMessageSize) {
        if !maxPostAlertShown {
          maxPostAlertShown = true
          showErrorMessageAndStayOpen(title: "", message: "Content text shared in Mattermost must be less than \(maxMessageSize+1) characters.", VC: self)
        }
        return false
      } else if (attachments.count > 0) { // Do validation of contentText and/or NSExtensionContext attachments here
        let maxImagePixels = store.getMaxImagePixels()
        if attachments.hasImageLargerThan(pixels: maxImagePixels) {
          let readableMaxImagePixels = formatImagePixels(pixels: maxImagePixels)
          showErrorMessage(title: "", message: "Image attachments shared in Mattermost must be less than \(readableMaxImagePixels).", VC: self)
        }
        let maxFileSize = store.getMaxFileSize()
        if attachments.hasAttachementLargerThan(fileSize: maxFileSize) {
          let readableMaxFileSize = formatFileSize(fileSize: maxFileSize)
          showErrorMessage(title: "", message: "File attachments shared in Mattermost must be less than \(readableMaxFileSize).", VC: self)
        }
      }
    }

    return serverURL != nil &&
      sessionToken != nil &&
      attachmentsCount() == attachments.count &&
      selectedTeam != nil &&
      selectedChannel != nil
  }
  
  override func didSelectCancel() {
    UploadSessionManager.shared.clearTempDirectory()
    super.didSelectCancel()
  }
  
  override func didSelectPost() {
    // This is called after the user selects Post. Do the upload of contentText and/or NSExtensionContext attachments.
    if publicURL != nil {
      self.message = "\(contentText!)\n\n\(publicURL!)"
    } else {
      self.message = contentText
    }

    UploadManager.shared.uploadFiles(baseURL: serverURL!, token: sessionToken!, channelId: selectedChannel!.id!, message: message, attachments: attachments, callback: {
      // Inform the host that we're done, so it un-blocks its UI. Note: Alternatively you could call super's -didSelectPost, which will similarly complete the extension context.
      self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
    })
  }
  
  override func loadPreviewView() -> UIView! {
    if attachments.findBy(type: kUTTypeFileURL as String) {
      let genericPreview = GenericPreview()
      genericPreview.contentMode = .scaleAspectFit
      genericPreview.clipsToBounds = true
      genericPreview.isUserInteractionEnabled = false
      genericPreview.addConstraints([
        NSLayoutConstraint(item: genericPreview, attribute: .width, relatedBy: .equal, toItem: nil, attribute: .width, multiplier: 1.0, constant: 70),
        NSLayoutConstraint(item: genericPreview, attribute: .height, relatedBy: .equal, toItem: nil, attribute: .height, multiplier: 1.0, constant: 70)
        ])
      
      if attachments.count > 1 {
        genericPreview.mainLabel.text = "\(attachments.count) Items"
      }
      
      return genericPreview
    }
    return super.loadPreviewView();
  }
  
  override func configurationItems() -> [Any]! {
    var items: [SLComposeSheetConfigurationItem] = []
  
    // To add configuration options via table cells at the bottom of the sheet, return an array of SLComposeSheetConfigurationItem here.
    let teamDecks = getTeamItems()
    if let teams = SLComposeSheetConfigurationItem() {
      teams.title = "Team"
      teams.value = selectedTeam?.title
      teams.tapHandler = {
        self.teamsVC.teamDecks = teamDecks
        self.teamsVC.delegate = self
        self.pushConfigurationViewController(self.teamsVC)
      }
      items.append(teams)
    }

    let channelDecks = getChannelItems(forTeamId: selectedTeam?.id)
    if let channels = SLComposeSheetConfigurationItem() {
      channels.title = "Channels"
      channels.value = selectedChannel?.title
      channels.valuePending = channelDecks == nil
      channels.tapHandler = {
        self.channelsVC.channelDecks = channelDecks!
        self.channelsVC.navbarTitle = self.selectedTeam?.title
        self.channelsVC.delegate = self
        self.pushConfigurationViewController(self.channelsVC)
      }
      
      items.append(channels)
    }
    
    validateContent()
    return items
  }
  
  // MARK: - Extension Builder
  
  func attachmentsCount() -> Int {
    var count = 0
    for item in extensionContext?.inputItems as! [NSExtensionItem] {
      guard let attachments = item.attachments else {return 0}
      for itemProvider in attachments {
        if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeMovie as String) ||
          itemProvider.hasItemConformingToTypeIdentifier(kUTTypeImage as String) ||
          itemProvider.hasItemConformingToTypeIdentifier(kUTTypeFileURL as String) {
          count = count + 1
        }
      }
    }
    
    return count
  }
  
  func buildChannelSection(channels: NSArray, currentChannelId: String, key: String, title:String) -> Section {
    let section = Section()
    section.title = title
    for channel in channels as! [NSDictionary] {
      let item = Item()
      let id = channel.object(forKey: "id") as? String
      item.id = id
      item.title = channel.object(forKey: "display_name") as? String
      if id == currentChannelId {
        item.selected = true
        selectedChannel = item
        if #available(iOS 13, *) {} else {
          // this is causing the extension to run OOM on iOS 13
          self.placeholder = "Write to \(item.title!)"
        }
      }
      section.items.append(item)
    }
    return section
  }

  func getImagePixels(imageUrl: URL) -> UInt64 {
    guard let imageData = try? Data(contentsOf: imageUrl) else {
      return 0
    }

    guard let image = UIImage.init(data: imageData) else {
      return 0
    }

    return getImagePixels(image: image)
  }

  func getImagePixels(image: UIImage) -> UInt64 {
    guard let cgImage = image.cgImage else {
        return 0
    }

    return UInt64(cgImage.width * cgImage.height)
  }
  
  func extractDataFromContext() {
    for item in extensionContext?.inputItems as! [NSExtensionItem] {
      guard let attachments = item.attachments else {continue}
      for itemProvider in attachments {
        if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeMovie as String) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: kUTTypeMovie as String, options: nil, completionHandler: ({item, error in
            if error == nil {
              if let url = item as? URL {
                let attachment = self.saveAttachment(url: url)
                if (attachment != nil) {
                  attachment?.type = kUTTypeMovie as String
                  self.attachments.append(attachment!)
                }
              }
            }
            self.dispatchGroup.leave()
          }))
        } else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeImage as String) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: kUTTypeImage as String, options: nil, completionHandler: ({item, error in
            if error == nil {
              if let url = item as? URL {
                let attachment = self.saveAttachment(url: url)
                if (attachment != nil) {
                  attachment?.type = kUTTypeImage as String
                  attachment?.imagePixels = self.getImagePixels(imageUrl: url)
                  self.attachments.append(attachment!)
                }
              } else if let image = item as? UIImage {
                if let data = image.pngData() {
                  let tempImageURL = self.tempContainerURL?
                    .appendingPathComponent(UUID().uuidString)
                    .appendingPathExtension(".png")
                  if (try? data.write(to: tempImageURL!)) != nil {
                    let attachment = self.saveAttachment(url: tempImageURL!)
                    if (attachment != nil) {
                      attachment?.type = kUTTypeImage as String
                      attachment?.imagePixels = self.getImagePixels(image: image)
                      self.attachments.append(attachment!)
                    }
                  }
                }
              }
            }
            self.dispatchGroup.leave()
          }))
        } else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeFileURL as String) {
          dispatchGroup.enter()
          itemProvider.loadItem(forTypeIdentifier: kUTTypeFileURL as String, options: nil, completionHandler: ({item, error in
            if error == nil {
              if let url = item as? URL {
                let attachment = self.saveAttachment(url: url)
                if (attachment != nil) {
                  attachment?.type = kUTTypeFileURL as String
                  self.attachments.append(attachment!)
                }
              }
            }
            self.dispatchGroup.leave()
          }))
        } else if itemProvider.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
          itemProvider.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil, completionHandler: ({item, error in
            if let url = item as? URL {
              self.publicURL = url.absoluteString
            }
          }))
        }
      }
    }
    dispatchGroup.notify(queue: DispatchQueue.main) {
      self.validateContent()
    }
  }
  
  func getChannelsFromServerAndReload(forTeamId: String) {
    var currentChannel = store.getCurrentChannel() as NSDictionary?
    if currentChannel?.object(forKey: "team_id") as! String != forTeamId {
      currentChannel = store.getDefaultChannel(forTeamId) as NSDictionary?
    }
    
    // If currentChannel is nil it means we don't have the channels for this team
    if (currentChannel == nil) {
      let urlString = "\(serverURL!)/api/v4/users/me/teams/\(forTeamId)/channels"
      let url = URL(string: urlString)
      var request = URLRequest(url: url!)
      let auth = "Bearer \(sessionToken!)" as String
      request.setValue(auth, forHTTPHeaderField: "Authorization")
      
      let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
        guard let dataResponse = data,
          error == nil else {
            print(error?.localizedDescription ?? "Response Error")
            return
            
        }
        
        do{
          //here dataResponse received from a network request
          let jsonArray = try JSONSerialization.jsonObject(with: dataResponse, options: []) as! NSArray
          let channels = jsonArray.filter {element in
            let channel = element as! NSDictionary
            let type = channel.object(forKey: "type") as! String
            return type == "O" || type == "P"
          }
          let ent = self.store.getEntities(false)! as NSDictionary
          let mutableEntities = ent.mutableCopy() as! NSMutableDictionary
          let entitiesChannels = NSDictionary(dictionary: mutableEntities.object(forKey: "channels") as! NSMutableDictionary)
            .object(forKey: "channels") as! NSMutableDictionary
          
          for item in channels {
            let channel = item as! NSDictionary
            entitiesChannels.setValue(channel, forKey: channel.object(forKey: "id") as! String)
          }
          
          if let entitiesData: NSData = try? JSONSerialization.data(withJSONObject: ent, options: JSONSerialization.WritingOptions.prettyPrinted) as NSData {
            let jsonString = String(data: entitiesData as Data, encoding: String.Encoding.utf8)! as String
            self.store.updateEntities(jsonString)
            self.store.getEntities(true)
            self.reloadConfigurationItems()
            self.view.setNeedsDisplay()
          }
        } catch let parsingError {
          print("Error", parsingError)
        }
      }
      task.resume()
    }
  }
  
  func getChannelItems(forTeamId: String?) -> [Section]? {
    var channelDecks = [Section]()
    var currentChannel = store.getCurrentChannel() as NSDictionary?
    if currentChannel?.object(forKey: "team_id") as? String != forTeamId {
      currentChannel = store.getDefaultChannel(forTeamId) as NSDictionary?
    }
    
    if currentChannel == nil {
      return nil
    }
    
    let channelsInTeamBySections = store.getChannelsBySections(forTeamId, excludeArchived: true) as NSDictionary
    channelDecks.append(buildChannelSection(
      channels: channelsInTeamBySections.object(forKey: "public") as! NSArray,
      currentChannelId: selectedChannel?.id ?? currentChannel?.object(forKey: "id") as! String,
      key: "public",
      title: "Public Channels"
    ))

    channelDecks.append(buildChannelSection(
      channels: channelsInTeamBySections.object(forKey: "private") as! NSArray,
      currentChannelId: selectedChannel?.id ?? currentChannel?.object(forKey: "id") as! String,
      key: "private",
      title: "Private Channels"
    ))

    channelDecks.append(buildChannelSection(
      channels: channelsInTeamBySections.object(forKey: "direct") as! NSArray,
      currentChannelId: selectedChannel?.id ?? currentChannel?.object(forKey: "id") as! String,
      key: "direct",
      title: "Direct Channels"
    ))
    
    return channelDecks
  }
  
  func getTeamItems() -> [Item] {
    var teamDecks = [Item]()
    let currentTeamId = store.getCurrentTeamId()
    let teams = store.getMyTeams() as NSArray?

    for case let team as NSDictionary in teams! {
      let item = Item()
      item.title = team.object(forKey: "display_name") as! String?
      item.id = team.object(forKey: "id") as! String?
      item.selected = false
      if (item.id == (selectedTeam?.id ?? currentTeamId)) {
        item.selected = true
        selectedTeam = item
      }
      teamDecks.append(item)
    }
    
    return teamDecks
  }

  func saveAttachment(url: URL) -> AttachmentItem? {
    let fileMgr = FileManager.default
    let fileName = url.lastPathComponent
    let tempFileURL = tempContainerURL?.appendingPathComponent(fileName)

    do {
      if (tempFileURL != url) {
        try? FileManager.default.removeItem(at: tempFileURL!)
        try fileMgr.copyItem(at: url, to: tempFileURL!)
      }

      let attr = try fileMgr.attributesOfItem(atPath: (tempFileURL?.path)!) as NSDictionary
      let attachment = AttachmentItem()
      attachment.fileName = fileName
      attachment.fileURL = tempFileURL
      attachment.fileSize = attr.fileSize()

      return attachment
    } catch {
      return nil
    }
  }
  
  // MARK: - Utiilities
  
  func showErrorMessage(title: String, message: String, VC: UIViewController) {
    let alert: UIAlertController = UIAlertController(title: title, message: message, preferredStyle: UIAlertController.Style.alert)
    let okAction = UIAlertAction(title: "OK", style: UIAlertAction.Style.default) {
      UIAlertAction in
      self.cancel()
    }
    alert.addAction(okAction)
    VC.present(alert, animated: true, completion: nil)
  }
  
  func showErrorMessageAndStayOpen(title: String, message: String, VC: UIViewController) {
    let alert: UIAlertController = UIAlertController(title: title, message: message, preferredStyle: UIAlertController.Style.alert)
    let okAction = UIAlertAction(title: "OK", style: UIAlertAction.Style.default)
    alert.addAction(okAction)
    VC.present(alert, animated: true, completion: nil)
  }
  
  func formatImagePixels(pixels: UInt64) -> String {
    let suffixes = ["pixels", "KP", "MP", "GP", "TP", "PP", "EP", "ZP", "YP"]
    let k: Double = 1000
    return formatSize(size: Double(pixels), k: k, suffixes: suffixes)
  }
  
  func formatFileSize(fileSize: UInt64) -> String {
    let suffixes = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    let k: Double = 1024
    return formatSize(size: Double(fileSize), k: k, suffixes: suffixes)
  }
  
  func formatSize(size: Double, k: Double, suffixes: Array<String>) -> String {
    guard size > 0 else {
      return "0 \(suffixes[0])"
    }

    // Adapted from http://stackoverflow.com/a/18650828
    let i = floor(log(size) / log(k))

    // Format number with thousands separator and everything below 1 giga with no decimal places.
    let numberFormatter = NumberFormatter()
    numberFormatter.maximumFractionDigits = i < 3 ? 0 : 1
    numberFormatter.numberStyle = .decimal

    let numberString = numberFormatter.string(from: NSNumber(value: size / pow(k, i))) ?? "Unknown"
    let suffix = suffixes[Int(i)]
    return "\(numberString) \(suffix)"
  }
}

extension ShareViewController: TeamsViewControllerDelegate {
  func selectedTeam(deck: Item) {
    selectedTeam = deck
    selectedChannel = nil
    self.getChannelsFromServerAndReload(forTeamId: deck.id!)
    reloadConfigurationItems()
    popConfigurationViewController()
  }
}

extension ShareViewController: ChannelsViewControllerDelegate {
  func selectedChannel(deck: Item) {
    selectedChannel = deck
    reloadConfigurationItems()
    popConfigurationViewController()
  }
}

import UIKit

class ChannelsViewController: UIViewController {

  let searchController = UISearchController(searchResultsController: nil)
  
  lazy var tableView: UITableView = {
    let tableView = UITableView(frame: self.view.frame)
    tableView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    tableView.dataSource = self
    tableView.delegate = self
    tableView.backgroundColor = .clear
    tableView.register(UITableViewCell.self, forCellReuseIdentifier: Identifiers.ChannelCell)
    
    return tableView
  }()
  
  var navbarTitle: String? = "Channels"
  var channelDecks = [Section]()
  var filteredDecks: [Section]?
  weak var delegate: ChannelsViewControllerDelegate?
  
  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    if #available(iOS 11.0, *) {
      navigationItem.hidesSearchBarWhenScrolling = false
    }
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    if #available(iOS 11.0, *) {
      navigationItem.hidesSearchBarWhenScrolling = true
    }
  }
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    filteredDecks = channelDecks
    title = navbarTitle
    configureSearchBar()
    view.addSubview(tableView)
  }
 
  func configureSearchBar() {
    searchController.searchResultsUpdater = self
    searchController.hidesNavigationBarDuringPresentation = false
    searchController.dimsBackgroundDuringPresentation = false
    searchController.searchBar.searchBarStyle = .minimal
    searchController.searchBar.autocapitalizationType = .none
    searchController.searchBar.delegate = self

    self.definesPresentationContext = true
    
    if #available(iOS 11.0, *) {
      // For iOS 11 and later, place the search bar in the navigation bar.
      
      // Give space at the top so provide a better look and feel
      let offset = UIOffset(horizontal: 0.0, vertical: 6.0)
      searchController.searchBar.searchFieldBackgroundPositionAdjustment = offset
      
      
      navigationItem.searchController = searchController
    } else {
      // For iOS 10 and earlier, place the search controller's search bar in the table view's header.
      tableView.tableHeaderView = searchController.searchBar
    }
  }
  
}

private extension ChannelsViewController {
  struct Identifiers {
    static let ChannelCell = "channelCell"
  }
}

extension ChannelsViewController: UITableViewDataSource {
  func numberOfSections(in tableView: UITableView) -> Int {
    return filteredDecks?.count ?? 0
  }

  func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
    let sec = filteredDecks?[section]
    if (sec?.items.count)! > 0 {
      return sec?.title
    }
    
    return nil
  }
  
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return filteredDecks?[section].items.count ?? 0
  }
  
  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let section = filteredDecks?[indexPath.section]
    let cell = tableView.dequeueReusableCell(withIdentifier: Identifiers.ChannelCell, for: indexPath)
    let item = section?.items[indexPath.row]
    cell.textLabel?.text = item?.title
    if item?.selected ?? false {
      cell.accessoryType = .checkmark
    } else {
      cell.accessoryType = .none
    }
    cell.backgroundColor = .clear
    return cell
  }
}

protocol ChannelsViewControllerDelegate: class {
  func selectedChannel(deck: Item)
}

extension ChannelsViewController: UITableViewDelegate {
  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    let section = filteredDecks?[indexPath.section]
    if (section?.items != nil) {
      delegate?.selectedChannel(deck: (section?.items[indexPath.row])!)
    }
  }
}

extension ChannelsViewController: UISearchResultsUpdating {
  func updateSearchResults(for searchController: UISearchController) {
    if let searchText = searchController.searchBar.text, !searchText.isEmpty {
      filteredDecks = channelDecks.map {section in
        let s = section.copy() as! Section
        let items = section.items.filter{($0.title?.lowercased().contains(searchText.lowercased()))!}
        s.items = items
        return s
      }
    } else {
      filteredDecks = channelDecks
    }
    
    tableView.reloadData()
  }
}

extension ChannelsViewController: UISearchBarDelegate {
  func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
    searchBar.showsCancelButton = false
    searchBar.text = ""
    searchBar.resignFirstResponder()
    tableView.reloadData()
  }
  
  func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
    searchBar.showsCancelButton = true
    
    // Center the Cancel Button
    if #available(iOS 11.0, *) {
      searchBar.cancelButton?.titleEdgeInsets = UIEdgeInsets(top: 12.0, left: 0, bottom: 0, right: 0)
    }
  }
}

// get the cancel button of the Search Bar
extension UISearchBar {
  var cancelButton : UIButton? {
    let topView: UIView = self.subviews[0] as UIView
    
    if let pvtClass = NSClassFromString("UINavigationButton") {
      for v in topView.subviews {
        if v.isKind(of: pvtClass) {
          return v as? UIButton
        }
      }
    }
    
    return nil
  }
}

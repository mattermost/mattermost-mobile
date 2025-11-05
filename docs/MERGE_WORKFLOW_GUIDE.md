# Merge Description Workflow Guide

This guide explains how to create comprehensive merge descriptions for your feature branches.

---

## 📋 Available Templates

### 1. **Full Template** (`MERGE_DESCRIPTION_TEMPLATE.md`)
Comprehensive template for major features with detailed sections.

**Use for:**
- Large features with multiple changes
- Breaking changes
- Features requiring detailed documentation
- Complex architectural updates

### 2. **Quick Template** (`MERGE_DESCRIPTION_QUICK.md`)
Simplified template for smaller changes and quick merges.

**Use for:**
- Bug fixes
- Small feature additions
- Minor updates
- Quick improvements

---

## 🚀 Quick Start

### Option 1: Manual Process

1. **Check your changes:**
   ```bash
   # See commits in your feature branch
   git log dev..feat/your-feature --oneline
   
   # See file statistics
   git diff --stat dev...feat/your-feature
   ```

2. **Copy the appropriate template:**
   ```bash
   # For major features
   cp MERGE_DESCRIPTION_TEMPLATE.md MY_MERGE_DESCRIPTION.md
   
   # For quick changes
   cp MERGE_DESCRIPTION_QUICK.md MY_MERGE_DESCRIPTION.md
   ```

3. **Fill in the template** with your changes

### Option 2: Automated Generation (Recommended)

Use the helper script to automatically generate a draft:

```bash
./scripts/generate-merge-description.sh feat/your-feature dev
```

This will:
- ✅ List all commits
- ✅ Show file statistics
- ✅ Categorize changed files
- ✅ Generate a draft description
- ✅ Create a timestamped file

Then review and fill in the `[TODO]` sections.

---

## 📝 Template Sections Explained

### Summary
Brief 1-2 sentence overview of what the branch accomplishes.

**Example:**
> Implemented a comprehensive Daakia-branded chat experience with custom channel list architecture and enhanced UI components.

### Key Features & Changes
Organize changes into logical categories using emojis:

- 🎨 **Architecture** - Structural and architectural changes
- 📱 **Components** - New or modified UI components
- 🎯 **Navigation** - Routing and navigation updates
- 🖼️ **Visual** - UI/UX and branding changes
- 🌐 **Localization** - Translation and i18n updates
- 🔧 **Technical** - Performance, refactoring, bug fixes
- 📦 **Build** - Build scripts and configuration
- 🗄️ **Database** - Schema and data model changes
- 🔐 **Security** - Security improvements
- 📚 **Documentation** - Documentation updates

### Technical Details
Include:
- Number of files changed
- Lines added/removed
- Breaking changes (if any)
- New dependencies

### Testing
List testing completed:
- Unit tests
- Integration tests
- Platform testing (iOS/Android)
- Manual testing scenarios

### Impact
Describe how this affects:
- End users
- Performance
- App architecture
- Developer experience

---

## 🎯 Best Practices

### ✅ DO:
- Use clear, descriptive titles
- Group related changes together
- Include relevant metrics (files changed, lines added)
- List breaking changes explicitly
- Reference related issues/PRs
- Use emojis for visual categorization
- Keep summaries concise
- Include testing information

### ❌ DON'T:
- Write vague descriptions like "Fixed bugs"
- List every single file change individually
- Skip the summary section
- Forget to mention breaking changes
- Omit testing information
- Use technical jargon without explanation

---

## 📖 Examples

### Example 1: Major Feature
```markdown
# Feature: Daakia Chat - Custom Channel List & Enhanced UI

## Summary
Implemented a comprehensive Daakia-branded chat experience with custom 
channel list architecture, enhanced UI components, and improved user 
onboarding flow.

### 🎨 Custom Daakia Channel List Architecture
- Created new custom channel list with real-time observable pattern
- Added CHANNEL_LIST_ARCHITECTURE.md documentation
- Implemented DaakiaChannelList with optimized post retrieval

[... continue with other sections]
```

### Example 2: Bug Fix
```markdown
# Fix: Channel List Performance Issues

## Summary
Fixed memory leaks and performance issues in channel list rendering.

### 🐛 Fixed
- Memory leak in channel subscription cleanup
- Performance degradation with large channel lists
- Race condition in post loading

### 🔧 Technical Improvements
- Added proper cleanup in useEffect hooks
- Implemented memoization for expensive operations
- Optimized re-render logic

[... continue with testing and impact]
```

---

## 🔄 Workflow

### Before Merging:

1. **Generate Description**
   ```bash
   ./scripts/generate-merge-description.sh feat/your-feature dev
   ```

2. **Review and Edit**
   - Fill in all [TODO] sections
   - Verify commit list
   - Check file categorization
   - Add impact analysis

3. **Test Checklist**
   - Run tests locally
   - Test on both platforms (if applicable)
   - Verify no breaking changes
   - Check for linter errors

4. **Create PR/MR**
   - Copy description to PR/MR body
   - Add relevant labels
   - Request reviewers
   - Link related issues

5. **Merge**
   - Get approvals
   - Run CI/CD checks
   - Merge to target branch
   - Clean up feature branch

---

## 💡 Tips

### For Better Descriptions:

1. **Write as you code**: Keep notes while developing
2. **Use commit messages**: Good commits make better descriptions
3. **Think about reviewers**: What do they need to know?
4. **Consider future you**: Will this make sense in 6 months?

### Time-Saving Tricks:

1. **Keep a running list** of changes as you develop
2. **Use good commit messages** that can be copied
3. **Screenshot before/after** for visual changes
4. **Tag commits** with categories (feat:, fix:, refactor:)

---

## 🛠️ Customization

Feel free to:
- Add new emoji categories
- Modify template sections
- Create project-specific templates
- Add custom scripts for your workflow

---

## 📚 Resources

- **Template Files**: `MERGE_DESCRIPTION_TEMPLATE.md`, `MERGE_DESCRIPTION_QUICK.md`
- **Generator Script**: `scripts/generate-merge-description.sh`
- **Git Commands**: See "Quick Start" section above

---

## Questions?

If you need help with merge descriptions:
1. Check this guide
2. Look at previous merge descriptions in git history
3. Ask your team lead or senior developers

---

**Happy Merging! 🚀**


# Comment Moderation System

This repository uses an automated moderation system to keep your blog comments clean and safe. The system works with [Giscus](https://giscus.app) to automatically moderate comments posted as GitHub Discussions.

## 🛡️ Features

### Automatic Moderation
- **Banned Words Filter**: Automatically hides comments containing offensive or inappropriate language
- **Spam Detection**: Identifies and hides spam comments based on patterns like:
  - Excessive links (more than 3)
  - Suspicious domains (.tk, .ml, .ga, .cf, etc.)
  - Repeated characters or patterns
  - All caps text
  - Excessive emojis (more than 10)
  - Common spam phrases
- **User Blocking**: Automatically hides all comments from blocked users
- **Trusted Users**: Bypass moderation for trusted users

### Manual Moderation Commands
Repository collaborators can use commands in issue comments to manage moderation:

- `/moderate block @username` - Block a user
- `/moderate unblock @username` - Unblock a user  
- `/moderate trust @username` - Add user to trusted list
- `/moderate untrust @username` - Remove user from trusted list
- `/moderate ban-word word` - Add word to banned list
- `/moderate unban-word word` - Remove word from banned list
- `/moderate status` - Show current moderation statistics

## 📁 File Structure

```
.banned/
├── banned-words.txt    # List of banned words (one per line)
├── blocked-users.txt   # List of blocked usernames (one per line)
└── trusted-users.txt   # List of trusted usernames (one per line)

.github/workflows/
├── moderate-comments.yml  # Automatic moderation workflow
└── manual-moderation.yml  # Manual moderation commands workflow
```

## ⚙️ How It Works

### Automatic Moderation Process
1. When a comment is posted to a GitHub Discussion (via Giscus)
2. The system checks if the user is trusted (skip moderation) or blocked (hide immediately)
3. The comment is scanned for:
   - Banned words using regex matching
   - Spam patterns and excessive content
4. If violations are found, the comment is minimized with appropriate classification
5. A moderation log is created for transparency

### Classification Types
- `ABUSE` - For offensive language and harassment
- `SPAM` - For spam content and excessive promotional material
- `OFF_TOPIC` - For general policy violations

## 🔧 Configuration

### Adding Trusted Users
Edit `.banned/trusted-users.txt` and add usernames (one per line):
```
your-username
trusted-moderator
verified-contributor
```

### Adding Blocked Users
Edit `.banned/blocked-users.txt` and add usernames (one per line):
```
spam-account
offensive-user
```

### Managing Banned Words
Edit `.banned/banned-words.txt` to add or remove words. The system uses word boundary matching, so partial matches within larger words won't trigger the filter.

## 🚀 Setup Instructions

1. **Enable Discussions** in your repository settings
2. **Set up Giscus** on your blog following their [configuration guide](https://giscus.app)
3. **Grant Permissions**: Ensure the GitHub Actions have the necessary permissions:
   - `discussions: write`
   - `issues: write` 
   - `contents: read`
4. **Add Collaborators**: Give moderation permissions to trusted users by making them repository collaborators

## 🔍 Monitoring

### Viewing Moderation Actions
- Check the Actions tab for workflow runs and logs
- Moderation actions are logged in discussion comments
- Hidden comments appear minimized with a reason

### Manual Review
Repository administrators can:
- Restore hidden comments if they were incorrectly flagged
- Adjust the banned words list based on feedback
- Review and update user lists

## 🛠️ Customization

### Adjusting Spam Thresholds
Edit the workflow file to modify:
- Link count threshold (currently 3)
- Emoji count threshold (currently 10)
- Add custom spam patterns

### Adding New Detection Patterns
You can extend the `spamPatterns` array in the workflow with additional regex patterns:
```javascript
const spamPatterns = [
  /your-custom-pattern/i,
  // ... existing patterns
];
```

## 📊 Best Practices

1. **Regular Review**: Periodically review the banned words list and remove outdated terms
2. **Community Guidelines**: Clearly communicate your community standards to users
3. **Balanced Approach**: Don't over-moderate; allow for legitimate discussions
4. **Transparency**: The system logs all actions for accountability
5. **Feedback Loop**: Encourage users to report false positives

## 🆘 Troubleshooting

### Comments Not Being Moderated
- Check that GitHub Actions are enabled
- Verify workflow permissions
- Ensure the discussion was created after the workflow was added

### False Positives
- Use `/moderate untrust` and `/moderate trust` commands to manage user lists
- Review and refine banned words list
- Adjust spam detection thresholds

### Manual Intervention
- Repository admins can always manually hide/restore comments
- Use the GitHub web interface to manage discussions directly
- Update moderation lists via direct file editing

## 🔐 Security Considerations

- Only repository collaborators can use moderation commands
- All moderation actions are logged and auditable
- Banned words list should be reviewed regularly
- Consider the balance between automation and human oversight

---

*This moderation system helps maintain a positive commenting environment while preserving the open nature of GitHub Discussions. Adjust the configuration based on your community's needs and feedback.*
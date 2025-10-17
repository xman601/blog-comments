# Testing the Moderation System

Here are several ways to test your blog comment moderation system to ensure it's working correctly.

## 🧪 Testing Methods

### Method 1: GitHub Discussions (Recommended)
This tests the actual production flow that Giscus uses.

1. **Enable Discussions** in your repository if not already done:
   - Go to Settings → General → Features
   - Check "Discussions"

2. **Create a test discussion**:
   - Go to the Discussions tab
   - Click "New discussion"
   - Choose "General" category
   - Title: "Test Discussion for Moderation"

3. **Test different scenarios** by posting comments:

#### Test Cases to Try:

**A. Banned Words Test:**
```
This is a test comment with shit in it.
```
*Expected: Comment should be hidden with "ABUSE" classification*

**B. Spam Link Test:**
```
Check out this amazing deal at http://spam.tk and http://fake.ml and http://scam.ga and http://bad.cf!
```
*Expected: Comment should be hidden with "SPAM" classification*

**C. Repeated Characters Test:**
```
This is soooooooo awesome!!! AMAZING DEAL!!!
```
*Expected: Comment should be hidden with "SPAM" classification*

**D. Excessive Emojis Test:**
```
🎉🎊🔥💯✨🚀🌟💎🎯🏆🎈 Amazing post! 🎉🎊🔥💯✨🚀🌟💎🎯🏆🎈
```
*Expected: Comment should be hidden with "SPAM" classification*

**E. Normal Comment Test:**
```
This is a great blog post! Thanks for sharing your insights.
```
*Expected: Comment should remain visible*

### Method 2: Manual Moderation Commands Test

1. **Create an issue** in your repository
2. **Add yourself as a collaborator** (if you're not the owner)
3. **Test moderation commands** by commenting:

```
/moderate status
```
*Expected: Shows current moderation statistics*

```
/moderate block test-user
```
*Expected: Adds "test-user" to blocked list*

```
/moderate trust trusted-person
```
*Expected: Adds "trusted-person" to trusted list*

```
/moderate ban-word testword
```
*Expected: Adds "testword" to banned words*

```
/moderate status
```
*Expected: Shows updated statistics*

### Method 3: User List Testing

1. **Add a test user to blocked list**:
   - Edit `.banned/blocked-users.txt`
   - Add: `test-blocked-user`
   - Commit the changes

2. **Create a test account or ask someone to comment**:
   - Any comment from `test-blocked-user` should be auto-hidden

3. **Add yourself to trusted users**:
   - Edit `.banned/trusted-users.txt`
   - Add your GitHub username
   - Commit the changes
   - Try posting a comment with banned words - it should NOT be hidden

## 🔍 Monitoring Test Results

### Check GitHub Actions
1. Go to **Actions** tab in your repository
2. Look for workflow runs after posting comments
3. Click on runs to see detailed logs:
   - Look for "🔍 Moderating comment from @username"
   - Check for "🚫 [violation type] detected" messages
   - Verify "✅ Comment hidden successfully" confirmations

### Check Discussion Comments
1. Go back to your test discussion
2. Hidden comments will appear minimized with a reason:
   - "This comment was marked as abuse"
   - "This comment was marked as spam"
   - "This comment was marked as off-topic"

### Check Workflow Logs
Look for these log messages in Actions:
```
🔍 Moderating comment from @username
✅ @username is a trusted user. Skipping moderation.
🚫 @username is blocked. Hiding comment...
🚫 Banned words detected: word1, word2
🚫 Spam detected: links=4, emojis=12, patterns=true
✅ Comment hidden successfully for offensive language.
✅ Comment from @username passed all filters.
```

## 🛠️ Troubleshooting Tests

### If Comments Aren't Being Hidden:

1. **Check Permissions**:
   - Ensure workflows have `discussions: write` permission
   - Verify you're testing in the correct repository

2. **Check Timing**:
   - Wait 1-2 minutes after posting for the workflow to run
   - Refresh the discussion page

3. **Check Workflow Status**:
   - Go to Actions tab
   - Look for failed workflow runs
   - Check error messages in logs

4. **Check File Formats**:
   - Ensure `.banned/banned-words.txt` has one word per line
   - Verify no extra spaces or special characters

### If Manual Commands Don't Work:

1. **Check Permissions**:
   - Ensure you're a repository collaborator
   - Verify the command syntax is correct

2. **Check Issue vs Discussion**:
   - Manual commands work on **Issues**, not Discussions
   - Create an issue to test commands

## 📊 Expected Test Results Summary

| Test Type | Input | Expected Result |
|-----------|-------|----------------|
| Banned Word | Comment with "shit" | Hidden (ABUSE) |
| Excessive Links | 4+ links | Hidden (SPAM) |
| Repeated Chars | "soooooo" | Hidden (SPAM) |
| Blocked User | Any comment from blocked user | Hidden (SPAM) |
| Trusted User | Banned word from trusted user | NOT hidden |
| Normal Comment | Clean, appropriate comment | Visible |
| `/moderate status` | Command in issue | Shows stats |
| `/moderate block user` | Command in issue | Blocks user |

## 🎯 Quick Test Script

Here's a quick sequence to test everything:

1. **Add yourself to trusted users** (edit `.banned/trusted-users.txt`)
2. **Create a test discussion**
3. **Post this comment**: "This is a shit test" 
4. **Wait 2 minutes and refresh** - should NOT be hidden (you're trusted)
5. **Remove yourself from trusted users**
6. **Post this comment**: "Another shit test"
7. **Wait 2 minutes and refresh** - should be hidden now
8. **Create an issue and comment**: `/moderate status`
9. **Check that you get a stats response**

## 🔄 Continuous Testing

Consider setting up periodic tests:
- Monthly test of banned words effectiveness
- Quarterly review of spam detection accuracy
- Regular testing after any workflow changes
- Monitor false positive rates

---

*Remember: Test in a safe environment first, and always monitor the Actions logs to understand what the system is doing.*
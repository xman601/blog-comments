# blog-comments
This repo holds all the comments for my blog

## 🎯 Purpose
This repository stores comments for my blog using [Giscus](https://giscus.app), which converts GitHub Discussions into a commenting system for static websites.

## 🛡️ Moderation
This repository includes an automated moderation system that:
- Filters offensive language and spam
- Manages blocked and trusted users
- Provides manual moderation commands
- Logs all moderation actions

For detailed moderation documentation, see [MODERATION.md](MODERATION.md).

## 🚀 Quick Moderation Commands
Repository collaborators can use these commands in issue comments:
- `/moderate block @username` - Block a user
- `/moderate trust @username` - Add user to trusted list  
- `/moderate ban-word word` - Ban a word
- `/moderate status` - Show moderation stats

## 📁 Repository Structure
- `.banned/` - Moderation configuration files
- `.github/workflows/` - Automated moderation workflows
- `MODERATION.md` - Complete moderation documentation
- `TESTING.md` - How to test the moderation system
- `COMMUNITY_GUIDELINES.md` - Community rules for commenters

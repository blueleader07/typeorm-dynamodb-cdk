# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-08

### Added
- Initial release of typeorm-dynamodb-cdk
- Automatic DynamoDB table creation from TypeORM entities
- Support for scanning entity files from directory path
- Support for creating tables from entity objects
- Global Secondary Index support
- DynamoDB Streams configuration
- IAM permissions integration
- Point-in-time recovery support
- Generic tag support with `Record<string, string>` for flexible resource tagging
- Global table (multi-region replication) support
- TableV2 support for global tables
- Comprehensive documentation and examples

### Design Decisions
- **Generic Tags Map**: Provides a simple `tags` map (`Record<string, string>`) that users can populate with any key-value pairs they need - backup policies, cost centers, environments, teams, etc. This follows standard AWS/CDK conventions.
- **Additive Tag Behavior**: Tags are added to tables using CDK's `Tags.of().add()` API, ensuring they are additive with stack-level tags and won't overwrite inherited tags.
- **No Default Tags**: Tags are optional and must be explicitly provided. Tables are created without tags unless configured by the user.

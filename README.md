# typeorm-dynamodb-cdk

AWS CDK utilities to scan TypeORM entities and create DynamoDB tables automatically.

This library provides a convenient way to create DynamoDB tables in your AWS CDK applications by scanning TypeORM entity definitions. It supports both scanning entity files from a directory path and creating tables from entity objects.

## Installation

```bash
npm install --save typeorm-dynamodb-cdk
```

## Prerequisites

This library requires:
- TypeORM 0.3+ with DynamoDB entities
- AWS CDK 2.0+
- Node.js 18+

## Features

- 🔍 **Automatic Entity Scanning**: Scan a directory for TypeORM entities and automatically create DynamoDB tables
- 📦 **Direct Entity Support**: Create tables from TypeORM entity objects
- 🌍 **Global Tables**: Support for multi-region DynamoDB global tables
- 🔐 **IAM Integration**: Automatically configure IAM permissions for table access
- 📊 **Secondary Indexes**: Support for Global Secondary Indexes
- 🔄 **Streams**: Configure DynamoDB streams with custom view types
- 💾 **Backup Configuration**: Built-in AWS Backup tag support
- 🎯 **CDK Native**: Fully integrated with AWS CDK constructs

## Usage

### Basic Usage - Scan Entity Files

```typescript
import { Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { createTables } from 'typeorm-dynamodb-cdk'

export class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    // Scan a directory for TypeORM entities and create tables
    const tables = createTables(this, {
      entities: './src/entities',
      database: 'myapp',
      schema: 'prod'
    })
  }
}
```

### Advanced Usage - With Streams and IAM Permissions

```typescript
import { Stack, RemovalPolicy } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { Role } from 'aws-cdk-lib/aws-iam'
import { StreamViewType } from 'aws-cdk-lib/aws-dynamodb'
import { createTables } from 'typeorm-dynamodb-cdk'

export class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    const lambdaRole = new Role(this, 'LambdaRole', {
      // ... role configuration
    })

    const tables = createTables(this, {
      entities: './src/entities',
      database: 'myapp',
      schema: 'prod',
      
      // Configure streams for specific tables
      streams: {
        'myapp.prod.user': StreamViewType.NEW_AND_OLD_IMAGES,
        'myapp.prod.order': StreamViewType.NEW_IMAGE
      },
      
      // Grant full access to the Lambda role
      grantFullAccess: [lambdaRole],
      
      // Enable point-in-time recovery
      pointInTimeRecovery: true,
      
      // Set removal policy
      removalPolicy: RemovalPolicy.RETAIN,
      
      // Add custom tags (additive - won't overwrite stack tags)
      tags: {
        'backup-schedule': 'daily',
        'environment': 'production',
        'cost-center': 'engineering'
      },
      
      // Use TableV2 (global tables)
      v2: true
    })
  }
}
```

### Creating Tables from Entity Objects

```typescript
import { User } from './entities/user'
import { Order } from './entities/order'

const tables = createTables(this, {
  entities: [User, Order],
  database: 'myapp'
})
```

### Global Tables (Multi-Region Replication)

```typescript
const tables = createTables(this, {
  entities: './src/entities',
  v2: true,  // Required for global tables
  replicas: [
    { region: 'us-west-2' },
    { region: 'eu-west-1' }
  ]
})
```

## TypeORM Entity Example

Your TypeORM entities should use standard TypeORM decorators:

```typescript
import { Entity, PrimaryColumn, Column } from 'typeorm'
import { GlobalSecondaryIndex } from 'typeorm-dynamodb'

@Entity({ name: 'user', database: 'myapp', schema: 'prod' })
@GlobalSecondaryIndex({ 
  name: 'emailIndex', 
  partitionKey: 'email' 
})
@GlobalSecondaryIndex({ 
  name: 'ageIndex', 
  partitionKey: 'age', 
  sortKey: ['lastname', 'firstname'] 
})
export class User {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id: string

  @Column({ name: 'email', type: 'varchar' })
  email: string

  @Column({ name: 'firstname', type: 'varchar' })
  firstname: string

  @Column({ name: 'lastname', type: 'varchar' })
  lastname: string

  @Column({ name: 'age', type: 'int' })
  age: number
}
```

## API Reference

### `createTables(scope, options)`

Creates DynamoDB tables based on TypeORM entities.

**Parameters:**
- `scope: Construct` - The CDK construct scope
- `options: DynamodbTableCreatorPathOptions | DynamodbTableCreatorTypeOptions` - Configuration options

**Options:**
- `entities: string | any[]` - Path to entity files or array of entity classes (required)
- `database?: string` - Database name prefix for table names
- `schema?: string` - Schema name prefix for table names
- `grantFullAccess?: IGrantable[]` - IAM principals to grant full table access
- `streams?: StreamViewTypes` - Map of table names to stream view types
- `pointInTimeRecovery?: boolean` - Enable point-in-time recovery
- `tags?: Record<string, string>` - Key-value tags to apply to tables (additive with stack tags)
- `removalPolicy?: RemovalPolicy` - Table removal policy (default: DESTROY)
- `replicas?: ReplicaTableProps[]` - Regions for global table replication
- `v2?: boolean` - Use TableV2 for global tables
- `overrideTableIds?: Map<string, string>` - Custom CloudFormation logical IDs

### `buildTable(scope, id, tableDetails, indexDetails)`

Builds a single DynamoDB table.

### `buildTableName(tableDetails)`

Constructs the table name from database, schema, and entity name.

## Configuration

### Stream View Types

When configuring streams, use AWS CDK's `StreamViewType` enum:
- `StreamViewType.NEW_IMAGE` - Only the new item
- `StreamViewType.OLD_IMAGE` - Only the old item
- `StreamViewType.NEW_AND_OLD_IMAGES` - Both new and old items
- `StreamViewType.KEYS_ONLY` - Only the keys

### Tags

Add custom tags to your DynamoDB tables:

```typescript
createTables(this, {
  entities: './src/entities',
  tags: {
    'backup-policy': 'production-daily',
    'environment': 'production',
    'team': 'platform',
    'cost-center': '12345'
  }
})
```

Tags are **additive** - they are added to any tags inherited from the parent stack and won't overwrite stack-level tags. You can use any key-value pairs that fit your organization's tagging strategy.

## Table Naming Convention

Tables are named using the pattern: `{database}.{schema}.{entityName}`

For example, an entity with:
- `database: 'myapp'`
- `schema: 'prod'`
- `name: 'user'`

Results in table name: `myapp.prod.user`

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Publishing

This library is published to NPM via GitHub Actions. To publish:

1. Go to Actions → Publish to NPM
2. Select version bump type (patch/minor/major)
3. Run the workflow

## License

ISC

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.

## Related Projects

- [typeorm-dynamodb](https://github.com/blueleader07/typeorm-dynamodb) - DynamoDB support for TypeORM
- [AWS CDK](https://github.com/aws/aws-cdk) - AWS Cloud Development Kit

## Support

For issues and questions:
- GitHub Issues: https://github.com/blueleader07/typeorm-dynamodb-cdk/issues

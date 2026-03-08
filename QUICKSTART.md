# Quick Start Guide

Get started with `typeorm-dynamodb-cdk` in 5 minutes.

## Step 1: Install

```bash
npm install --save typeorm-dynamodb-cdk
```

## Step 2: Create a TypeORM Entity

```typescript
// src/entities/user.ts
import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity({ name: 'user' })
export class User {
  @PrimaryColumn({ name: 'id', type: 'varchar' })
  id: string

  @Column({ name: 'email', type: 'varchar' })
  email: string

  @Column({ name: 'name', type: 'varchar' })
  name: string
}
```

## Step 3: Create Tables in Your CDK Stack

```typescript
// lib/my-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { createTables } from 'typeorm-dynamodb-cdk'

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Option A: Scan entity files from a directory
    const tables = createTables(this, {
      entities: './src/entities'
    })

    // Option B: Pass entity classes directly
    // import { User } from '../entities/user'
    // const tables = createTables(this, {
    //   entities: [User]
    // })

    console.log(`Created ${tables.length} DynamoDB tables`)
  }
}
```

## Step 4: Deploy

```bash
cdk deploy
```

## That's it! 🎉

Your DynamoDB tables are now created based on your TypeORM entity definitions.

## Next Steps

### Add Global Secondary Index

```typescript
import { GlobalSecondaryIndex } from 'typeorm-dynamodb'

@Entity({ name: 'user' })
@GlobalSecondaryIndex({ 
  name: 'emailIndex', 
  partitionKey: 'email' 
})
export class User {
  // ... columns
}
```

### Configure Streams

```typescript
import { StreamViewType } from 'aws-cdk-lib/aws-dynamodb'

createTables(this, {
  entities: './src/entities',
  streams: {
    'user': StreamViewType.NEW_AND_OLD_IMAGES
  }
})
```

### Grant IAM Permissions

```typescript
import { Role } from 'aws-cdk-lib/aws-iam'

const lambdaRole = new Role(this, 'LambdaRole', {
  // ... role config
})

createTables(this, {
  entities: './src/entities',
  grantFullAccess: [lambdaRole]
})
```

### Add Database/Schema Prefixes

```typescript
createTables(this, {
  entities: './src/entities',
  database: 'myapp',
  schema: 'prod'
})

// Results in table name: myapp.prod.user
```

### Enable Point-in-Time Recovery

```typescript
createTables(this, {
  entities: './src/entities',
  pointInTimeRecovery: true
})
```

### Configure Global Tables (Multi-Region)

```typescript
createTables(this, {
  entities: './src/entities',
  v2: true,
  replicas: [
    { region: 'us-west-2' },
    { region: 'eu-west-1' }
  ]
})
```

### Add Custom Tags

```typescript
createTables(this, {
  entities: './src/entities',
  tags: {
    'environment': 'production',
    'team': 'platform',
    'cost-center': '12345',
    'backup-policy': 'daily'
  }
})
```

## Common Patterns

### Separate Stacks for Different Environments

```typescript
// lib/dev-stack.ts
createTables(this, {
  entities: './src/entities',
  schema: 'dev',
  removalPolicy: RemovalPolicy.DESTROY
})

// lib/prod-stack.ts
createTables(this, {
  entities: './src/entities',
  schema: 'prod',
  removalPolicy: RemovalPolicy.RETAIN,
  pointInTimeRecovery: true,
  tags: {
    'backup-schedule': 'daily',
    'environment': 'production'
  }
})
```

### Lambda Function with Table Access

```typescript
const tables = createTables(this, {
  entities: './src/entities'
})

const fn = new NodejsFunction(this, 'MyFunction', {
  entry: 'lambda/handler.ts'
})

// Grant the Lambda function access to all tables
tables.forEach(table => {
  table.grantReadWriteData(fn)
})
```

### Use with TypeORM DataSource

Once tables are created in AWS:

```typescript
// In your Lambda or application
import { DataSource } from 'typeorm'
import { User } from './entities/user'

const dataSource = new DataSource({
  type: 'dynamodb',
  entities: [User],
  // ... other config
})

await dataSource.initialize()

// Now use TypeORM as normal
const userRepo = dataSource.getRepository(User)
const user = await userRepo.findOne({ where: { id: '123' } })
```

## Troubleshooting

### Table not created?
- Check entity has `@Entity` decorator
- Verify entity file is in scanned directory
- Look for warnings in CDK synth output

### Wrong table name?
- Use `database` and `schema` options to add prefixes
- Format: `{database}.{schema}.{entityName}`

### Permission denied?
- Add IAM principal to `grantFullAccess` array
- Or use table.grantReadWriteData() on individual tables

## More Information

- [Full Documentation](README.md)
- [GitHub Repository](https://github.com/blueleader07/typeorm-dynamodb-cdk)
- [typeorm-dynamodb](https://github.com/blueleader07/typeorm-dynamodb)

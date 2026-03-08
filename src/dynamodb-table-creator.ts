import {
    Billing,
    BillingMode, CfnGlobalTable,
    ProjectionType,
    StreamViewType,
    Table, TableV2
} from 'aws-cdk-lib/aws-dynamodb'
import { RemovalPolicy, Stack, Tags } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { TableDetails } from './models/table-details'
import { scan } from './parsers/annotation-parser'
import { Effect, IGrantable, PolicyStatement, Role, User } from 'aws-cdk-lib/aws-iam'
import { IndexDetails } from './models/index-details'
import { ReplicaTableProps } from 'aws-cdk-lib/aws-dynamodb/lib/table-v2'

export interface StreamViewTypes {
    [tablePhysicalName: string]: StreamViewType
}

class DynamodbTableCreatorOptions {
    database?: string
    schema?: string
    grantFullAccess?: IGrantable[]
    overrideTableIds?: Map<string, string>
    streams?: StreamViewTypes
    pointInTimeRecovery?: boolean
    tags?: Record<string, string>
    removalPolicy?: RemovalPolicy
    replicas?: ReplicaTableProps[]
    v2?: boolean
}

export class DynamodbTableCreatorPathOptions extends DynamodbTableCreatorOptions {
    entities: string
}

export class DynamodbTableCreatorTypeOptions extends DynamodbTableCreatorOptions {
    entities: any[]
}

const isReplicaRegion = (region: string, replicas: ReplicaTableProps[]) => {
    return replicas.some(replica => replica.region.toLowerCase() === region.toLowerCase())
}

const addTableIndices = (indexDetails: IndexDetails[], table: Table | TableV2) => {
    if (indexDetails) {
        indexDetails.forEach((index: any) => {
            table.addGlobalSecondaryIndex({
                indexName: index.indexName,
                partitionKey: index.partitionKey,
                sortKey: index.sortKey,
                projectionType: ProjectionType.ALL
            })
        })
    }
}

export const buildTableName = (tableDetails: TableDetails): string => {
    const parts = [tableDetails.name]
    if (tableDetails.schema) {
        parts.unshift(tableDetails.schema)
    }
    if (tableDetails.database) {
        parts.unshift(tableDetails.database)
    }
    return parts.join('.')
}

const buildTableId = (tableName: string, overrideTableIds?: Map<string, string>): string => {
    const tableId = tableName.replace(/[._]+/g, '-')
    if (overrideTableIds) {
        const overrideTableId = overrideTableIds.get(tableId)
        if (overrideTableId) {
            return overrideTableId
        }
    }
    return tableId
}

export const buildTable = (scope: Construct, id: string, tableDetails: TableDetails, indexDetails: IndexDetails[]): Table | TableV2 => {
    const removalPolicy = tableDetails.removalPolicy || RemovalPolicy.DESTROY
    const replicas = tableDetails.replicas || []
    const pointInTimeRecovery = tableDetails.pointInTimeRecovery
    const region = Stack.of(scope).region
    let table: Table | TableV2
    if (tableDetails.v2) {
        if (isReplicaRegion(region, replicas)) {
            return TableV2.fromTableName(scope, id, tableDetails.tableName!) as TableV2
        }
        const tableConfig: any = {
            tableName: tableDetails.tableName,
            billing: Billing.onDemand(),
            partitionKey: tableDetails.partitionKey,
            removalPolicy,
            timeToLiveAttribute: tableDetails.timeToLiveAttribute || 'ttl',
            dynamoStream: tableDetails.stream,
            pointInTimeRecovery,
            replicas,
            globalSecondaryIndexes: tableDetails.indexes.map(index => {
                return {
                    indexName: index.indexName,
                    partitionKey: index.partitionKey,
                    sortKey: index.sortKey,
                    projectionType: ProjectionType.ALL
                }
            })
        }
        const tableV2 = new TableV2(scope, id, tableConfig)
        if (tableDetails.tags) {
            Object.entries(tableDetails.tags).forEach(([key, value]) => {
                Tags.of(tableV2).add(key, value)
            })
        }
        return tableV2
    } else {
        if (isReplicaRegion(region, replicas)) {
            return Table.fromTableName(scope, id, tableDetails.tableName!) as Table
        }
        table = new Table(scope, id, {
            tableName: tableDetails.tableName,
            billingMode: BillingMode.PAY_PER_REQUEST,
            partitionKey: tableDetails.partitionKey,
            removalPolicy,
            timeToLiveAttribute: tableDetails.timeToLiveAttribute || 'ttl',
            stream: tableDetails.stream,
            pointInTimeRecovery,
            replicationRegions: replicas.map(replica => replica.region)
        })
        addTableIndices(indexDetails, table)
        if (tableDetails.tags) {
            Object.entries(tableDetails.tags).forEach(([key, value]) => {
                Tags.of(table).add(key, value)
            })
        }
        return table
    }
}

const getGrantableArn = (grantable: IGrantable): string | undefined => {
    if (grantable instanceof Role) {
        return grantable.roleArn
    }
    if (grantable instanceof User) {
        return grantable.userArn
    }
    return undefined
}

interface AddToResourcePolicyOptions {
    table: Table | TableV2
    stream?: StreamViewType
    grantable: IGrantable,
    v2?: boolean
}

const addToResourcePolicy = (options: AddToResourcePolicyOptions) => {
    const { table, stream, grantable, v2 } = options
    const grantableArn = getGrantableArn(grantable)
    if (grantableArn && stream) {
        if (stream) {
            if (v2) {
                const cfnTable = table.node.defaultChild as CfnGlobalTable
                if (cfnTable) {
                    const tableStack = Stack.of(table)
                    const replicas = tableStack.resolve(cfnTable.replicas) as CfnGlobalTable.ReplicaSpecificationProperty[]
                    if (Array.isArray(replicas)) {
                        cfnTable.replicas = replicas.map(replica => {
                            return {
                                ...replica,
                                replicaStreamSpecification: {
                                    streamViewType: stream,
                                    resourcePolicy: {
                                        policyDocument: {
                                            Version: '2012-10-17',
                                            Statement: [
                                                {
                                                    Effect: 'Allow',
                                                    Principal: { AWS: '*' },
                                                    Action: [
                                                        'dynamodb:DescribeStream',
                                                        'dynamodb:GetRecords',
                                                        'dynamodb:GetShardIterator'
                                                    ],
                                                    Resource: '*',
                                                    Condition: {
                                                        StringEquals: {
                                                            'aws:PrincipalArn': grantableArn
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        })
                    }
                }
            } else {
                const cfnTable: any = table.node.defaultChild
                cfnTable.streamSpecification = {
                    streamViewType: stream,
                    resourcePolicy: {
                        policyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Principal: { AWS: '*' },
                                    Action: [
                                        'dynamodb:DescribeStream',
                                        'dynamodb:GetRecords',
                                        'dynamodb:GetShardIterator'
                                    ],
                                    Resource: '*',
                                    Condition: {
                                        StringEquals: {
                                            'aws:PrincipalArn': grantableArn
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
    }
}

const fromArray = (scope: Construct, options: DynamodbTableCreatorTypeOptions) => {
    const streams = options.streams || {}
    const entities = Array.isArray(options.entities) ? options.entities : []
    const grantables = options.grantFullAccess || []

    // Build all tables and collect ARNs in single pass
    const allTableArns: string[] = []
    const tables = entities.map(entity => {
        const tableDetails = { ...entity.tableDetails }
        tableDetails.schema = options.schema || tableDetails.schema
        tableDetails.database = options.database || tableDetails.database
        tableDetails.tableName = buildTableName(tableDetails)
        tableDetails.stream = streams[tableDetails.tableName]
        tableDetails.pointInTimeRecovery = options.pointInTimeRecovery
        tableDetails.tags = options.tags
        tableDetails.removalPolicy = options.removalPolicy
        tableDetails.replicas = options.replicas
        tableDetails.v2 = options.v2
        const table = buildTable(scope, buildTableId(tableDetails.tableName, options.overrideTableIds), tableDetails, entity.indexDetails)

        // Collect ARNs while building
        if (grantables.length > 0) {
            allTableArns.push(table.tableArn)
            allTableArns.push(`${table.tableArn}/index/*`)
        }

        return { table, tableDetails }
    })

    // Grant consolidated permissions
    if (grantables.length > 0 && tables.length > 0) {
        grantables.forEach(grantable => {
            // Add consolidated identity-based policy to the IAM role
            if (grantable instanceof Role) {
                grantable.addToPrincipalPolicy(
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        actions: [
                            'dynamodb:BatchGetItem',
                            'dynamodb:GetRecords',
                            'dynamodb:GetShardIterator',
                            'dynamodb:Query',
                            'dynamodb:GetItem',
                            'dynamodb:Scan',
                            'dynamodb:ConditionCheckItem',
                            'dynamodb:BatchWriteItem',
                            'dynamodb:PutItem',
                            'dynamodb:UpdateItem',
                            'dynamodb:DeleteItem',
                            'dynamodb:DescribeTable'
                        ],
                        resources: allTableArns
                    })
                )
            }

            // NOTE: Resource-based policy removed to fix circular dependency with CDK 2.235+
            // The identity-based policy (addToPrincipalPolicy above) is sufficient.
            // Adding a resource policy to tables[0] referencing ALL table ARNs creates
            // a self-referential dependency that CloudFormation detects as a cycle.

            // Handle stream policies individually (these are table-specific)
            tables.forEach(({ table, tableDetails }) => {
                if (tableDetails.stream) {
                    addToResourcePolicy({
                        table,
                        stream: tableDetails.stream,
                        grantable,
                        v2: options.v2
                    })
                }
            })
        })
    }

    return tables.map(({ table }) => table)
}

const fromPath = (scope: Construct, options: DynamodbTableCreatorPathOptions) => {
    const streams = options.streams || {}
    const allTableDetails = scan(options.entities)
    const grantables = options.grantFullAccess || []

    // Build all tables and collect ARNs in single pass
    const allTableArns: string[] = []
    const tables = allTableDetails.map((tableDetails: TableDetails) => {
        tableDetails.schema = options.schema || tableDetails.schema
        tableDetails.database = options.database || tableDetails.database
        tableDetails.tableName = buildTableName(tableDetails)
        tableDetails.stream = streams[tableDetails.tableName]
        tableDetails.pointInTimeRecovery = options.pointInTimeRecovery
        tableDetails.tags = options.tags
        tableDetails.removalPolicy = options.removalPolicy
        tableDetails.replicas = options.replicas
        tableDetails.v2 = options.v2
        const table = buildTable(scope, buildTableId(tableDetails.tableName, options.overrideTableIds), tableDetails, tableDetails.indexes)

        // Collect ARNs while building
        if (grantables.length > 0) {
            allTableArns.push(table.tableArn)
            allTableArns.push(`${table.tableArn}/index/*`)
        }

        return { table, tableDetails }
    })

    // Grant consolidated permissions
    if (grantables.length > 0 && tables.length > 0) {
        grantables.forEach(grantable => {
            // Add consolidated identity-based policy to the IAM role
            if (grantable instanceof Role) {
                grantable.addToPrincipalPolicy(
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        actions: [
                            'dynamodb:BatchGetItem',
                            'dynamodb:GetRecords',
                            'dynamodb:GetShardIterator',
                            'dynamodb:Query',
                            'dynamodb:GetItem',
                            'dynamodb:Scan',
                            'dynamodb:ConditionCheckItem',
                            'dynamodb:BatchWriteItem',
                            'dynamodb:PutItem',
                            'dynamodb:UpdateItem',
                            'dynamodb:DeleteItem',
                            'dynamodb:DescribeTable'
                        ],
                        resources: allTableArns
                    })
                )
            }

            // NOTE: Resource-based policy removed to fix circular dependency with CDK 2.235+
            // The identity-based policy (addToPrincipalPolicy above) is sufficient.
            // Adding a resource policy to tables[0] referencing ALL table ARNs creates
            // a self-referential dependency that CloudFormation detects as a cycle.

            // Handle stream policies individually (these are table-specific)
            tables.forEach(({ table, tableDetails }) => {
                if (tableDetails.stream) {
                    addToResourcePolicy({
                        table,
                        stream: tableDetails.stream,
                        grantable,
                        v2: options.v2
                    })
                }
            })
        })
    }

    return tables.map(({ table }) => table)
}

export const createTables = (scope: Construct, options: DynamodbTableCreatorPathOptions | DynamodbTableCreatorTypeOptions) => {
    if (typeof options.entities === 'string') {
        console.log('Building DynamoDB Tables from parsing files')
        return fromPath(scope, options as DynamodbTableCreatorPathOptions)
    }
    console.log('Building DynamoDB Tables from TypeORM Objects')
    return fromArray(scope, options as DynamodbTableCreatorTypeOptions)
}

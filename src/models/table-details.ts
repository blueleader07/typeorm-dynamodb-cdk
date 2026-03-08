import { Attribute, StreamViewType } from 'aws-cdk-lib/aws-dynamodb'
import { IndexDetails } from './index-details'
import { RemovalPolicy } from 'aws-cdk-lib'
import { ReplicaTableProps } from 'aws-cdk-lib/aws-dynamodb/lib/table-v2'

export class TableDetails {
    name: string
    schema?: string
    database?: string
    tableName?: string
    partitionKey: Attribute
    indexes: IndexDetails[]
    stream?: StreamViewType
    removalPolicy?: RemovalPolicy
    timeToLiveAttribute?: string
    pointInTimeRecovery?: boolean
    tags?: Record<string, string>
    replicas?: ReplicaTableProps[]
    v2?: boolean
}

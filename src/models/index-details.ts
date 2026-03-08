import { Attribute } from 'aws-cdk-lib/aws-dynamodb'

export class IndexDetails {
    indexName: string
    partitionKey: Attribute
    sortKey?: Attribute
}

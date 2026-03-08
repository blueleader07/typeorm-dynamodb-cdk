// Export main functionality
export { createTables, buildTable, buildTableName } from './dynamodb-table-creator'
export { DynamodbTableCreatorPathOptions, DynamodbTableCreatorTypeOptions, StreamViewTypes } from './dynamodb-table-creator'

// Export models
export { TableDetails } from './models/table-details'
export { IndexDetails } from './models/index-details'

// Export parsers
export { parseAnnotations, scan } from './parsers/annotation-parser'

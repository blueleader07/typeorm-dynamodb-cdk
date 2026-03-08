import { parseAnnotations, scan } from '../../src/parsers/annotation-parser'

describe('annotation-parser', () => {
    describe('parseAnnotations', () => {
        it('should parse Entity annotation', () => {
            const fileContents = `
                import { Entity, PrimaryColumn } from 'typeorm'
                
                @Entity({ name: 'user' })
                export class User {
                    @PrimaryColumn({ name: 'id', type: 'varchar' })
                    id: string
                }
            `
            
            const entities = parseAnnotations(fileContents, 'Entity')
            
            expect(entities).toHaveLength(1)
            expect(entities[0].name).toBe('user')
        })

        it('should parse PrimaryColumn annotation', () => {
            const fileContents = `
                import { Entity, PrimaryColumn } from 'typeorm'
                
                @Entity({ name: 'user' })
                export class User {
                    @PrimaryColumn({ name: 'id', type: 'varchar' })
                    id: string
                }
            `
            
            const primaryColumns = parseAnnotations(fileContents, 'PrimaryColumn')
            
            expect(primaryColumns).toHaveLength(1)
            expect(primaryColumns[0].name).toBe('id')
            expect(primaryColumns[0].type).toBe('S')
        })

        it('should parse Column annotation', () => {
            const fileContents = `
                import { Entity, Column } from 'typeorm'
                
                @Entity({ name: 'user' })
                export class User {
                    @Column({ name: 'email', type: 'varchar' })
                    email: string
                }
            `
            
            const columns = parseAnnotations(fileContents, 'Column')
            
            expect(columns).toHaveLength(1)
            expect(columns[0].name).toBe('email')
            expect(columns[0].type).toBe('S')
        })

        it('should parse GlobalSecondaryIndex annotation', () => {
            const fileContents = `
                import { Entity } from 'typeorm'
                
                @Entity({ name: 'user' })
                @GlobalSecondaryIndex({ name: 'emailIndex', partitionKey: 'email' })
                export class User {
                }
            `
            
            const indexes = parseAnnotations(fileContents, 'GlobalSecondaryIndex')
            
            expect(indexes).toHaveLength(1)
            expect(indexes[0].name).toBe('emailIndex')
            expect(indexes[0].partitionKey).toBe('email')
        })

        it('should handle multiple annotations', () => {
            const fileContents = `
                @Entity({ name: 'user' })
                @GlobalSecondaryIndex({ name: 'emailIndex', partitionKey: 'email' })
                @GlobalSecondaryIndex({ name: 'ageIndex', partitionKey: 'age' })
                export class User {}
            `
            
            const indexes = parseAnnotations(fileContents, 'GlobalSecondaryIndex')
            
            expect(indexes).toHaveLength(2)
            expect(indexes[0].name).toBe('emailIndex')
            expect(indexes[1].name).toBe('ageIndex')
        })

        it('should ignore commented annotations', () => {
            const fileContents = `
                // @Entity({ name: 'commented' })
                /* @Entity({ name: 'blockCommented' }) */
                @Entity({ name: 'actual' })
                export class User {}
            `
            
            const entities = parseAnnotations(fileContents, 'Entity')
            
            expect(entities).toHaveLength(1)
            expect(entities[0].name).toBe('actual')
        })

        it('should convert number types to N', () => {
            const fileContents = `
                @Entity({ name: 'user' })
                export class User {
                    @Column({ name: 'age', type: 'int' })
                    age: number
                }
            `
            
            const columns = parseAnnotations(fileContents, 'Column')
            
            expect(columns[0].type).toBe('N')
        })
    })

    describe('buildTableName', () => {
        it('should build table name from entity name only', () => {
            const { buildTableName } = require('../../src/dynamodb-table-creator')
            const result = buildTableName({ name: 'user', indexes: [] })
            expect(result).toBe('user')
        })

        it('should build table name with schema', () => {
            const { buildTableName } = require('../../src/dynamodb-table-creator')
            const result = buildTableName({ name: 'user', schema: 'prod', indexes: [] })
            expect(result).toBe('prod.user')
        })

        it('should build table name with database and schema', () => {
            const { buildTableName } = require('../../src/dynamodb-table-creator')
            const result = buildTableName({ 
                name: 'user', 
                schema: 'prod', 
                database: 'myapp',
                indexes: []
            })
            expect(result).toBe('myapp.prod.user')
        })
    })
})

import { TableDetails } from '../models/table-details'
import { lstatSync, readdirSync, readFileSync } from 'fs'

const toDynamoDbType = (type: string) => {
    if (type === 'N') {
        return 'N'
    }
    if (type === 'S') {
        return 'S'
    }
    return ['int', 'decimal'].includes(type) ? 'N' : 'S'
}

const removeSpaces = (text: string) => {
    let inside = 0
    const s = text.replace(/\n/g, '').replace(/\r/g, '')
     
    return s.replace(/ +|"/g, (m: string) => m === '"' ? (inside ^= 1, '"') : inside ? m : '')
}

/**
 * Remove all JavaScript/TypeScript comments from source code
 * Handles single-line (//), multi-line (/* *\/), and JSDoc (/** *\/) comments
 */
const removeComments = (text: string): string => {
    let result = ''
    let i = 0
    const len = text.length

    while (i < len) {
        // Check for single-line comment
        if (text[i] === '/' && text[i + 1] === '/') {
            // Skip until end of line
            while (i < len && text[i] !== '\n') {
                i++
            }
            // Keep the newline
            if (i < len) {
                result += text[i]
                i++
            }
            continue
        }

        // Check for multi-line comment (including JSDoc)
        if (text[i] === '/' && text[i + 1] === '*') {
            // Skip until */
            i += 2
            while (i < len - 1) {
                if (text[i] === '*' && text[i + 1] === '/') {
                    i += 2
                    break
                }
                // Preserve newlines to maintain line numbers for error reporting
                if (text[i] === '\n') {
                    result += '\n'
                }
                i++
            }
            continue
        }

        // Check for string literals (single quotes)
        if (text[i] === "'") {
            result += text[i]
            i++
            while (i < len) {
                if (text[i] === '\\' && i + 1 < len) {
                    // Escape sequence
                    result += text[i] + text[i + 1]
                    i += 2
                } else if (text[i] === "'") {
                    result += text[i]
                    i++
                    break
                } else {
                    result += text[i]
                    i++
                }
            }
            continue
        }

        // Check for string literals (double quotes)
        if (text[i] === '"') {
            result += text[i]
            i++
            while (i < len) {
                if (text[i] === '\\' && i + 1 < len) {
                    // Escape sequence
                    result += text[i] + text[i + 1]
                    i += 2
                } else if (text[i] === '"') {
                    result += text[i]
                    i++
                    break
                } else {
                    result += text[i]
                    i++
                }
            }
            continue
        }

        // Check for template literals (backticks)
        if (text[i] === '`') {
            result += text[i]
            i++
            while (i < len) {
                if (text[i] === '\\' && i + 1 < len) {
                    // Escape sequence
                    result += text[i] + text[i + 1]
                    i += 2
                } else if (text[i] === '`') {
                    result += text[i]
                    i++
                    break
                } else {
                    result += text[i]
                    i++
                }
            }
            continue
        }

        // Regular character
        result += text[i]
        i++
    }

    return result
}

const parseNextProperty = (contents: string) => {
    const regex = /\w+:(string|number)+/g
    const match = contents.match(regex)
    const first = match && match.length > 0 ? match[0] : undefined
    if (first) {
        const nameType = first.split(':')
        const name = nameType[0].trim()
        const type = nameType[1].trim() || 'S'
        return {
            name,
            type
        }
    }
    return undefined
}

const parseAttributes = (rawAnnotation: string) => {
    const result: any[] = []
    let item = ''
    let depth = 0

    const push = () => {
        if (item) {
            result.push(item)
        }
        item = ''
    }

     
    for (let i = 0, c; c = rawAnnotation[i], i < rawAnnotation.length; i++) {
        if (!depth && c === ',') push()
        else {
            item += c
            if (c === '[') depth++
            if (c === ']') depth--
        }
    }

    push()
    return result
}

const parseAnnotation = (rawAnnotation: string) => {
    if (rawAnnotation && rawAnnotation.length > 2) {
        // const attributes = rawAnnotation.substring(1, rawAnnotation.length - 1).split(',')
        const attributes = parseAttributes(rawAnnotation)
        const annotation: any = {}
        attributes.forEach(attribute => {
            const nameValue = attribute.split(':')
            const name = nameValue[0]
            const value = nameValue[1]
            if (value.startsWith("'") || value.startsWith('"')) {
                annotation[name] = value.replace(/['"]+/g, '')
            }
            if (value.startsWith('[')) {
                annotation[name] = JSON.parse(value.replace(/'/g, '"'))
            }
        })
        return annotation
    }
    return undefined
}

export const parseAnnotations = (file: string, ...names: string[]) => {
    const pipeSeparatedNames = names.length > 1 ? `${names.join('|')}` : names[0]
    const regex = new RegExp(`@${pipeSeparatedNames}\\({(.*?)}\\)`, 'g')
    // Remove comments before parsing to avoid matching commented-out annotations
    const fileWithoutComments = removeComments(file)
    const fileWithoutSpaces = removeSpaces(fileWithoutComments)
    const matches = fileWithoutSpaces.matchAll(regex)
    return Array.from(matches, (x: any) => {
        const isColumnAnnotation = x[0].startsWith('@Column') || x[0].startsWith('@PrimaryColumn')
        const rawAnnotation = x[1]
        const annotation = parseAnnotation(rawAnnotation)
        if (isColumnAnnotation) {
            const haystack = x.input.substring(x.index + x[0].length)
            const property: any = parseNextProperty(haystack)
            annotation.name = annotation.name || property.name || ''
            annotation.type = toDynamoDbType(annotation.type || property.type || '')
        }
        return annotation
    })
}

export const scan = (path: string) => {
    const files = readdirSync(path)
    const tables = []
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const pathAndFile = `${path}/${file}`
        const stat = lstatSync(pathAndFile)
        if (stat.isFile()) {
            const contents = readFileSync(pathAndFile).toString('utf-8')
            if (contents.indexOf('@Entity') >= 0) {
                const tableDetails = parseTableDetails(contents)
                if (tableDetails) {
                    tables.push(tableDetails)
                }
            }
        }
    }
    return tables
}

const parseTableDetails = (contents: string): TableDetails | undefined => {
    const entities = parseAnnotations(contents, 'Entity')
    const globalSecondaryIndexes = parseAnnotations(contents, 'GlobalSecondaryIndex')
    const primaryColumns = parseAnnotations(contents, 'PrimaryColumn')
    const columns = parseAnnotations(contents, 'Column')
    const columnTypes = new Map()
    columns.concat(primaryColumns).forEach(column => {
        columnTypes.set(column.name, toDynamoDbType(column.type))
    })

    if (entities.length === 0) {
        console.warn('@Entity annotation not found.')
        return
    }
    if (primaryColumns.length === 0) {
        console.warn('@PrimaryColumn annotation not found.')
        return
    }
    const indexes = globalSecondaryIndexes.map((globalSecondaryIndex: any) => {
        const partitionKeys = Array.isArray(globalSecondaryIndex.partitionKey) ? globalSecondaryIndex.partitionKey : [globalSecondaryIndex.partitionKey]
        const firstPartitionKeyColumn = partitionKeys[0]
        const partitionKey = {
            name: partitionKeys.join('#'),
            type: partitionKeys.length === 1 ? columnTypes.get(firstPartitionKeyColumn) : 'S'
        }
        let sortKey
        if (globalSecondaryIndex.sortKey) {
            const sortKeys = Array.isArray(globalSecondaryIndex.sortKey) ? globalSecondaryIndex.sortKey : [globalSecondaryIndex.sortKey]
            const firstSortKeyColumn = sortKeys[0]
            sortKey = {
                name: sortKeys.join('#'),
                type: sortKeys.length === 1 ? columnTypes.get(firstSortKeyColumn) || 'S' : 'S'
            }
        }
        return {
            indexName: globalSecondaryIndex.name,
            partitionKey,
            sortKey
        }
    })
    return {
        name: entities[0].name,
        schema: entities[0].schema,
        database: entities[0].database,
        partitionKey: {
            name: primaryColumns[0].name,
            type: primaryColumns[0].type
        },
        indexes
    }
}

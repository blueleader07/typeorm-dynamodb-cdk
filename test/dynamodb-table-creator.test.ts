import { App, Stack } from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { StreamViewType } from 'aws-cdk-lib/aws-dynamodb'
import { createTables } from '../src/dynamodb-table-creator'

describe('createTables stream resource policy', () => {
    const streamKey = 'test.testuser'

    const buildStack = (v2: boolean): Stack => {
        const app = new App()
        const stack = new Stack(app, 'TestStack', { env: { account: '111111111111', region: 'us-east-1' } })
        const roleA = new Role(stack, 'RoleA', { assumedBy: new ServicePrincipal('lambda.amazonaws.com') })
        const roleB = new Role(stack, 'RoleB', { assumedBy: new ServicePrincipal('lambda.amazonaws.com') })
        createTables(stack, {
            entities: 'test/entities',
            database: 'test',
            streams: { [streamKey]: StreamViewType.NEW_AND_OLD_IMAGES },
            grantFullAccess: [roleA, roleB],
            v2
        })
        return stack
    }

    const streamPrincipalArns = (stack: Stack, v2: boolean): any => {
        const template = Template.fromStack(stack)
        const type = v2 ? 'AWS::DynamoDB::GlobalTable' : 'AWS::DynamoDB::Table'
        const table: any = Object.values(template.findResources(type))[0]
        const policyDocument = v2
            ? table.Properties.Replicas[0].ReplicaStreamSpecification.ResourcePolicy.PolicyDocument
            : table.Properties.StreamSpecification.ResourcePolicy.PolicyDocument
        return policyDocument.Statement[0].Condition.StringEquals['aws:PrincipalArn']
    }

    it('grants EVERY grantable on the stream resource policy (v2)', () => {
        const principalArns = streamPrincipalArns(buildStack(true), true)
        expect(Array.isArray(principalArns)).toBe(true)
        expect(principalArns).toHaveLength(2)
    })

    it('grants EVERY grantable on the stream resource policy (non-v2)', () => {
        const principalArns = streamPrincipalArns(buildStack(false), false)
        expect(Array.isArray(principalArns)).toBe(true)
        expect(principalArns).toHaveLength(2)
    })
})

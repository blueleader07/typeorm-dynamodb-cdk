import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity({ name: 'testuser' })
export class TestUser {
    @PrimaryColumn({ name: 'id', type: 'varchar' })
    id: string

    @Column({ name: 'email', type: 'varchar' })
    email: string

    @Column({ name: 'name', type: 'varchar' })
    name: string
}

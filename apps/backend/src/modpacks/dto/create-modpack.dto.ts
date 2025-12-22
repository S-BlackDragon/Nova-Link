export class CreateModpackDto {
    name: string;
    description?: string;
    authorId: string; // TODO: Extract from JWT
}

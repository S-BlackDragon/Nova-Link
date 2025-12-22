export class PublishVersionDto {
    versionNumber: string;
    gameVersion: string;
    loaderType: string;
    loaderVersion: string;
    manifestUrl?: string;
    parentVersionId?: string;
}

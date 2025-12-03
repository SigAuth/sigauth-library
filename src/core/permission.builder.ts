export class PermissionBuilder {
    private assetId?: number;
    private appId: number;
    private ident: string;
    private containerId?: number;

    constructor(ident: string, appId: number, containerId?: number, assetId?: number) {
        this.ident = ident;
        this.appId = appId;
        this.containerId = containerId;
        this.assetId = assetId;
    }

    withAssetId(assetId: number): this {
        this.assetId = assetId;
        return this;
    }

    withAppId(appId: number): this {
        this.appId = appId;
        return this;
    }

    withContainerId(containerId: number): this {
        this.containerId = containerId;
        return this;
    }

    build(): string {
        if (this.assetId && !this.containerId) {
            throw new Error('ContainerId must be set if AssetId is set');
        }
        return `${this.ident}:${this.assetId ?? ''}:${this.appId}:${this.containerId ?? ''}`;
    }
}

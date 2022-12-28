export class ResourceEvent extends CustomEvent {
    constructor(type, resourceUri, init) {
        super(type, Object.assign(init || {bubbles: true}, {detail: Object.assign(init?.detail || {}, {resourceUri})}))
    }

    /**
     *
     * @return {ResourceUri}
     */
    get resourceUri() {
        return this.detail.resourceUri
    }
}

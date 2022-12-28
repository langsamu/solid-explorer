import {ResourceEvent} from "./ResourceEvent.js"

export class ResourceUriString extends ResourceEvent {
    static TYPE = "resourceUriString"

    constructor(resourceUri, init) {
        super(ResourceUriString.TYPE, resourceUri, init)
    }
}
